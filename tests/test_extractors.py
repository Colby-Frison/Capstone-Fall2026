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


def test_ame_guide_merges_fragmented_tables_into_pathways() -> None:
    page = PageData(
        number=65,
        text=(
            "Guide for Aviation Medical Examiners\nNOSE\nALLERGIES or ANAPHYLAXIS;\n"
            "(Allergic Rhinitis; Hay fever)\nAll Classes\n"
            "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n65"
        ),
        tables=(
            (
                ("DISEASE/CONDITION", "EVALUATION DATA", None, None, "DISPOSITION"),
                (
                    "A. Allergies controlled by acceptable medications",
                    "If the AME can determine the condition is controlled.",
                    None,
                    None,
                    "ISSUE\nAnnotate Block 60.",
                ),
                (
                    "B. Allergies indicated by steroid treatment",
                    "Submit the following for FAA review:",
                    None,
                    None,
                    "DEFER\nSubmit the information to the FAA.",
                ),
            ),
            (
                ("• A current, detailed Clinical Progress Note",),
                ("• Current medications, dosage, and side effects",),
            ),
        ),
    )

    records = AmeGuideExtractor().extract((page,), SOURCE)
    assert len(records) == 2
    assert records[0].disposition is Disposition.ISSUE
    assert records[1].disposition is Disposition.DEFER
    assert "Clinical Progress Note" in records[1].raw_text
    assert all(r.condition.startswith("ALLERGIES") for r in records)


def test_ame_guide_skips_non_disposition_pages() -> None:
    checklist = PageData(
        number=88,
        text=(
            "Guide for Aviation Medical Examiners\nITEM 31. Eyes\n"
            "CHECK EACH ITEM IN APPROPRIATE COLUMN\nNormal Abnormal\n88"
        ),
        tables=(
            (
                ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
                ("Should not extract", "Fake eval", "DEFER"),
            ),
        ),
    )
    # Checklist signal wins even if a fake disease header appears in a table.
    assert AmeGuideExtractor().extract((checklist,), SOURCE) == ()


def test_heading_treats_all_classes_as_scope_not_condition() -> None:
    text = (
        "Guide for Aviation Medical Examiners – Version X\n"
        "CEREBRAL PALSY\n"
        "(All classes)\n"
        "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n308"
    )
    heading = AmeGuideExtractor._heading(text)
    assert heading is not None
    _category, condition = heading
    assert condition == "CEREBRAL PALSY"
    assert "(All classes)" not in condition


def test_heading_joins_synonym_and_skips_updates_banner() -> None:
    epilepsy = AmeGuideExtractor._heading(
        "EPILEPSY\n"
        "(Seizure Disorder)\n"
        "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n"
    )
    assert epilepsy == ("", "EPILEPSY (Seizure Disorder)")

    procedures = AmeGuideExtractor._heading(
        "EYES - PROCEDURES\n"
        "(Updates 09/27/2017 see: www.faa.gov)\n"
        "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n"
    )
    assert procedures is not None
    assert procedures[1] == "EYES - PROCEDURES"
    assert "Updates" not in procedures[1]


def test_heading_uses_system_label_as_category_and_skips_criteria() -> None:
    allergies = AmeGuideExtractor._heading(
        "NOSE\n"
        "ALLERGIES; RHINITIS\n"
        "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n"
    )
    assert allergies == ("NOSE", "ALLERGIES; RHINITIS")

    chd = AmeGuideExtractor._heading(
        "CORONARY HEART DISEASE\n"
        "1 vessel disease - 50% or less stenosis\n"
        "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n"
    )
    assert chd is not None
    assert chd[1] == "CORONARY HEART DISEASE"
    assert "stenosis" not in chd[1].lower()


def test_heading_skips_all_classes_continued_banner() -> None:
    heading = AmeGuideExtractor._heading(
        "ARRHYTHMIAS\n"
        "All Classes\n"
        "(Continued)\n"
        "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n"
    )
    assert heading is not None
    assert heading[1] == "ARRHYTHMIAS"
    assert "Continued" not in heading[1]
    assert "All Classes" not in heading[1]


def test_heading_rejects_intro_prose_as_condition() -> None:
    heading = AmeGuideExtractor._heading(
        "VASCULAR CONDITIONS\n"
        "The following table lists the more common conditions of aeromedical "
        "significance, and is not intended to be all-inclusive.\n"
        "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n"
    )
    assert heading is not None
    assert heading[1] == "VASCULAR CONDITIONS"
    assert "following table" not in heading[1].lower()


def test_ame_guide_cerebral_palsy_page_maps_condition_not_all_classes() -> None:
    page = PageData(
        number=308,
        text=(
            "Guide for Aviation Medical Examiners – Version X\n"
            "CEREBRAL PALSY\n"
            "(All classes)\n"
            "DISEASE/CONDITION EVALUATION DATA DISPOSITION\n308"
        ),
        tables=(
            (
                ("DISEASE/CONDITION", "EVALUATION DATA", "DISPOSITION"),
                (
                    "Cerebral Palsy",
                    "See Item 43. Spine and Other Musculoskeletal, "
                    "Cerebral Palsy Disposition Table.",
                    "Requires FAA\nDecision",
                ),
            ),
        ),
    )
    records = AmeGuideExtractor().extract((page,), SOURCE)
    assert len(records) == 1
    assert records[0].condition == "CEREBRAL PALSY"
    assert records[0].scenario == "Cerebral Palsy"
    assert records[0].disposition.value == "DEFER"
    assert records[0].certificate_classes == ("All",)
    assert records[0].category != "CEREBRAL PALSY"
