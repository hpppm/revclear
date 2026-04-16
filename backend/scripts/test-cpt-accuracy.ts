/**
 * CPT Code Accuracy — 5 clinical test cases
 * Branch: fix/claim-validation-ux-and-charges
 *
 * Sends clinical descriptions directly to the code matcher (no SOAP step needed —
 * the descriptions already contain full clinical context).
 *
 * Run: OLLAMA_MODEL=qwen2.5:3b npx tsx scripts/test-cpt-accuracy.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { getCodeMatcher } from "../src/services/ai/providers/codeMatcher";

type TestCase = {
  label: string;
  clinicalNote: string;
  expectedCpt: string;
  expectedIcd: string;
};

const CASES: TestCase[] = [
  {
    label: "1. PT (Knee)",
    clinicalNote:
      "I twisted my right knee hiking and now it feels unstable and sharp when I try to straighten it.",
    expectedCpt: "97116",
    expectedIcd: "M23.51",
  },
  {
    label: "2. PT (Back)",
    clinicalNote:
      "My lower back feels stiff and dull every morning, making it hard to bend over and tie my shoes.",
    expectedCpt: "97110",
    expectedIcd: "M54.50",
  },
  {
    label: "3. Mental Health (Anxiety)",
    clinicalNote:
      "I had a panic attack at the store where my chest got tight and my hands wouldn't stop shaking.",
    expectedCpt: "90837",
    expectedIcd: "F41.1",
  },
  {
    label: "4. Mental Health (Depression)",
    clinicalNote:
      "I've felt a bit better this week and finally called my brother, though work is still a major stressor.",
    expectedCpt: "90834",
    expectedIcd: "F33.1",
  },
  {
    label: "5. Speech (Expressive)",
    clinicalNote:
      "My three-year-old only uses single words and points to things instead of speaking in full sentences.",
    expectedCpt: "92523",
    expectedIcd: "F80.1",
  },
];

const normalize = (code: string | undefined) => (code || "").trim().toUpperCase();

const exactTopMatch = (got: string | undefined, expected: string) =>
  normalize(got) === normalize(expected);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseDelayMs = () => {
  const raw = process.env.CPT_TEST_DELAY_MS;
  if (!raw) return 6500;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 6500;
};

async function run() {
  const matcher = getCodeMatcher();
  let passed = 0;
  let errors = 0;
  const delayMs = parseDelayMs();

  console.log("\n==============================");
  console.log("  CPT Code Accuracy — 5 Cases");
  console.log("  Model:", process.env.OLLAMA_MODEL || process.env.OLLAMA_CODES_MODEL || process.env.GROQ_MODEL);
  console.log("  Delay:", `${delayMs}ms between cases`);
  console.log("==============================\n");

  for (const tc of CASES) {
    console.log(`▶ ${tc.label}`);
    try {
      const result = await matcher.match({ soapNote: tc.clinicalNote });
      const gotCpt = result.cptMatches.map((m) => m.code);
      const gotIcd = result.icdMatches.map((m) => m.code);
      const topCpt = gotCpt[0];
      const topIcd = gotIcd[0];

      const cptOk = exactTopMatch(topCpt, tc.expectedCpt);
      const icdOk = exactTopMatch(topIcd, tc.expectedIcd);
      const pass = cptOk && icdOk;
      if (pass) passed++;

      console.log(`  CPT expected : ${tc.expectedCpt}`);
      console.log(`  CPT returned : ${gotCpt.join(", ") || "(none)"} ${cptOk ? "✅" : "❌"}`);
      console.log(`  ICD expected : ${tc.expectedIcd}`);
      console.log(`  ICD returned : ${gotIcd.join(", ") || "(none)"} ${icdOk ? "✅" : "❌"}`);
      if (!cptOk || !icdOk) {
        console.log(`  Top-1 returned: CPT=${topCpt || "(none)"}, ICD=${topIcd || "(none)"}`);
      }
      console.log(`  Result: ${pass ? "✅ PASS" : "❌ FAIL"}\n`);
    } catch (err) {
      errors++;
      console.log(`  💥 ERROR: ${err}\n`);
    }
    await delay(delayMs);
  }

  console.log("==============================");
  console.log(`  Score: ${passed}/${CASES.length} (${Math.round((passed / CASES.length) * 100)}%)`);
  if (errors > 0) {
    console.log(`  Runtime Errors: ${errors}`);
  }
  console.log("==============================\n");

  if (passed !== CASES.length || errors > 0) {
    process.exitCode = 1;
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
