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
  expectedCpt: string[];
  expectedIcd: string[];
};

const CASES: TestCase[] = [
  {
    label: "1. Mental Health — Alcohol dependency (ETOH)",
    clinicalNote: `
32-year-old ETOH dependent female is in a partial hospitalization program and has been seeing
an addictive disease specialist (psychotherapist) in a chemical dependency program. Her employer is
aware of her problem. She was referred to the group through their Employee Assistance Program.
As long as she is in compliance, they will support her efforts. Recently, she has arrived late at
the meetings. The physician met with the patient and discussed the importance of her treatment,
compliance with the program and avoidance of situations in which she may use alcohol. She denies
contacts with her previous associates and assures the physician she has had no alcohol intake since
beginning the substance abuse treatment program. They will continue to reinforce her progress and
successful sobriety. Time of the session was 45 minutes.
    `.trim(),
    expectedCpt: ["90834"],
    expectedIcd: ["F10.20"],
  },
  {
    label: "2. Speech Therapy — Expressive language disorder",
    clinicalNote: `
A patient with expressive language disorder receives speech therapy for 30 minutes.
Assessment: Expressive language disorder. Patient demonstrates difficulty formulating sentences
and retrieving words. Language comprehension is intact.
Plan: Speech-language therapy session completed, 30 minutes. Focus on expressive language,
word retrieval strategies, and sentence formulation.
    `.trim(),
    expectedCpt: ["92507"],
    expectedIcd: ["F80.1"],
  },
  {
    label: "3. Mental Health — Major depressive disorder, mild (45 min psychotherapy)",
    clinicalNote: `
A patient diagnosed with major depressive disorder, single episode, mild receives 45 minutes
of individual psychotherapy. Assessment: Major depressive disorder, single episode, mild severity.
Patient reports low mood, decreased interest in activities, and fatigue but is functional at work.
PHQ-9 score 8.
Plan: Individual psychotherapy session, 45 minutes. Cognitive behavioral therapy techniques
applied. Discussed thought patterns and behavioral activation strategies.
    `.trim(),
    expectedCpt: ["90834"],
    expectedIcd: ["F32.0"],
  },
  {
    label: "4. Physical Therapy — Low back pain, therapeutic exercises",
    clinicalNote: `
A patient with low back pain undergoes therapeutic exercises for 20 minutes.
Assessment: Low back pain, unspecified. Lumbar muscle weakness and decreased flexibility noted.
Plan: Therapeutic exercises performed for 20 minutes focusing on core stabilization, lumbar
strengthening, and flexibility. Patient tolerated exercises well.
    `.trim(),
    expectedCpt: ["97110"],
    expectedIcd: ["M54.50"],
  },
  {
    label: "5. Speech Therapy — Dysphagia, swallowing treatment",
    clinicalNote: `
A patient with dysphagia receives swallowing treatment therapy for 30 minutes.
Assessment: Dysphagia, unspecified. Patient demonstrates impaired swallowing with risk of
aspiration on thin liquids. Oral and pharyngeal phase dysfunction noted.
Plan: Swallowing treatment therapy session completed, 30 minutes. Swallowing exercises,
compensatory strategies, and diet texture recommendations provided.
    `.trim(),
    expectedCpt: ["92526"],
    expectedIcd: ["R13.10"],
  },
];

const checkCode = (got: string[], expected: string[]) =>
  expected.every((e) =>
    got.some((g) => {
      const eu = e.toUpperCase();
      const gu = g.toUpperCase();
      return eu === gu || gu.startsWith(eu) || eu.startsWith(gu);
    }),
  );

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const matcher = getCodeMatcher();
  let passed = 0;

  console.log("\n==============================");
  console.log("  CPT Code Accuracy — 5 Cases");
  console.log("  Model:", process.env.OLLAMA_MODEL || process.env.OLLAMA_CODES_MODEL || process.env.GROQ_MODEL);
  console.log("==============================\n");

  for (const tc of CASES) {
    console.log(`▶ ${tc.label}`);
    try {
      const result = await matcher.match({ soapNote: tc.clinicalNote });
      const gotCpt = result.cptMatches.map((m) => m.code);
      const gotIcd = result.icdMatches.map((m) => m.code);

      const cptOk = checkCode(gotCpt, tc.expectedCpt);
      const icdOk = checkCode(gotIcd, tc.expectedIcd);
      const pass = cptOk && icdOk;
      if (pass) passed++;

      console.log(`  CPT expected : ${tc.expectedCpt.join(", ")}`);
      console.log(`  CPT returned : ${gotCpt.join(", ") || "(none)"} ${cptOk ? "✅" : "❌"}`);
      console.log(`  ICD expected : ${tc.expectedIcd.join(", ")}`);
      console.log(`  ICD returned : ${gotIcd.join(", ") || "(none)"} ${icdOk ? "✅" : "❌"}`);
      console.log(`  Result: ${pass ? "✅ PASS" : "❌ FAIL"}\n`);
    } catch (err) {
      console.log(`  💥 ERROR: ${err}\n`);
    }
    await delay(2000);
  }

  console.log("==============================");
  console.log(`  Score: ${passed}/${CASES.length} (${Math.round((passed / CASES.length) * 100)}%)`);
  console.log("==============================\n");
}

run().catch((e) => { console.error(e); process.exit(1); });
