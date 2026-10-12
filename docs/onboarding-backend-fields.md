# Candidate onboarding: backend configuration

The frontend now supports these fields and dropdown values. The PHP `hrc` resume-parsing endpoint is not in this repository, so its changes must be applied in the backend before using the new ID options in production.

## Government identification

Add these fields to `hrc_candidates` and accept them in the multipart request to `index.php?entryPoint=hrc&type=resume_parsing`:

| Field | Type | Values |
| --- | --- | --- |
| `government_id_type` | Enum | `pan`, `driving_licence`, `aadhaar` |
| `government_id_number` | String, at least 30 characters | The number of the selected document. Preserve letters and leading zeroes. |

Display labels: PAN, Driving Licence, Aadhaar. Candidates select one ID type and supply its number.

Aadhaar input accepts 12 digits entered continuously or in groups separated by spaces or hyphens. The frontend removes these separators before validation and submission, so the API receives the 12 digits only.

The frontend sends both new fields for all three types. For PAN it also sends `pan_card_number` for compatibility. For Driving Licence and Aadhaar it omits `pan_card_number`; remove any unconditional PAN requirement in the resume endpoint. Validate the selected ID type and number on the server, save both fields to the candidate, and return an explicit failure if they cannot be saved. Do not store a Driving Licence or Aadhaar number in the PAN field.

Keep the existing multipart parameters: `file`, `primary_email`, `stage`, and optional `job_record_id`. Return the existing `success: true` envelope only after the candidate and identification fields have been persisted.

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

Personal details require first name, last name, account email, phone, date of birth, gender, professional title, street address, city, state, postal code, country, and About you. LinkedIn and GitHub URLs remain optional. Profile addresses without a protocol automatically receive `https://` when leaving the field and before saving. About you requires at least 50 characters after trimming whitespace.

Each added skill requires a name; `total_years_total_months` is optional and may be omitted or left blank. Each work experience requires `joining_date` and `leaving_date`, unless the candidate explicitly selects Currently working here. Current employment uses an empty `leaving_date`, preserving the existing API schema; the UI-only checkbox is not sent as a CRM field. Dates cannot be in the future, and the end date cannot precede the start date. Candidates with no roles must explicitly confirm that they have no work experience. This confirmation does not introduce a new CRM field.

Apply equivalent validation in the backend if these rules must also be enforced for other API clients. No production data was changed as part of this frontend update.
