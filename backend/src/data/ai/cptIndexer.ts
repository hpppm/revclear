import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import { getCuratedCptCodes } from "./cptDataLoader";
import logger from "../../utils/logger";

const EMBEDDING_MODEL = "text-embedding-3-small";
const UPSERT_BATCH_SIZE = 100;

// Module-level guard — only index once per process lifetime.
let indexingDone = false;

type CptVector = {
  id: string;
  values: number[];
  metadata: { code: string; description: string; specialty: string };
};

/**
 * Idempotent startup task. Upserts all CPT codes from cpt_curated.json into
 * Pinecone using OpenAI text-embedding-3-small embeddings.
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
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!pineconeKey || !indexName || !openaiKey) {
    logger.warn("PINECONE_API_KEY, PINECONE_INDEX_NAME, or OPENAI_API_KEY not set — CPT indexing skipped");
    return;
  }

  try {
    const pc = new Pinecone({ apiKey: pineconeKey });
    const index = pc.index(indexName);
    const openai = new OpenAI({ apiKey: openaiKey });

    // Build flat list preserving specialty from the JSON key.
    const data = getCuratedCptCodes();
    const allCodes: Array<{ code: string; description: string; specialty: string }> = [];
    const seen = new Set<string>();
    for (const [specialty, codes] of Object.entries(data)) {
      for (const entry of codes) {
        if (seen.has(entry.code)) continue;
        seen.add(entry.code);
        allCodes.push({
          code: entry.code,
          description: entry.short_description,
          specialty,
        });
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

      // Embed only code + description — no billing rules or prose notes.
      const inputs = batch.map((c) => `${c.code} ${c.description}`);
      const embeddingRes = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: inputs,
        encoding_format: "float",
      });

      const vectors: CptVector[] = batch.map((c, j) => ({
        id: c.code,
        values: embeddingRes.data[j].embedding,
        metadata: { code: c.code, description: c.description, specialty: c.specialty },
      }));

      await index.upsert({ records: vectors });
      logger.debug({ batchStart: i, batchEnd: i + batch.length }, "CPT batch upserted");
    }

    indexingDone = true;
    logger.info({ count: allCodes.length }, "CPT index ready");
  } catch (error) {
    logger.error({ error }, "CPT indexing failed — getRelevantCptCodes will use full dump fallback");
  }
};
