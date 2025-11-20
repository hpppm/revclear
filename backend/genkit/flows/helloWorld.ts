import { z } from "genkit";
import { ai } from "../config";
import { serverTimeTool } from "../tools/serverTime";

const GreetingSchema = z.object({
  message: z.string(),
});

const HelloInputSchema = z.object({
  name: z.string().min(1).describe("Who should be greeted."),
  mood: z
    .string()
    .optional()
    .describe("Optional vibe or tone for the greeting."),
});

const HelloOutputSchema = z.object({
  message: z.string(),
  serverTime: z.object({
    isoTime: z.string(),
    timezoneOffsetMinutes: z.number(),
  }),
});

export const helloWorldFlow = ai.defineFlow(
  {
    name: "helloWorld",
    inputSchema: HelloInputSchema,
    outputSchema: HelloOutputSchema,
  },
  async (input) => {
    // Provide an explicit empty object so tool input validation passes.
    const serverTime = await serverTimeTool({});
    const prompt = [
      `You are a friendly backend API greeter.`,
      `Greet ${input.name} in one concise sentence.`,
      input.mood ? `Honor this mood or style: ${input.mood}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const { output } = await ai.generate({
      prompt,
      output: { schema: GreetingSchema },
    });

    return {
      message: output?.message ?? `Hello, ${input.name}!`,
      serverTime,
    };
  }
);
