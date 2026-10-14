# Candidate onboarding: backend configuration

The frontend supports these fields and dropdown values. The PHP `hrc` resume-parsing endpoint is not in this repository, so the backend must support resume uploads without identification fields and candidate updates with identification fields.

## Government identification

Add these fields to `hrc_candidates` and accept them in the existing candidate update API:

| Field | Type | Values |
| --- | --- | --- |
| `government_id_type` | Enum | `pan`, `driving_licence`, `aadhaar` |
| `government_id_number` | String, at least 30 characters | The number of the selected document. Preserve letters and leading zeroes. |

Display labels: PAN, Driving Licence, Aadhaar. Candidates select one ID type and supply its number.

Aadhaar input accepts 12 digits entered continuously or in groups separated by spaces or hyphens. The frontend removes these separators before validation and submission, so the API receives the 12 digits only.

Government ID verification now happens in the final Photo & ID form step for both manual registration and resume review. The frontend scans the selected image through the existing `upload_doc` endpoint and requires the scanned number to match the entered number before completing registration. Changing the ID type or image clears verification; changing the number requires it to match the scan again.

The final candidate update sends both new fields for all three types, together with the profile photo and personal details. For PAN it also sends `pan_card_number` for compatibility. For Driving Licence and Aadhaar it omits `pan_card_number`. Validate the selected ID type and number on the server, save both fields to the candidate, and return an explicit failure if they cannot be saved. Do not store a Driving Licence or Aadhaar number in the PAN field. Intermediate profile saves do not submit identification fields.

Resume upload now comes first and sends only the existing multipart parameters: `file`, `primary_email`, `stage`, and optional `job_record_id`. It does not send `government_id_type`, `government_id_number`, or `pan_card_number`. Remove any unconditional identification requirement in `index.php?entryPoint=hrc&type=resume_parsing`, and return the existing `success: true` envelope after the candidate and resume have been persisted.

## How did you find us?

Add these exact stored values to the candidate `stage` dropdown used by the resume endpoint:

| Display label | Stored value |
| --- | --- |
| Walk-in | `New Candidate -> Walkin` |
| Job portal | `New Candidate -> Via Portal` |
| Institute | `New Candidate -> Institute` |
| Campus drive | `New Candidate -> Campus Drive` |
| LinkedIn | `New Candidate -> LinkedIn` |
| Instagram | `New Candidate -> Instagram` |
| Facebook | `New Candidate -> Facebook` |
| YouTube | `New Candidate -> YouTube` |
| Employee referral | `New Candidate -> Employee Referral` |

Retain historical `New Candidate -> Direct` records. The new form no longer offers Direct. The referral selector starts empty so candidates make a deliberate selection.

## Validation rules

Both manual registration and resume review use five steps: Personal details, Skills, Experience, Education, and Photo & ID. A profile photo and verified government ID are required in the final step. Education loads the candidate's `hrc_education` relationship for review and editing. If there are no linked education records, it falls back to the education section embedded in the candidate's resume description. Linked records take precedence to avoid duplicating parsed education. New education entries are created using the existing candidate relationship field; existing entries are updated by ID.

After a successful resume parse, Personal details becomes the starting point. The form hides Back to options and records a candidate-specific `resume-pending` UI preference, so reloading opens the form directly until registration is completed. Intermediate saves retain this preference. Candidates can still move back between form steps to review their details.

Each added education entry requires an education title. A parsed qualification supplies the title when the name is empty. Degree / qualification, institution, university, school / college, board, specialization, percentage / grade, start and end year / date (`from_time` / `to_time`), status, and description remain editable and optional. Education dates accept the existing text format, including years and Present. Candidates can continue without adding education. No new backend fields are introduced.

Personal details require first name, last name, account email, phone, date of birth, gender, professional title, street address, city, state, postal code, country, and About you. LinkedIn and GitHub URLs remain optional. Profile addresses without a protocol automatically receive `https://` when leaving the field and before saving. About you requires at least 50 characters after trimming whitespace.

Each added skill requires a name; `total_years_total_months` is optional and may be omitted or left blank. Each work experience requires `joining_date` and `leaving_date`, unless the candidate explicitly selects Currently working here. Current employment uses an empty `leaving_date`, preserving the existing API schema; the UI-only checkbox is not sent as a CRM field. Dates cannot be in the future, and the end date cannot precede the start date. Candidates with no roles must explicitly confirm that they have no work experience. This confirmation does not introduce a new CRM field.

Apply equivalent validation in the backend if these rules must also be enforced for other API clients. No production data was changed as part of this frontend update.
