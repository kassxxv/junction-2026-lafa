import "server-only";
import { z } from "zod";

/** JSON Schema for a zod schema, in the shape both Gemini and OpenAI-compatible APIs accept. */
export function jsonSchemaOf(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = { ...(z.toJSONSchema(schema) as Record<string, unknown>) };
  delete jsonSchema.$schema; // some providers reject the meta-schema key
  return jsonSchema;
}

/** Parses model output and validates it. Throws (ZodError / SyntaxError) on invalid output. */
export function parseModelJson<T>(schema: z.ZodType<T>, text: string | null | undefined): T {
  if (!text) throw new SyntaxError("empty model response");
  // Some models wrap JSON in ```json fences even in JSON mode.
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return schema.parse(JSON.parse(cleaned));
}

/**
 * Calls `attempt` up to `tries` times, retrying only when the output was invalid
 * (bad JSON / failed validation). Network and auth errors are thrown immediately.
 */
export async function retryOnInvalid<T>(tries: number, attempt: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await attempt();
    } catch (err) {
      const invalid = err instanceof Error && (err.name === "ZodError" || err.name === "SyntaxError");
      if (!invalid) throw err;
      lastError = err;
    }
  }
  throw lastError;
}
