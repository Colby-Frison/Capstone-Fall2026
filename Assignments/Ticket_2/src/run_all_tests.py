#!/usr/bin/env python3
"""
CS 4273 – Capstone | Fall 2026 | GROUP F

Run all Ticket 2 disposition unit tests (Python, JavaScript, C++).

Usage (from this directory):
  python run_all_tests.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run(label: str, command: list[str], *, cwd: Path = ROOT) -> bool:
    print(f"\n{'=' * 60}")
    print(f"  {label}")
    print(f"  $ {' '.join(command)}")
    print("=" * 60)
    result = subprocess.run(command, cwd=cwd)
    ok = result.returncode == 0
    print(f"\n[{'PASS' if ok else 'FAIL'}] {label}")
    return ok


def find_cpp_exe(build_dir: Path) -> Path | None:
    candidates = [
        build_dir / "Debug" / "CppUnitTest.exe",
        build_dir / "Release" / "CppUnitTest.exe",
        build_dir / "CppUnitTest.exe",
        build_dir / "CppUnitTest",
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None


def run_python() -> bool:
    test_file = ROOT / "AMEParserTest.py"
    if not test_file.is_file():
        print(f"\n[FAIL] Python - missing {test_file.name}")
        return False
    return run(
        "Python (pytest)",
        [sys.executable, "-m", "pytest", str(test_file), "-v"],
    )


def run_javascript() -> bool:
    node = shutil.which("node")
    if not node:
        print("\n[SKIP] JavaScript - node not found on PATH")
        return False
    test_file = ROOT / "AMEParserTest.js"
    if not test_file.is_file():
        print(f"\n[FAIL] JavaScript - missing {test_file.name}")
        return False
    return run("JavaScript (node --test)", [node, "--test", str(test_file)])


def run_cpp() -> bool:
    cmake = shutil.which("cmake")
    if not cmake:
        print("\n[SKIP] C++ - cmake not found on PATH")
        return False

    build_dir = ROOT / "build"
    configure_ok = run(
        "C++ configure (cmake)",
        [cmake, "-B", str(build_dir)],
    )
    if not configure_ok:
        return False

    build_ok = run(
        "C++ build (cmake --build)",
        [cmake, "--build", str(build_dir)],
    )
    if not build_ok:
        return False

    exe = find_cpp_exe(build_dir)
    if exe is None:
        print("\n[FAIL] C++ - built executable not found under build/")
        return False

    return run(f"C++ (GTest) - {exe.name}", [str(exe)], cwd=exe.parent)


def main() -> int:
    print("Ticket 2 - running disposition unit tests in 3 languages")
    print(f"Working directory: {ROOT}")

    results = {
        "Python": run_python(),
        "JavaScript": run_javascript(),
        "C++": run_cpp(),
    }

    print(f"\n{'=' * 60}")
    print("  Summary")
    print("=" * 60)
    for name, ok in results.items():
        print(f"  {name:12} {'PASS' if ok else 'FAIL'}")

    all_ok = all(results.values())
    print(f"\nOverall: {'ALL PASSED' if all_ok else 'SOME FAILED'}")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
