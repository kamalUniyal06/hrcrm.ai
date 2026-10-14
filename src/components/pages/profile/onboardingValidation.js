export const ABOUT_MIN_LENGTH = 50;

export const requiredPersonalFields = {
  first_name: "First name",
  last_name: "Last name",
  email1: "Email",
  phone_mobile: "Phone number",
  dob: "Date of birth",
  gender: "Gender",
  current_designation: "Professional title",
  primary_address_street: "Street address",
  primary_address_city: "City",
  primary_address_state: "State",
  primary_address_postalcode: "Postal code",
  primary_address_country: "Country",
  description: "About you",
};

export const governmentIdTypes = {
  pan: {
    label: "PAN",
    hint: "Enter 5 letters, 4 digits, and 1 letter, for example ABCDE1234F.",
    placeholder: "ABCDE1234F",
    maxLength: 10,
  },
  driving_licence: {
    label: "Driving Licence",
    hint: "Enter the licence number as printed on your document.",
    placeholder: "As printed on your licence",
    maxLength: 30,
  },
  aadhaar: {
    label: "Aadhaar",
    hint: "Enter 12 digits. Spaces or hyphens between groups are accepted.",
    placeholder: "1234 5678 9012",
    maxLength: 14,
  },
};

export const candidateSources = [
  ["Walk-in", "Walkin"],
  ["Job portal", "Via Portal"],
  ["Institute", "Institute"],
  ["Campus drive", "Campus Drive"],
  ["LinkedIn", "LinkedIn"],
  ["Instagram", "Instagram"],
  ["Facebook", "Facebook"],
  ["YouTube", "YouTube"],
  ["Employee referral", "Employee Referral"],
].map(([label, value]) => ({ label, value: `New Candidate -> ${value}` }));

export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function normalizeProfileUrl(value = "") {
  const url = value.trim();
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;
  return `https://${url}`;
}

export function validatePersonalDetails(draft) {
  const errors = {};
  for (const [key, label] of Object.entries(requiredPersonalFields)) {
    if (!String(draft[key] || "").trim()) errors[key] = `${label} is required.`;
  }
  if (draft.phone_mobile && !/^\+?[\d\s().-]+$/.test(draft.phone_mobile.trim()))
    errors.phone_mobile = "Enter a valid phone number.";
  if (
    draft.phone_mobile &&
    (draft.phone_mobile.replace(/\D/g, "").length < 7 ||
      draft.phone_mobile.replace(/\D/g, "").length > 15)
  )
    errors.phone_mobile =
      "Enter a phone number with 7 to 15 digits, including the country code if needed.";
  if (draft.dob && (!isCalendarDate(draft.dob) || draft.dob > localToday()))
    errors.dob = "Enter a valid date of birth that is not in the future.";
  if (draft.description && draft.description.trim().length < ABOUT_MIN_LENGTH)
    errors.description = `Write at least ${ABOUT_MIN_LENGTH} characters about your background, skills, or career interests.`;
  for (const key of ["linkedin_url", "github_url"]) {
    if (!draft[key]?.trim()) continue;
    try {
      const url = new URL(normalizeProfileUrl(draft[key]));
      if (
        !["http:", "https:"].includes(url.protocol) ||
        !url.hostname.includes(".")
      )
        throw new Error();
    } catch {
      errors[key] = "Enter a valid profile address, or leave this field blank.";
    }
  }
  return errors;
}

export function normalizeGovernmentId(type, number) {
  const value = number.trim().toUpperCase();
  return type === "aadhaar" ? value.replace(/[\s-]/g, "") : value;
}

export function governmentIdError(type, number) {
  const value = normalizeGovernmentId(type, number);
  if (!governmentIdTypes[type]) return "Choose a government ID type.";
  if (!value) return `Enter your ${governmentIdTypes[type].label} number.`;
  if (type === "pan" && !/^[A-Z]{5}\d{4}[A-Z]$/.test(value))
    return "Enter a valid PAN: 5 letters, 4 digits, and 1 letter.";
  if (type === "aadhaar" && !/^\d{12}$/.test(value))
    return "Enter a 12-digit Aadhaar number.";
  if (type === "driving_licence" && !/^[A-Z0-9][A-Z0-9 /-]{4,29}$/.test(value))
    return "Enter 5 to 30 characters using letters, numbers, spaces, slashes, or hyphens.";
  return "";
}

export function governmentIdFields(type, number) {
  const error = governmentIdError(type, number);
  if (error) throw new Error(error);
  const normalized = normalizeGovernmentId(type, number);
  return {
    government_id_type: type,
    government_id_number: normalized,
    ...(type === "pan" ? { pan_card_number: normalized } : {}),
  };
}

export function validateRelatedEntries(section, rows, noExperience = false) {
  if (section === "experiences" && !rows.length && !noExperience)
    return {
      index: -1,
      message:
        "Add your work experience or select that you have no work experience yet.",
    };
  for (const [index, row] of rows.entries()) {
    if (!row.name?.trim())
      return {
        index,
        field: "name",
        message: `Enter ${section === "education" ? "an education title" : section === "skills" ? "a skill" : "a role / job title"} for entry ${index + 1}.`,
      };
    if (section === "experiences") {
      if (!row.joining_date)
        return {
          index,
          field: "joining_date",
          message: `Add a start date for ${row.name}.`,
        };
      if (!row.currentlyWorking && !row.leaving_date)
        return {
          index,
          field: "leaving_date",
          message: `Add an end date for ${row.name}, or select “Currently working here”.`,
        };
      if (
        !isCalendarDate(row.joining_date) ||
        (!row.currentlyWorking && !isCalendarDate(row.leaving_date))
      )
        return {
          index,
          field: !isCalendarDate(row.joining_date)
            ? "joining_date"
            : "leaving_date",
          message: "Enter a valid employment date.",
        };
      if (
        row.joining_date > localToday() ||
        (!row.currentlyWorking && row.leaving_date > localToday())
      )
        return {
          index,
          field:
            row.joining_date > localToday() ? "joining_date" : "leaving_date",
          message: "Work experience dates cannot be in the future.",
        };
      if (!row.currentlyWorking && row.leaving_date < row.joining_date)
        return {
          index,
          field: "leaving_date",
          message: "End date must be on or after the start date.",
        };
    }
  }
  return null;
}
