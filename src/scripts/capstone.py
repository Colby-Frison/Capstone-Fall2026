#!/usr/bin/env python3
"""Capstone sectional CLI for tests and local development."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WEB_DIR = ROOT / "src" / "apps" / "web"
API_DIR = ROOT / "src" / "apps" / "api"
API_SERVER = API_DIR / "src" / "server.mjs"
GUIDANCE_DIR = ROOT / "src" / "data" / "guidance"
RESOURCES = ROOT / "Documentation" / "Resources"


class SectionError(RuntimeError):
    pass


def banner(title: str) -> None:
    line = "=" * 64
    print(f"\n{line}\n {title}\n{line}", flush=True)


def resolve_pm() -> list[str]:
    # Prefer the lockfile that exists so local + Vercel stay consistent.
    # package-lock.json → npm; pnpm-lock.yaml alone → pnpm; both → npm.
    has_npm_lock = (WEB_DIR / "package-lock.json").exists()
    has_pnpm_lock = (WEB_DIR / "pnpm-lock.yaml").exists()
    if has_npm_lock:
        order = ("npm", "pnpm")
    elif has_pnpm_lock:
        order = ("pnpm", "npm")
    else:
        order = ("npm", "pnpm")

    for name in order:
        if sys.platform == "win32":
            cmd_path = shutil.which(f"{name}.cmd")
            if cmd_path:
                return [cmd_path]
        path = shutil.which(name)
        if path:
            return [path]
    raise SectionError("Neither pnpm nor npm was found on PATH")


def ensure_web_deps() -> list[str]:
    pm = resolve_pm()
    if not (WEB_DIR / "node_modules").exists():
        banner("Installing web dependencies")
        run([*pm, "install"], cwd=WEB_DIR)
    return pm


def run(cmd: list[str], *, cwd: Path | None = None) -> None:
    print(f"$ {' '.join(cmd)}", flush=True)
    completed = subprocess.run(
        cmd,
        cwd=str(cwd or ROOT),
        shell=sys.platform == "win32",
    )
    if completed.returncode != 0:
        raise SectionError(f"Command failed ({completed.returncode}): {' '.join(cmd)}")


def test_parser() -> None:
    banner("SECTION: parser")
    run([sys.executable, "-m", "pytest", "tests", "-q"], cwd=ROOT)


def test_content() -> None:
    banner("SECTION: content")
    pm = ensure_web_deps()
    run(
        pm
        + [
            "exec",
            "vitest",
            "run",
            "src/content.adapter.test.ts",
            "src/freq.conditions.test.ts",
            "src/nih.match.test.ts",
            "src/nih.map.test.ts",
            "src/search.score.test.ts",
        ],
        cwd=WEB_DIR,
    )
    api_dir = ROOT / "src" / "apps" / "api"
    if (api_dir / "src" / "clinicalTables.test.mjs").is_file():
        banner("SECTION: nih-api")
        node = shutil.which("node")
        if not node:
            raise SectionError("Node.js required for NIH API unit tests")
        run([node, "--test", "src/clinicalTables.test.mjs"], cwd=api_dir)


def test_web() -> None:
    banner("SECTION: web")
    pm = ensure_web_deps()
    run(pm + ["run", "build"], cwd=WEB_DIR)


SECTION_RUNNERS = {
    "parser": test_parser,
    "content": test_content,
    "web": test_web,
}


def cmd_test(args: argparse.Namespace) -> int:
    sections = [args.section] if args.section != "all" else list(SECTION_RUNNERS)
    failures: list[str] = []
    for name in sections:
        try:
            SECTION_RUNNERS[name]()
            print(f"[ok] {name}", flush=True)
        except SectionError as exc:
            print(f"[fail] {name}: {exc}", file=sys.stderr, flush=True)
            failures.append(name)
            if args.fail_fast:
                break
    if failures:
        print(f"\nFailed sections: {', '.join(failures)}", file=sys.stderr)
        return 1
    print("\nAll selected sections passed.")
    return 0


def start_nih_api() -> subprocess.Popen | None:
    """Start the thin NIH BFF if Node and the server script are available."""
    if not API_SERVER.is_file():
        print("NIH API server not found; autocomplete will fail until it is started.", flush=True)
        return None
    node = shutil.which("node")
    if not node:
        print("Node.js not found; skipping NIH API BFF.", flush=True)
        return None
    banner("Starting NIH API BFF (port 8787)")
    print(f"$ {node} {API_SERVER}", flush=True)
    return subprocess.Popen(
        [node, str(API_SERVER)],
        cwd=str(API_DIR),
        stdout=sys.stdout,
        stderr=sys.stderr,
    )


def cmd_dev(args: argparse.Namespace) -> int:
    if args.parser:
        print(
            "Tip: re-parse PDFs into src/data/guidance with:\n"
            f"  {sys.executable} {Path(__file__).name} parse "
            "--input Documentation/Resources/ame_guide.pdf\n"
            "(Source PDFs are gitignored; keep local copies under Documentation/Resources/.)\n",
            flush=True,
        )
    pm = ensure_web_deps()
    api_proc = None if args.no_api else start_nih_api()
    banner("Starting web development server")
    cmd = pm + ["run", "dev"]
    print(f"$ {' '.join(cmd)}", flush=True)
    try:
        code = subprocess.call(cmd, cwd=str(WEB_DIR), shell=sys.platform == "win32")
    finally:
        if api_proc is not None and api_proc.poll() is None:
            api_proc.terminate()
            try:
                api_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                api_proc.kill()
    raise SystemExit(code)


def cmd_build(args: argparse.Namespace) -> int:
    """Production build of the Vite web app (same as Vercel / test --section web)."""
    pm = ensure_web_deps()
    banner("Building web app for production")
    run(pm + ["run", "build"], cwd=WEB_DIR)
    dist = WEB_DIR / "dist"
    print(f"Build output: {dist}")
    return 0


def cmd_parse(args: argparse.Namespace) -> int:
    banner("Parsing PDF into guidance data")
    GUIDANCE_DIR.mkdir(parents=True, exist_ok=True)
    input_path = Path(args.input)
    if not input_path.is_file():
        # Allow short names relative to Resources
        candidate = RESOURCES / args.input
        if candidate.is_file():
            input_path = candidate
        else:
            print(f"Input PDF not found: {args.input}", file=sys.stderr)
            print(
                "Hint: source PDFs are gitignored; place ame_guide.pdf / "
                "OneGuide_Neurology.pdf under Documentation/Resources/ locally.",
                file=sys.stderr,
            )
            return 2

    output = (
        Path(args.output)
        if args.output
        else GUIDANCE_DIR / f"{input_path.stem}.normalized.json"
    )
    cmd = [
        sys.executable,
        "-m",
        "ame_parser",
        str(input_path),
        "-o",
        str(output),
        "--diagnostic",
    ]
    if args.pages:
        cmd.extend(["--pages", args.pages])
    run(cmd, cwd=ROOT)
    print(f"Wrote {output}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="capstone",
        description="Capstone sectional test runner and development helper",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    test = sub.add_parser("test", help="Run sectional tests")
    test.add_argument(
        "--section",
        choices=["all", *SECTION_RUNNERS.keys()],
        default="all",
        help="Which layer to test (default: all)",
    )
    test.add_argument(
        "--fail-fast",
        action="store_true",
        help="Stop after the first failing section",
    )
    test.set_defaults(func=cmd_test)

    dev = sub.add_parser("dev", help="Start the web development environment")
    dev.add_argument(
        "--parser",
        action="store_true",
        help="Print how to refresh guidance JSON from PDFs",
    )
    dev.add_argument(
        "--no-api",
        action="store_true",
        help="Do not start the NIH Clinical Tables BFF (port 8787)",
    )
    dev.set_defaults(func=cmd_dev)

    build = sub.add_parser(
        "build",
        help="Production-build the web app under src/apps/web (Vite → dist/)",
    )
    build.set_defaults(func=cmd_build)

    parse = sub.add_parser("parse", help="Parse a PDF into src/data/guidance")
    parse.add_argument(
        "--input",
        default=str(RESOURCES / "ame_guide.pdf"),
        help="PDF path or filename under Documentation/Resources",
    )
    parse.add_argument("--output", help="Optional output JSON path")
    parse.add_argument("--pages", help="Optional inclusive page range N-M")
    parse.set_defaults(func=cmd_parse)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args))
    except SectionError as exc:
        print(f"capstone: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
