import dotenv from "dotenv";
import path from "path";
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { logger as genkitLogger } from "genkit/logging";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
  console.warn(
    "Genkit: Missing Google AI key. Set GEMINI_API_KEY or GOOGLE_API_KEY in backend/.env"
  );
}

// Silence the noisy reflection port warning if a lower port is already taken.
const defaultLogger = (genkitLogger as any).defaultLogger;
genkitLogger.init({
  ...defaultLogger,
  warn: (...args: any[]) => {
    const first = args[0];
    if (
      typeof first === "string" &&
      first.includes("Port 3100 is already in use")
    ) {
      return;
    }
    defaultLogger.warn.apply(defaultLogger, args);
  },
});

export const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model("gemini-2.5-flash"),
});
