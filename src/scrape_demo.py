"""Local demo: python -m src.scrape_demo <url> [--markdown] [--html] [--json-schema FILE] ...

Hits the live Context.dev API (consumes credits).
"""

from __future__ import annotations

import argparse
import json
import sys

from src.context_dev_client import (
    ContextDevConfigError,
    ContextDevScrapeError,
    scrape,
)


def main() -> int:
    p = argparse.ArgumentParser(description="Scrape a URL with Context.dev")
    p.add_argument("url")
    p.add_argument("--html", action="store_true")
    p.add_argument("--markdown", action="store_true")
    p.add_argument("--screenshot", action="store_true")
    p.add_argument("--images", action="store_true")
    p.add_argument("--product", action="store_true")
    p.add_argument("--dedupe-images", action="store_true")
    p.add_argument("--parser", help="Prebuilt parser name, e.g. google-maps, links")
    p.add_argument("--rules", help="JSON object of custom CSS parse rules")
    p.add_argument("--json-schema", help="Path to a JSON Schema file")
    p.add_argument("--json-instructions")
    p.add_argument("--highlights", help="Highlights query")
    p.add_argument("--max-age-ms", type=int)
    a = p.parse_args()

    schema = None
    if a.json_schema:
        with open(a.json_schema, encoding="utf-8") as f:
            schema = json.load(f)

    if not any([a.html, a.markdown, a.screenshot, a.images, a.product,
                a.parser, a.rules, schema, a.highlights]):
        a.markdown = True

    try:
        result = scrape(
            a.url,
            html=a.html,
            markdown=a.markdown,
            screenshot=a.screenshot,
            images=a.images,
            product=a.product,
            dedupe_images=True if a.dedupe_images else None,
            parser=a.parser,
            parse_rules=json.loads(a.rules) if a.rules else None,
            json_schema=schema,
            json_instructions=a.json_instructions,
            highlights_query=a.highlights,
            max_age_ms=a.max_age_ms,
        )
    except ContextDevConfigError as e:
        print(f"Config error: {e}", file=sys.stderr)
        return 2
    except ContextDevScrapeError as e:
        print(f"Scrape failed ({e.status_code} {e.error_code}): {e} [request_id={e.request_id}]",
              file=sys.stderr)
        return 1

    print(f"URL: {result.url}\nTitle: {result.title}\nRequest: {result.request_id}"
          f"\nCache: {result.cache_status}  Credits used: {result.credits_consumed}"
          f"  Remaining: {result.credits_remaining}")
    if result.is_partial:
        print("WARNING: partial result")

    for name, out in result.outputs.items():
        if not out.requested:
            continue
        if not out.success:
            print(f"\n[{name}] FAILED: {out.error_code} - {out.message}")
            continue
        if out.is_empty:
            print(f"\n[{name}] (empty)")
            continue
        label = f"{name} ({out.type})" if out.type else name
        data = out.data
        text = data if isinstance(data, str) else json.dumps(data, indent=2, ensure_ascii=False)
        if len(text) > 2000:
            text = text[:2000] + f"\n... ({len(text)} chars total)"
        print(f"\n[{label}]\n{text}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
