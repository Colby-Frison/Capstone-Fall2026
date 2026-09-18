"""Headless command-line interface for the AME parser."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .extractors import UnsupportedDocumentError
from .parser import AmeParser
from .schema import JSON_SCHEMA, ValidationError
from .serialization import write


def page_range(value: str) -> tuple[int, int]:
    try:
        if "-" in value:
            first, last = (int(part) for part in value.split("-", maxsplit=1))
        else:
            first = last = int(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("page range must be N or N-M") from exc
    if first < 1 or last < first:
        raise argparse.ArgumentTypeError("page range must satisfy 1 <= N <= M")
    return first, last


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ame-parser",
        description="Extract normalized, source-traceable FAA medical guidance.",
    )
    parser.add_argument("input", nargs="?", type=Path, help="AME Guide or OneGuide PDF")
    parser.add_argument("-o", "--output", type=Path, help="output JSON path")
    parser.add_argument(
        "--pages", type=page_range, metavar="N-M", help="inclusive PDF page range"
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="fail when extraction or validation produces any warning",
    )
    parser.add_argument(
        "--diagnostic",
        action="store_true",
        help="print extraction counts and warnings to stderr",
    )
    parser.add_argument(
        "--schema",
        type=Path,
        help="write the normalized JSON Schema to this path and exit",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_argument_parser().parse_args(argv)
    if args.schema:
        args.schema.parent.mkdir(parents=True, exist_ok=True)
        args.schema.write_text(
            json.dumps(JSON_SCHEMA, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        return 0
    if args.input is None:
        build_argument_parser().error("input PDF is required unless --schema is used")

    output = args.output or args.input.with_suffix(".normalized.json")
    try:
        result = AmeParser().parse(
            args.input, page_range=args.pages, strict=args.strict
        )
        write(result, output)
    except UnsupportedDocumentError as exc:
        print(f"ame-parser: unsupported document: {exc}", file=sys.stderr)
        return 3
    except ValidationError as exc:
        print(f"ame-parser: strict validation failed: {exc}", file=sys.stderr)
        return 4
    except (FileNotFoundError, PermissionError, ValueError) as exc:
        print(f"ame-parser: {exc}", file=sys.stderr)
        return 2

    if args.diagnostic:
        summary = ", ".join(f"{key}={value}" for key, value in result.summary.items())
        print(summary, file=sys.stderr)
        for warning in result.warnings:
            print(f"warning: {warning}", file=sys.stderr)
    print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
