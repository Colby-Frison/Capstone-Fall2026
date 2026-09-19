"""Logical disposition-table assembly for fragmented pdfplumber grids."""

from __future__ import annotations

import re
from dataclasses import dataclass

from .pdf import Table
from .text import clean


@dataclass(frozen=True)
class ColumnMap:
    disease: int
    evaluation: int
    disposition: int
    class_idx: int | None
    header_idx: int


@dataclass(frozen=True)
class LogicalRow:
    scenario: str
    classes: str
    evaluation: str
    disposition: str


def map_headers(table: Table) -> ColumnMap | None:
    """Map DISEASE / CLASS / EVALUATION / DISPOSITION by label, not ncol count."""

    for header_idx, row in enumerate(table[:4]):
        headers = [clean(cell).upper() for cell in row]
        disease = next(
            (i for i, value in enumerate(headers) if "DISEASE" in value),
            None,
        )
        evaluation = next(
            (i for i, value in enumerate(headers) if "EVALUATION" in value),
            None,
        )
        disposition = next(
            (i for i, value in enumerate(headers) if "DISPOSITION" in value),
            None,
        )
        if disease is None or evaluation is None or disposition is None:
            continue
        class_idx = next(
            (i for i, value in enumerate(headers) if value == "CLASS"),
            None,
        )
        return ColumnMap(
            disease=disease,
            evaluation=evaluation,
            disposition=disposition,
            class_idx=class_idx,
            header_idx=header_idx,
        )
    return None


def _normalize_cell(cell: object) -> str:
    """Normalize a cell while preserving intentional line breaks (stacked classes)."""

    if cell is None:
        return ""
    text = str(cell).replace("\x00", " ")
    lines = [
        re.sub(r"[ \t]+", " ", line).strip()
        for line in text.splitlines()
    ]
    return "\n".join(line for line in lines if line)


def _join_role_cells(row: tuple, start: int, end: int) -> str:
    """Join cells in [start, end) skipping nulls; end may exceed row length."""

    pieces: list[str] = []
    for index in range(start, min(end, len(row))):
        value = _normalize_cell(row[index] if index < len(row) else None)
        if value:
            pieces.append(value)
    return "\n".join(pieces)


def row_to_logical(row: tuple, columns: ColumnMap) -> LogicalRow | None:
    scenario = _join_role_cells(row, columns.disease, columns.disease + 1)
    # Evaluation spans from evaluation index up to disposition (may have gaps).
    evaluation = _join_role_cells(row, columns.evaluation, columns.disposition)
    # Also pick up non-null cells between disease+1 and evaluation when CLASS absent
    # and pdfplumber left fragments in gap columns.
    if columns.class_idx is None and columns.evaluation > columns.disease + 1:
        gap = _join_role_cells(row, columns.disease + 1, columns.evaluation)
        if gap:
            evaluation = "\n".join(part for part in (gap, evaluation) if part)
    disposition = _join_role_cells(row, columns.disposition, len(row))
    classes = (
        _join_role_cells(row, columns.class_idx, columns.class_idx + 1)
        if columns.class_idx is not None
        else ""
    )
    if not any(clean(value) for value in (scenario, classes, evaluation, disposition)):
        return None
    if scenario.upper().startswith("NOTE:") and not evaluation and not disposition:
        return None
    return LogicalRow(
        scenario=scenario,
        classes=classes,
        evaluation=evaluation,
        disposition=disposition,
    )


def _pathway_like_scenario(text: str) -> bool:
    value = clean(text)
    if not value:
        return False
    if re.match(r"^[A-Z]\.\s+", value):
        return True
    if value.upper().startswith(("NOTE:", "SEE ", "SUBMIT THE FOLLOWING")):
        return False
    return len(value) >= 8


def table_score(table: Table, columns: ColumnMap | None = None) -> float:
    """Higher score = more likely the primary disposition table on a page."""

    columns = columns or map_headers(table)
    if columns is None:
        # Fragment / continuation table without header.
        nonempty = sum(1 for row in table for cell in row if clean(cell))
        width = max((len(row) for row in table), default=0)
        if width <= 1:
            return 0.1 * nonempty
        return 0.5 * nonempty

    pathway_rows = 0
    for row in table[columns.header_idx + 1 :]:
        logical = row_to_logical(row, columns)
        if logical and _pathway_like_scenario(logical.scenario):
            pathway_rows += 1
    width = max((len(row) for row in table), default=0)
    cells = sum(len(row) for row in table) or 1
    nonempty = sum(1 for row in table for cell in row if clean(cell))
    density = nonempty / cells
    return 10.0 * pathway_rows + 2.0 * density + 0.1 * width


def select_primary_table(
    tables: tuple[Table, ...],
) -> tuple[Table, ColumnMap] | None:
    """Pick the best disposition table; return None if none qualify."""

    best: tuple[float, Table, ColumnMap] | None = None
    for table in tables:
        columns = map_headers(table)
        if columns is None:
            continue
        score = table_score(table, columns)
        if best is None or score > best[0]:
            best = (score, table, columns)
    if best is None:
        return None
    return best[1], best[2]


def is_fragment_table(table: Table, primary_columns: ColumnMap | None) -> bool:
    """True for ghost 1-col / shredded list tables that belong to a pathway."""

    if map_headers(table) is not None:
        return False
    width = max((len(row) for row in table), default=0)
    if width <= 2:
        return True
    nonempty = [clean(cell) for row in table for cell in row if clean(cell)]
    if not nonempty:
        return False
    # High-empty wide tables without headers are usually fragments.
    cells = sum(len(row) for row in table) or 1
    density = len(nonempty) / cells
    if density < 0.25 and primary_columns is not None:
        return True
    return False


def fragment_text(table: Table) -> str:
    return "\n".join(
        clean(cell) for row in table for cell in row if clean(cell)
    )


def iter_logical_rows(
    table: Table,
    columns: ColumnMap,
) -> list[LogicalRow]:
    rows: list[LogicalRow] = []
    for row in table[columns.header_idx + 1 :]:
        logical = row_to_logical(tuple(row), columns)
        if logical is not None:
            rows.append(logical)
    return rows


def merge_fragment_into_row(row: LogicalRow, fragment: str) -> LogicalRow:
    extra = clean(fragment)
    if not extra:
        return row
    evaluation = row.evaluation
    if extra not in clean(evaluation):
        evaluation = f"{evaluation}\n{extra}".strip()
    return LogicalRow(
        scenario=row.scenario,
        classes=row.classes,
        evaluation=evaluation,
        disposition=row.disposition,
    )


def assemble_page_rows(
    tables: tuple[Table, ...],
    last_columns: ColumnMap | None = None,
) -> tuple[list[LogicalRow], ColumnMap | None]:
    """
    Build ordered logical pathway rows for a page.

    Primary disposition table yields pathway rows; fragment tables append into
    the most recent pathway's evaluation text. Headerless continuation tables
    reuse last_columns when geometry is compatible.
    """

    primary = select_primary_table(tables)
    columns = primary[1] if primary else last_columns
    rows: list[LogicalRow] = []

    if primary is not None:
        table, columns = primary
        rows.extend(iter_logical_rows(table, columns))
        for table in tables:
            if table is primary[0]:
                continue
            if is_fragment_table(table, columns):
                if rows:
                    rows[-1] = merge_fragment_into_row(rows[-1], fragment_text(table))
                continue
            # Secondary disposition table on same page (rare).
            secondary = map_headers(table)
            if secondary is not None:
                rows.extend(iter_logical_rows(table, secondary))
            elif columns is not None and table:
                # Headerless continuation-shaped table under same roles.
                width = max(len(row) for row in table)
                if width > columns.disposition:
                    synthetic = ColumnMap(
                        disease=columns.disease,
                        evaluation=columns.evaluation,
                        disposition=columns.disposition,
                        class_idx=columns.class_idx,
                        header_idx=-1,
                    )
                    rows.extend(iter_logical_rows(table, synthetic))
        return rows, columns

    # No header on this page — continuation using prior column map.
    if last_columns is None:
        return [], None
    for table in tables:
        if not table:
            continue
        width = max(len(row) for row in table)
        if is_fragment_table(table, last_columns):
            if rows:
                rows[-1] = merge_fragment_into_row(rows[-1], fragment_text(table))
            elif width <= 2:
                # Lone fragment with no active row — treat as evaluation-only row.
                text = fragment_text(table)
                if text:
                    rows.append(
                        LogicalRow(
                            scenario="",
                            classes="",
                            evaluation=text,
                            disposition="",
                        )
                    )
            continue
        if width <= last_columns.disposition:
            continue
        synthetic = ColumnMap(
            disease=last_columns.disease,
            evaluation=last_columns.evaluation,
            disposition=last_columns.disposition,
            class_idx=last_columns.class_idx,
            header_idx=-1,
        )
        rows.extend(iter_logical_rows(table, synthetic))
    return rows, last_columns
