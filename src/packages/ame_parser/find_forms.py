# @brief: This file scans ame_guide.normalized json for conditions/sub-conditions with Status Summaries and Questionnaires; All info is outputted to json file where manual entry of form url is required

from pathlib import Path
import json 

# key = name of condition/sub-condition; VALUE = array of forms 
formDict = {}

# path to current script 
current_path = Path(__file__).resolve().parent

# path to src/data/guidance folder for I/O
input_json_file_path = current_path.parent.parent / "data" / "guidance" / "ame_guide.normalized.json" 
output_json_file_path = current_path.parent.parent / "data" / "guidance" / "form_links.json"


# load ame_guide.normalized.json 
with open(input_json_file_path, 'r', encoding='utf-8') as file:
    ame_parsed_json = json.load(file)


# scan each record (condition) for key words (status summary or questionnaire)
for record in ame_parsed_json["records"]:
    forms_needed = [] # list of dictionaries
    condition = record["condition"]   # get condition name (key)
    raw_text = record["raw_text"].lower() # read raw text and see if it contains status summary or questionnaires 
    print (raw_text)
    # check keywords and add 
    if "status summary" in raw_text: 
        forms_needed.append(
            {
                "Form Type": "Status Summary", 
                "Url": ""
            }
        )
    if "questionnaire" in raw_text: 
         forms_needed.append(
                    {
                        "Form Type": "Questionnaire", 
                        "Url": ""
                    }
                )
    if "clinical progress note" in raw_text: 
          forms_needed.append(
                    {
                        "Form Type": "Clinical Progress Note", 
                        "Url": ""
                    }
                )

    # if forms were found for condition, add to formDict
    if len(forms_needed) > 0: 
         formDict[condition] = forms_needed


# convert and output to JSON file that frontend will use 
with open(output_json_file_path, 'w', encoding='utf-8') as out_file:
    json.dump(formDict, out_file, indent=4)