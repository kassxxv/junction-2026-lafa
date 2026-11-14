"""Server-side wrapper around Context.dev POST /v1/web/scrape.

Reads CONTEXT_DEV_API_KEY from the environment (or a local .env file).
Never import this module from browser-facing code.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from typing import Any, Literal, Mapping, Optional

from dotenv import load_dotenv

from context.dev import ContextDev, APIStatusError, APIConnectionError

load_dotenv()

ENV_VAR = "CONTEXT_DEV_API_KEY"

OUTPUT_NAMES = (
    "html",
    "markdown",
    "screenshot",
    "images",
    "bytes",
    "parsed",
    "json",
    "highlights",
    "product",
)

# Parsers that read data independently of the DOM and cannot use browser profiles.
_PROFILELESS_PARSERS = {
    "google-maps",
    "google-maps-reviews",
    "google-play",
    "google-play-reviews",
    "app-store",
    "app-store-reviews",
    "g2-reviews",
    "instagram-profile",
    "instagram-post",
    "instagram-feed",
    "tiktok-profile",
    "tiktok-video",
    "tiktok-feed",
    "tiktok-comments",
    "tiktok-followers",
    "tiktok-following",
    "tiktok-user-search",
}
_PAGE_PARSERS = {"emails", "phone-numbers", "links"}
PREBUILT_PARSERS = _PROFILELESS_PARSERS | _PAGE_PARSERS

ReviewSort = Literal["newest", "oldest", "relevant", "highest", "lowest"]


class ContextDevConfigError(RuntimeError):
    """Missing or invalid local configuration (e.g. no API key)."""


class ContextDevScrapeError(RuntimeError):
    """The scrape request itself failed (HTTP error or network failure)."""

    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        error_code: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.error_code = error_code
        self.request_id = request_id


@dataclass
class ScrapeOutput:
    """One output (html, markdown, json, ...). `data` is None when not requested or failed."""

    requested: bool
    success: Optional[bool]
    data: Any
    error_code: Optional[str] = None
    message: Optional[str] = None
    type: Optional[str] = None  # only set for `parsed` (e.g. "custom", "google-maps")

    @property
    def ok(self) -> bool:
        return self.requested and bool(self.success)

    @property
    def is_empty(self) -> bool:
        """True when the output succeeded but carries no useful content."""
        if not self.ok:
            return True
        d = self.data
        if d is None:
            return True
        if isinstance(d, (str, list, dict)) and len(d) == 0:
            return True
        return False


@dataclass
class ScrapeResult:
    url: str
    request_id: str
    is_partial: bool
    outputs: dict[str, ScrapeOutput]
    title: Optional[str] = None
    cache_status: Optional[str] = None
    credits_consumed: Optional[int] = None
    credits_remaining: Optional[int] = None
    raw: Any = field(default=None, repr=False)

    def __getitem__(self, name: str) -> ScrapeOutput:
        return self.outputs[name]

    @property
    def failed(self) -> dict[str, ScrapeOutput]:
        return {k: v for k, v in self.outputs.items() if v.requested and not v.success}

    @property
    def product(self) -> Optional[dict]:
        """Product dict if the page is a product page, else None (missing fields stay None)."""
        out = self.outputs["product"]
        if not out.ok or not out.data:
            return None
        if not out.data.get("isProductPage"):
            return None
        return out.data.get("product")


_client: Optional[ContextDev] = None


def get_client() -> ContextDev:
    """Return a shared Context.dev client. Validates the API key is configured."""
    global _client
    if _client is None:
        api_key = os.environ.get(ENV_VAR, "").strip()
        if not api_key:
            raise ContextDevConfigError(
                f"{ENV_VAR} is not set. Add it to .env or your deployment env vars "
                "(get one at https://www.context.dev/dashboard/api-keys)."
            )
        # SDK retries connection errors, 408, 409, 429 and 5xx with backoff.
        _client = ContextDev(api_key=api_key, max_retries=2, timeout=330.0)
    return _client


def _build_parse_params(
    rules: Optional[Mapping[str, Any]],
    parser: Optional[str],
    sort: Optional[ReviewSort],
    limit: Optional[int],
) -> Optional[dict]:
    if rules is not None and parser is not None:
        raise ValueError("Use either parse_rules (custom) or parser (prebuilt), not both.")
    if rules is not None:
        if sort is not None or limit is not None:
            raise ValueError("sort/limit only apply to prebuilt parsers.")
        return {"rules": dict(rules)}  # type defaults to "custom"
    if parser is not None:
        if parser not in PREBUILT_PARSERS:
            raise ValueError(f"Unknown prebuilt parser: {parser!r}")
        params: dict[str, Any] = {"type": "prebuilt", "parser": parser}
        if sort is not None or limit is not None:
            if parser != "google-maps-reviews":
                raise ValueError("sort/limit are only supported with parser='google-maps-reviews'.")
            if sort is not None:
                params["sort"] = sort
            if limit is not None:
                if not 1 <= limit <= 1000:
                    raise ValueError("limit must be between 1 and 1000.")
                params["limit"] = limit
        return params
    return None


def scrape(
    url: str,
    *,
    html: bool = False,
    markdown: bool = False,
    screenshot: bool = False,
    images: bool = False,
    bytes: bool = False,
    # parse: custom CSS rules OR a prebuilt parser
    parse_rules: Optional[Mapping[str, Any]] = None,
    parser: Optional[str] = None,
    reviews_sort: Optional[ReviewSort] = None,
    reviews_limit: Optional[int] = None,
    # json extraction
    json_schema: Optional[Mapping[str, Any]] = None,
    json_instructions: Optional[str] = None,
    # highlights
    highlights_query: Optional[str] = None,
    highlights_max_characters: Optional[int] = None,
    # product
    product: bool = False,
    dedupe_images: Optional[bool] = None,
    # request-level options
    shared_params: Optional[Mapping[str, Any]] = None,
    max_age_ms: Optional[int] = None,
    timeout_ms: Optional[int] = None,
    timeout_behavior: Literal["fail", "return-partial"] = "fail",
    zdr: Optional[Literal["enabled", "disabled"]] = None,
    tags: Optional[list[str]] = None,
) -> ScrapeResult:
    """Scrape `url` into any combination of outputs.

    Credits: 1 base; json +4 when extracted; highlights +1 when passages are
    returned; product +1. Raises ContextDevScrapeError on request failure.
    Per-output failures are reported in the result (see `.failed`, `.is_partial`).
    """
    parse_params = _build_parse_params(parse_rules, parser, reviews_sort, reviews_limit)

    formats: dict[str, bool] = {
        "html": html,
        "markdown": markdown,
        "screenshot": screenshot,
        "images": images,
        "bytes": bytes,
        "parse": parse_params is not None,
        "json": json_schema is not None,
        "highlights": highlights_query is not None,
        "product": product,
    }
    if not any(formats.values()):
        raise ValueError("Request at least one output format.")

    kwargs: dict[str, Any] = {"url": url, "formats": {k: v for k, v in formats.items() if v}}

    if parse_params is not None:
        if (
            parse_params.get("parser") in _PROFILELESS_PARSERS
            and shared_params
            and "profile" in shared_params
        ):
            raise ValueError(f"Parser {parse_params['parser']!r} cannot be combined with browser profiles.")
        kwargs["parse_params"] = parse_params

    if json_schema is not None:
        if json_schema.get("type") != "object":
            raise ValueError("json_schema must be an object JSON Schema (type: 'object').")
        if len(json.dumps(json_schema)) > 50_000:
            raise ValueError("json_schema exceeds 50,000 serialized characters.")
        # Schema is passed through verbatim: keywords and property names are preserved.
        json_params: dict[str, Any] = {"schema": dict(json_schema)}
        if json_instructions:
            if len(json_instructions) > 2000:
                raise ValueError("json_instructions must be at most 2,000 characters.")
            json_params["instructions"] = json_instructions
        kwargs["json_params"] = json_params
    elif json_instructions:
        raise ValueError("json_instructions requires json_schema.")

    if highlights_query is not None:
        if not 1 <= len(highlights_query) <= 2000:
            raise ValueError("highlights_query must be 1-2,000 characters.")
        if zdr == "enabled":
            raise ValueError("Highlights cannot be combined with zdr='enabled'.")
        hp: dict[str, Any] = {"query": highlights_query}
        if highlights_max_characters is not None:
            if not 100 <= highlights_max_characters <= 20_000:
                raise ValueError("highlights_max_characters must be 100-20,000.")
            hp["max_characters"] = highlights_max_characters
        kwargs["highlights_params"] = hp

    if dedupe_images is not None:
        if not product:
            raise ValueError("dedupe_images requires product=True.")
        kwargs["product_params"] = {"dedupe_images": dedupe_images}

    if shared_params:
        kwargs["shared_params"] = dict(shared_params)
    if max_age_ms is not None:
        kwargs["max_age_ms"] = max_age_ms
    if timeout_ms is not None:
        kwargs["timeout_opts"] = {"milliseconds": timeout_ms, "behavior": timeout_behavior}
    if zdr is not None:
        kwargs["zdr"] = zdr
    if tags:
        kwargs["tags"] = tags

    try:
        resp = get_client().web.scrape(**kwargs)
    except APIStatusError as e:
        body = e.body if isinstance(e.body, dict) else {}
        raise ContextDevScrapeError(
            body.get("message") or str(e),
            status_code=e.status_code,
            error_code=body.get("error_code"),
            request_id=body.get("request_id") or e.response.headers.get("X-Request-Id"),
        ) from e
    except APIConnectionError as e:
        raise ContextDevScrapeError(f"Could not reach Context.dev: {e}") from e

    return _to_result(resp)


def _to_result(resp: Any) -> ScrapeResult:
    raw = resp.to_dict()  # camelCase keys, as returned by the API
    outputs: dict[str, ScrapeOutput] = {}
    for name in OUTPUT_NAMES:
        o = raw.get(name) or {}
        requested = bool(o.get("requested"))
        outputs[name] = ScrapeOutput(
            requested=requested,
            success=o.get("success"),
            data=o.get("data") if requested else None,
            error_code=o.get("error_code"),
            message=o.get("message"),
            type=o.get("type") if name == "parsed" else None,
        )
    key_meta = raw.get("key_metadata") or {}
    return ScrapeResult(
        url=raw.get("url", ""),
        request_id=raw.get("request_id", ""),
        is_partial=bool(raw.get("isPartial")),
        outputs=outputs,
        title=(raw.get("metadata") or {}).get("title"),
        cache_status=(raw.get("cache_metadata") or {}).get("status"),
        credits_consumed=key_meta.get("credits_consumed"),
        credits_remaining=key_meta.get("credits_remaining"),
        raw=raw,
    )
