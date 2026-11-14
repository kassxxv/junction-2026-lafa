import { z } from "zod";
import { draftCard } from "@/lib/card/draft-service";

const Body = z.object({
  companyName: z.string().trim().min(1).max(200),
  text: z.string().trim().min(1).max(20_000),
});

/**
 * POST /api/cards/draft — { companyName, text } → { source, reason?, draft }.
 * `source: "stub"` means Gemini was unavailable and the draft is sample data.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Send companyName and text (up to 20 000 characters)." }, { status: 400 });
  }

  const result = await draftCard(parsed.data);
  return Response.json(
    result.source === "live"
      ? { source: "live", draft: result.data }
      : { source: "stub", reason: result.reason, draft: result.data },
    { headers: { "Cache-Control": "no-store" } },
  );
}
