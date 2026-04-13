import { Pinecone } from "@pinecone-database/pinecone";
import { getCuratedCptCodes } from "./cptDataLoader";
import logger from "../../utils/logger";

const UPSERT_BATCH_SIZE = 96; // Pinecone integrated embedding max batch is 96

// Module-level guard — only index once per process lifetime.
let indexingDone = false;

/**
 * Idempotent startup task. Upserts all CPT codes from cpt_curated.json into
 * a Pinecone index with integrated embedding (no OpenAI key required — Pinecone
 * embeds the text field internally using the model configured on the index).
 *
 * Each record shape: { id, text, code, description, specialty }
 * Pinecone embeds `text` automatically; the rest is stored as metadata.
 *
 * Skips upsert if the index already contains at least as many records as the
 * local curated set — safe to call on every server start.
 *
 * Never throws: failures are logged and the caller falls back to the full
 * CPT dump.
 */
export const ensureCptIndexed = async (): Promise<void> => {
  if (indexingDone) return;

  const pineconeKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!pineconeKey || !indexName) {
    logger.warn("PINECONE_API_KEY or PINECONE_INDEX_NAME not set — CPT indexing skipped");
    return;
  }

  try {
    const pc = new Pinecone({ apiKey: pineconeKey });
    const index = pc.index(indexName);

    // Build flat list preserving specialty from the JSON key.
    const data = getCuratedCptCodes();
    const allCodes: Array<{ code: string; description: string; specialty: string }> = [];
    const seen = new Set<string>();
    for (const [specialty, codes] of Object.entries(data)) {
      for (const entry of codes) {
        if (seen.has(entry.code)) continue;
        seen.add(entry.code);
        allCodes.push({ code: entry.code, description: entry.short_description, specialty });
      }
    }

    // Idempotency check — skip if index already has enough records.
    const stats = await index.describeIndexStats();
    const totalRecords = stats.totalRecordCount ?? 0;
    if (totalRecords >= allCodes.length) {
      logger.info(
        { totalRecords, localCount: allCodes.length },
        "CPT index already populated — skipping upsert",
      );
      indexingDone = true;
      return;
    }

    logger.info({ count: allCodes.length }, "Upserting CPT codes into Pinecone");

    for (let i = 0; i < allCodes.length; i += UPSERT_BATCH_SIZE) {
      const batch = allCodes.slice(i, i + UPSERT_BATCH_SIZE);

      // `text` is the field Pinecone embeds. Only code + description — no billing
      // rules or prose. Metadata fields are stored alongside for retrieval.
      await index.upsertRecords({
        records: batch.map((c) => ({
          id: c.code,
          text: `${c.code} ${c.description}`,
          code: c.code,
          description: c.description,
          specialty: c.specialty,
        })),
      });

      logger.debug({ batchStart: i, batchEnd: i + batch.length }, "CPT batch upserted");
    }

    indexingDone = true;
    logger.info({ count: allCodes.length }, "CPT index ready");
  } catch (error) {
    logger.error({ error }, "CPT indexing failed — getRelevantCptCodes will use full dump fallback");
  }
};
