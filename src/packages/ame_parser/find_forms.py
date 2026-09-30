# CS 4273 – Capstone | Fall 2026 | GROUP F
# @brief: This script finds conditions in ame_guide.normalized.json with these forms: Status Summaries, Questionnaires, and Clinical Progress Notes.
# Script's purpose is to help automate creation of form_links.json. Unfortunately as of now, form urls must be manually inputted/verifed (automation is future goal)
# NOTE: Running the script overwrites any existing form_links.json, which will remove added urls

from pathlib import Path
import json
import re

# output dictionary
# KEY = name of condition/sub-condition
# VALUE = array of mentioned forms
form_dict = {}

# path to current script
current_directory = Path(__file__).resolve().parent

# paths to src/data/guidance folder for input & output json files
input_json_file_path = (
    current_directory.parent.parent / "data" / "guidance" / "ame_guide.normalized.json"
)
output_json_file_path = (
    current_directory.parent.parent / "data" / "guidance" / "form_links.json"
)

# load ame_guide.normalized.json
with open(input_json_file_path, "r", encoding="utf-8") as input_file:
    ame_parsed_json = json.load(input_file)

# scan each record (condition) for key words (status summary, questionnaire, or clinical progress note)
for record in ame_parsed_json["records"]:
    # list of dictionaries
    forms_needed = []

    # get condition name (key)
    condition = record["condition"]

    # check raw text of each record
    raw_text = record["raw_text"]

    # check keywords and update list (use regex to extract condition-specific status summary or questionnaire)
    if "Status Summary" in raw_text:
        # re: grab up to 5 capitalized, hyphenated, or parenthesized words attached in front of Status Summary
        match = re.search(
            r"((?:[A-Z\(][a-zA-Z\-\)]*\s+){1,5}Status\s+Summary)",
            raw_text,
        )
        if match:
            forms_needed.append({"Form Type": match.group(0), "Url": ""})
        else:
            forms_needed.append({"Form Type": "Status Summary", "Url": ""})

    if "Questionnaire" in raw_text:
        match = re.search(r"((?:[A-Z\(][a-zA-Z\-\)]*\s+){1,5}Questionnaire)", raw_text)
        if match:
            forms_needed.append({"Form Type": match.group(0), "Url": ""})
        else:
            forms_needed.append({"Form Type": "Questionnaire", "Url": ""})

    if "Clinical Progress Note" in raw_text:
        # conditions that need clinical progress note will all display this same informational link, so it's hardcoded
        forms_needed.append(
            {
                "Form Type": "Clinical Progress Note",
                "Url": "https://www.faa.gov/ame_guide/media/PilotInformation_DetailedClinicalProgressNote.pdf",
            }
        )
    if "FAA form 8500-7" in raw_text:
        forms_needed.append(
            {
                "Form Type": "FAA 8500-7",
                "Url": "https://www.faa.gov/documentLibrary/media/Form/FAA_Form_8500-7_Exp_10.31.24.pdf",
            }
        )

    # if forms were found for condition, add to output dictionary
    if len(forms_needed) > 0:
        if condition not in form_dict:
            form_dict[condition] = forms_needed
        else:
            for form in forms_needed:
                # handle duplicates (i.e., multiple clinical progress note mentions)
                if form not in form_dict[condition]:
                    form_dict[condition].append(form)

# write to output JSON file for front-end use
with open(output_json_file_path, "w", encoding="utf-8") as out_file:
    json.dump(form_dict, out_file, indent=4)
