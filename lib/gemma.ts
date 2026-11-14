import "server-only";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { z } from "zod";
import { jsonSchemaOf, parseModelJson, retryOnInvalid } from "./ai";
import { env } from "./env";
import { classifyError, logFailure, runProbe, stubsForced, type ServiceHealth, type Sourced } from "./service";

/**
 * Gemma (self-hosted on Verda, EU) via its OpenAI-compatible API.
 *
 * This is the ONLY service that may receive candidate data.
 * On failure it falls back to the caller's stub — never to Gemini or any other external API.
 */

const CALL_TIMEOUT_MS = 90_000;

let client: OpenAI | undefined;

function config(): { baseURL: string; model: string; apiKey: string } | null {
  const { GEMMA_BASE_URL, GEMMA_MODEL, GEMMA_API_KEY } = env();
  if (!GEMMA_BASE_URL || !GEMMA_MODEL) return null;
  // Ollama ignores the key; a proxy in front of it may require a real one.
  return { baseURL: GEMMA_BASE_URL, model: GEMMA_MODEL, apiKey: GEMMA_API_KEY ?? "ollama" };
}

function getClient(cfg: { baseURL: string; apiKey: string }): OpenAI {
  client ??= new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey, timeout: CALL_TIMEOUT_MS, maxRetries: 1 });
  return client;
}

export interface ChatJsonOptions<T> {
  schema: z.ZodType<T>;
  messages: ChatCompletionMessageParam[];
  /** Synthetic, clearly-sample output used when Gemma is unavailable. */
  stub: T;
  temperature?: number;
}

/**
 * Asks Gemma for JSON matching `schema`. Invalid output is retried once;
 * any remaining failure returns the stub with `source: "stub"` and a reason code.
 */
export async function chatJSON<T>({ schema, messages, stub, temperature = 0.2 }: ChatJsonOptions<T>): Promise<Sourced<T>> {
  const cfg = config();
  if (stubsForced() || !cfg) return { source: "stub", data: stub, reason: "not_configured" };

  try {
    const data = await retryOnInvalid(2, async () => {
      const res = await getClient(cfg).chat.completions.create({
        model: cfg.model,
        messages,
        temperature,
        response_format: {
          type: "json_schema",
          json_schema: { name: "response", schema: jsonSchemaOf(schema), strict: true },
        },
      });
      return parseModelJson(schema, res.choices[0]?.message?.content);
    });
    return { source: "live", data };
  } catch (err) {
    const reason = classifyError(err);
    logFailure("gemma", "chatJSON", reason);
    return { source: "stub", data: stub, reason };
  }
}

/** Lists models (no generation, no data sent) and checks GEMMA_MODEL is available. */
export async function health(): Promise<ServiceHealth> {
  const cfg = config();
  if (!cfg) return { status: "not_configured", mode: "stub", error: "not_configured" };

  return runProbe("gemma", stubsForced() ? "stub" : "live", async (signal) => {
    const page = await getClient(cfg).models.list({ signal });
    const modelAvailable = page.data.some((m) => m.id === cfg.model);
    return modelAvailable
      ? { status: "ok", details: { modelAvailable } }
      : { status: "degraded", error: "model_missing", details: { modelAvailable } };
  });
}
