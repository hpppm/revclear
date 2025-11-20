import { z } from "genkit";
import { ai } from "../config";

export const serverTimeTool = ai.defineTool(
  {
    name: "serverTime",
    description: "Returns the current server time and offset in minutes from UTC.",
    inputSchema: z
      .object({
        timezoneOffsetMinutes: z
          .number()
          .optional()
          .describe("Optional client offset to compare against server time."),
      })
      .optional(),
    outputSchema: z.object({
      isoTime: z.string(),
      timezoneOffsetMinutes: z.number(),
    }),
  },
  async (input) => {
    const now = new Date();
    const serverOffsetMinutes = -now.getTimezoneOffset();
    return {
      isoTime: now.toISOString(),
      timezoneOffsetMinutes:
        input?.timezoneOffsetMinutes ?? serverOffsetMinutes,
    };
  }
);
