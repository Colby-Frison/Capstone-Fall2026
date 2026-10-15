"""Tests for the sectional test harness in src/scripts/capstone.py."""

import importlib.util
from pathlib import Path
from types import ModuleType

import pytest


SCRIPT = Path(__file__).parents[1] / "src" / "scripts" / "capstone.py"


@pytest.fixture()
def capstone(monkeypatch) -> ModuleType:
    spec = importlib.util.spec_from_file_location("capstone_under_test", SCRIPT)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.commands = []

    def fake_run(cmd, *, cwd=None):
        module.commands.append((tuple(cmd), cwd))

    monkeypatch.setattr(module, "run", fake_run)
    monkeypatch.setattr(module, "ensure_web_deps", lambda: ["npm"])
    return module


def ran(capstone: ModuleType) -> list[str]:
    return [" ".join(cmd) for cmd, _ in capstone.commands]


def test_default_runs_parser_and_web_with_coverage(capstone, capsys) -> None:
    assert capstone.main(["test"]) == 0
    commands = ran(capstone)
    assert any("pytest tests" in cmd and "--cov" in cmd for cmd in commands)
    assert "npm exec vitest run --coverage" in commands
    assert "npm run build" in commands
    assert not any("playwright" in cmd for cmd in commands)
    out = capsys.readouterr().out
    assert "[ok] parser" in out and "[ok] web" in out


def test_no_coverage_flag_drops_coverage_arguments(capstone) -> None:
    assert capstone.main(["test", "--no-coverage"]) == 0
    assert not any("--cov" in cmd or "--coverage" in cmd for cmd in ran(capstone))


def test_e2e_flag_adds_playwright(capstone) -> None:
    assert capstone.main(["test", "--e2e"]) == 0
    assert "npm run test:e2e" in ran(capstone)


@pytest.mark.parametrize(
    ("section", "expected"),
    [
        ("parser", "pytest tests"),
        ("content", "npm exec vitest run src/content."),
        ("web", "npm run build"),
        ("e2e", "npm run test:e2e"),
    ],
)
def test_single_section(capstone, section, expected) -> None:
    assert capstone.main(["test", "--section", section]) == 0
    commands = ran(capstone)
    assert any(expected in cmd for cmd in commands)
    assert capstone.selected_sections(
        capstone.build_parser().parse_args(["test", "--section", section])
    ) == [section]


def test_failures_are_reported_and_fail_fast_stops(capstone, monkeypatch, capsys) -> None:
    def failing_run(cmd, *, cwd=None):
        capstone.commands.append((tuple(cmd), cwd))
        raise capstone.SectionError("boom")

    monkeypatch.setattr(capstone, "run", failing_run)
    assert capstone.main(["test"]) == 1
    err = capsys.readouterr().err
    assert "[fail] parser: boom" in err and "[fail] web: boom" in err
    assert "Failed sections: parser, web" in err

    capstone.commands.clear()
    assert capstone.main(["test", "--fail-fast"]) == 1
    assert len(capstone.commands) == 1


def test_coverage_report_paths_are_listed(capstone, tmp_path, monkeypatch, capsys) -> None:
    monkeypatch.setattr(capstone, "ROOT", tmp_path)
    monkeypatch.setattr(capstone, "WEB_DIR", tmp_path / "web")
    monkeypatch.setattr(capstone, "PY_COVERAGE_DIR", tmp_path / "coverage" / "python")
    report = tmp_path / "coverage" / "python" / "html" / "index.html"
    report.parent.mkdir(parents=True)
    report.write_text("<html></html>", encoding="utf-8")
    capstone.print_coverage_reports(["parser", "web"])
    out = capsys.readouterr().out
    assert "parser: coverage/python/html/index.html" in out
    assert "web:" not in out


def test_parse_reports_missing_input(capstone, capsys) -> None:
    assert capstone.main(["parse", "--input", "does-not-exist.pdf"]) == 2
    assert "Input PDF not found" in capsys.readouterr().err
