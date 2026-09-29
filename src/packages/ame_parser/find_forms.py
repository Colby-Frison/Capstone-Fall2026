# CS 4273 – Capstone | Fall 2026 | GROUP F
# @brief: This file scans ame_guide.normalized.json for conditions/sub-conditions that have forms with urls (Status Summaries, Questionnaires, and Clinical Progress Notes).
# All info is written to form_links.json and form urls are manually inputted (automation is goal for future)

from pathlib import Path
import json

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
    raw_text = record["raw_text"].lower()

    # check keywords and update list
    if "status summary" in raw_text:
        forms_needed.append({"Form Type": "Status Summary", "Url": ""})
    if "questionnaire" in raw_text:
        forms_needed.append({"Form Type": "Questionnaire", "Url": ""})
    if "clinical progress note" in raw_text:
        # conditions that need clinical progress note will all display this same informational link, so it's hardcoded
        forms_needed.append(
            {
                "Form Type": "Clinical Progress Note",
                "Url": "https://www.faa.gov/ame_guide/media/PilotInformation_DetailedClinicalProgressNote.pdf",
            }
        )

    # if forms were found for condition, add to output dictionary
    if len(forms_needed) > 0:
        form_dict[condition] = forms_needed

# convert and output to JSON file for front-end use
with open(output_json_file_path, "w", encoding="utf-8") as out_file:
    json.dump(form_dict, out_file, indent=4)
