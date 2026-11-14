import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";
import { jsonSchemaOf, parseModelJson, retryOnInvalid } from "./ai";
import { env } from "./env";
import { classifyError, logFailure, runProbe, stubsForced, type ServiceHealth, type Sourced } from "./service";

/**
 * Gemini — COMPANY DATA ONLY (card drafting, glossary for event organisers).
 * Never pass candidate text to this module; candidate data goes to lib/gemma.ts.
 */

const CALL_TIMEOUT_MS = 60_000;

let client: GoogleGenAI | undefined;

function getClient(apiKey: string): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export interface GenerateJsonOptions<T> {
  schema: z.ZodType<T>;
  prompt: string;
  system?: string;
  /** Synthetic, clearly-sample output used when Gemini is unavailable. */
  stub: T;
  temperature?: number;
}

/**
 * Asks Gemini for JSON matching `schema`. Invalid output is retried once;
 * any remaining failure returns the stub with `source: "stub"` and a reason code.
 */
export async function generateJSON<T>({ schema, prompt, system, stub, temperature = 0.3 }: GenerateJsonOptions<T>): Promise<Sourced<T>> {
  const { GEMINI_API_KEY, GEMINI_MODEL } = env();
  if (stubsForced() || !GEMINI_API_KEY || !GEMINI_MODEL) return { source: "stub", data: stub, reason: "not_configured" };

  try {
    const data = await retryOnInvalid(2, async () => {
      const res = await getClient(GEMINI_API_KEY).models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: system,
          temperature,
          responseMimeType: "application/json",
          responseJsonSchema: jsonSchemaOf(schema),
          abortSignal: AbortSignal.timeout(CALL_TIMEOUT_MS),
        },
      });
      return parseModelJson(schema, res.text);
    });
    return { source: "live", data };
  } catch (err) {
    const reason = classifyError(err);
    logFailure("gemini", "generateJSON", reason);
    return { source: "stub", data: stub, reason };
  }
}

/** Reads model metadata (free, no tokens). Without GEMINI_MODEL it only verifies the key. */
export async function health(): Promise<ServiceHealth> {
  const { GEMINI_API_KEY, GEMINI_MODEL } = env();
  if (!GEMINI_API_KEY) return { status: "not_configured", mode: "stub", error: "not_configured" };
  const mode = stubsForced() || !GEMINI_MODEL ? "stub" : "live";

  return runProbe("gemini", mode, async (signal) => {
    const ai = getClient(GEMINI_API_KEY);
    if (!GEMINI_MODEL) {
      await ai.models.list({ config: { pageSize: 1, abortSignal: signal } });
      return { status: "degraded", error: "not_configured", details: { modelConfigured: false } };
    }
    await ai.models.get({ model: GEMINI_MODEL, config: { abortSignal: signal } });
    return { status: "ok", details: { modelConfigured: true } };
  });
}
