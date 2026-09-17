from pathlib import Path

from ame_parser.extractors import AmeGuideExtractor, OneGuideExtractor
from ame_parser.models import Disposition
from ame_parser.pdf import PageData


SOURCE = Path("sample.pdf")


def test_ame_guide_maps_four_column_table_by_header_role() -> None:
    page = PageData(
        number=64,
        text=(
            "Guide for Aviation Medical Examiners – Version X\n"
            "ITEM 25. Head, Face, Neck, and Scalp\n"
            "HEAD, FACE, NECK, AND SCALP\n"
            "DISEASE/CONDITION CLASS EVALUATION DATA DISPOSITION\n64"
        ),
        tables=(
            (
                (
                    "DISEASE/CONDITION",
                    "CLASS",
                    "EVALUATION DATA",
                    "DISPOSITION",
                ),
                (
                    "Active fistula of neck",
                    "All",
                    "Submit a current, detailed Clinical Progress Note.",
                    "Requires FAA\nDecision",
                ),
                (
                    "",
                    "3rd",
                    "No additional evaluation.",
                    "ISSUE\nAnnotate Block 60.",
                ),
            ),
        ),
    )

    records = AmeGuideExtractor().extract((page,), SOURCE)
    record = records[0]

    assert record.condition == "HEAD, FACE, NECK, AND SCALP"
    assert record.category == "ITEM 25. Head, Face, Neck, and Scalp"
    assert record.scenario == "Active fistula of neck"
    assert record.certificate_classes == ("All",)
    assert record.disposition is Disposition.DEFER
    assert record.raw_disposition == "Requires FAA Decision"
    assert "requires_faa_decision_mapped_to_defer" in record.warnings
    assert "Clinical Progress Note" in record.requirements[0].text
    assert record.source.pdf_page == 64
    assert records[1].scenario == record.scenario
    assert records[1].certificate_classes == ("3rd",)
    assert records[1].disposition is Disposition.ISSUE


def test_ame_guide_handles_spanned_columns_and_continuation_page() -> None:
    page_one = PageData(
        number=65,
        text=(
            "Guide for Aviation Medical Examiners\nNOSE\nALLERGIES or ANAPHYLAXIS;\n"
            "(Allergic Rhinitis; Hay fever)\nAll Classes\n"
            "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n65"
        ),
        tables=(
            (
                (
                    "DISEASE/CONDITION",
                    "EVALUATION DATA",
                    None,
                    None,
                    "DISPOSITION",
                    None,
                ),
                (
                    "C. History requiring an epi-pen",
                    "",
                    "A current Clinical Progress Note",
                    None,
                    "DEFER\nSubmit information to the FAA.",
                    None,
                ),
            ),
        ),
    )
    page_two = PageData(
        number=66,
        text=(
            "Guide for Aviation Medical Examiners\n"
            "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n66"
        ),
        tables=(
            (
                ("DISEASE/CONDITION", "EVALUATION DATA", None, None, "DISPOSITION"),
                ("", "", "that verifies the cause and recurrence risk.", "", ""),
            ),
        ),
    )

    record = AmeGuideExtractor().extract((page_one, page_two), SOURCE)[0]

    assert record.category == "NOSE"
    assert record.condition == (
        "ALLERGIES or ANAPHYLAXIS; (Allergic Rhinitis; Hay fever)"
    )
    assert "recurrence risk" in record.raw_text
    assert record.disposition is Disposition.DEFER


def test_oneguide_reads_only_pilot_columns_and_appends_evaluation() -> None:
    page_one = PageData(
        number=5,
        text=(
            "OneGuide\n18l. Neurology\nALS - Amyotrophic Lateral Sclerosis\n"
            "DISCLAIMER - reference only\n-- 5 of 369 --"
        ),
        tables=(
            (
                (
                    "",
                    "",
                    "",
                    "Initial Certification (Pilot)",
                    "Initial Clearance VHT App",
                    "Initial Clearance Onboard/ATCS",
                    "Initial Certification/Clearance",
                ),
                (
                    "Disease/Condition\nStage",
                    "Evaluation Data",
                    "AME Actions",
                    "AAM (LIE/PA) Actions",
                    "VHT PA Actions",
                    "ATCS PA Actions",
                    "DOC Actions",
                ),
                (
                    "A. All classes\nAny history",
                    "1. Current neurological evaluation",
                    "DEFER\nSubmit information to the FAA.",
                    "internal AAM workflow",
                    "internal VHT workflow",
                    "INCAPACITATE",
                    "internal DOC notes",
                ),
            ),
        ),
    )
    continuation = PageData(
        number=6,
        text="OneGuide\n-- 6 of 369 --",
        tables=(
            (
                (
                    "",
                    "2. Any other testing deemed clinically necessary",
                    "",
                    "internal continuation",
                    "",
                    "",
                    "",
                ),
            ),
        ),
    )

    record = OneGuideExtractor().extract((page_one, continuation), SOURCE)[0]

    assert record.condition == "ALS - Amyotrophic Lateral Sclerosis"
    assert record.disposition is Disposition.DEFER
    assert "other testing" in record.raw_text
    assert "INCAPACITATE" not in record.raw_text
    assert "internal AAM" not in record.raw_text


def test_format_signatures_are_content_based() -> None:
    ame = PageData(1, "Guide for Aviation Medical Examiners")
    oneguide = PageData(1, "Office of Aerospace Medicine\nOneGuide")
    assert AmeGuideExtractor().supports((ame,))
    assert OneGuideExtractor().supports((oneguide,))
