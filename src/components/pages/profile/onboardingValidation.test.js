import test from "node:test";
import assert from "node:assert/strict";
import {
  ABOUT_MIN_LENGTH,
  candidateSources,
  governmentIdError,
  governmentIdFields,
  normalizeGovernmentId,
  normalizeProfileUrl,
  requiredPersonalFields,
  validatePersonalDetails,
  validateRelatedEntries,
} from "./onboardingValidation.js";

const completePersonal = () => ({
  first_name: "Sam",
  last_name: "Kumar",
  email1: "sam@example.com",
  phone_mobile: "+91 98765 43210",
  dob: "1995-05-15",
  gender: "Prefer not to say",
  current_designation: "Software developer",
  primary_address_street: "12 Example Road",
  primary_address_city: "Delhi",
  primary_address_state: "Delhi",
  primary_address_postalcode: "110001",
  primary_address_country: "India",
  description: "A".repeat(ABOUT_MIN_LENGTH),
  linkedin_url: "",
  github_url: "",
});

test("social profile addresses get HTTPS automatically and remain optional", () => {
  for (const [input, expected] of [
    ["linkedin.com/in/ramxcodes", "https://linkedin.com/in/ramxcodes"],
    [" github.com/ramxcodes ", "https://github.com/ramxcodes"],
    ["//github.com/ramxcodes", "https://github.com/ramxcodes"],
    ["https://linkedin.com/in/ramxcodes", "https://linkedin.com/in/ramxcodes"],
    ["http://github.com/ramxcodes", "http://github.com/ramxcodes"],
    ["   ", ""],
  ])
    assert.equal(normalizeProfileUrl(input), expected);
  assert.deepEqual(
    validatePersonalDetails({
      ...completePersonal(),
      linkedin_url: "linkedin.com/in/ramxcodes",
      github_url: "github.com/ramxcodes",
    }),
    {},
  );
  for (const input of [
    "javascript:alert(1)",
    "ftp://github.com/name",
    "not a link",
    "https://",
  ]) {
    assert.ok(
      validatePersonalDetails({ ...completePersonal(), github_url: input })
        .github_url,
    );
  }
});

test("personal information is required while social links remain optional", () => {
  assert.deepEqual(validatePersonalDetails(completePersonal()), {});
  for (const key of Object.keys(requiredPersonalFields)) {
    assert.ok(
      validatePersonalDetails({ ...completePersonal(), [key]: "   " })[key],
      key,
    );
  }
  assert.ok(
    validatePersonalDetails({
      ...completePersonal(),
      linkedin_url: "javascript:alert(1)",
    }).linkedin_url,
  );
  assert.deepEqual(
    validatePersonalDetails({
      ...completePersonal(),
      github_url: "https://github.com/example",
    }),
    {},
  );
});

test("About you counts meaningful characters, not padding", () => {
  assert.ok(
    validatePersonalDetails({
      ...completePersonal(),
      description: `  ${"A".repeat(ABOUT_MIN_LENGTH - 1)}  `,
    }).description,
  );
  assert.equal(
    validatePersonalDetails({
      ...completePersonal(),
      description: `  ${"A".repeat(ABOUT_MIN_LENGTH)}  `,
    }).description,
    undefined,
  );
});

test("invalid phone numbers and future dates of birth cannot pass", () => {
  for (const phone_mobile of ["123", "98765abc43210", "1".repeat(16)])
    assert.ok(
      validatePersonalDetails({ ...completePersonal(), phone_mobile })
        .phone_mobile,
    );
  assert.ok(
    validatePersonalDetails({ ...completePersonal(), dob: "2999-01-01" }).dob,
  );
  assert.ok(
    validatePersonalDetails({ ...completePersonal(), dob: "2020-02-30" }).dob,
  );
});

test("government ID validation depends on the selected document", () => {
  assert.equal(governmentIdError("pan", "abcde1234f"), "");
  assert.ok(governmentIdError("pan", "1234567890"));
  assert.equal(
    normalizeGovernmentId("aadhaar", "1234 5678 9012"),
    "123456789012",
  );
  assert.equal(governmentIdError("aadhaar", "1234 5678 9012"), "");
  assert.ok(governmentIdError("aadhaar", "12345678901A"));
  assert.equal(governmentIdError("driving_licence", "DL-0123456789012"), "");
  assert.ok(governmentIdError("unknown", "12345"));
});

test("the final identification save normalizes the selected ID and adds the legacy PAN field only for PAN", () => {
  assert.deepEqual(governmentIdFields("pan", " abcde1234f "), {
    government_id_type: "pan",
    government_id_number: "ABCDE1234F",
    pan_card_number: "ABCDE1234F",
  });
  assert.deepEqual(governmentIdFields("aadhaar", "2222-2222-2222"), {
    government_id_type: "aadhaar",
    government_id_number: "222222222222",
  });
  assert.deepEqual(governmentIdFields("driving_licence", " dl-0123456789012 "), {
    government_id_type: "driving_licence",
    government_id_number: "DL-0123456789012",
  });
  assert.throws(() => governmentIdFields("pan", "1234567890"), /valid PAN/);
  assert.throws(() => governmentIdFields("unknown", "12345"), /government ID type/);
});

test("Aadhaar accepts grouped numbers and sends only the twelve digits", () => {
  for (const number of [
    "222222222222",
    "2222 2222 2222",
    "2222-2222-2222",
    " 2222-2222-2222 ",
  ]) {
    assert.equal(governmentIdError("aadhaar", number), "");
    assert.equal(normalizeGovernmentId("aadhaar", number), "222222222222");
  }
  for (const number of [
    "2222-2222-222",
    "2222-2222-22222",
    "2222-2222-222A",
    "2222.2222.2222",
  ]) {
    assert.ok(governmentIdError("aadhaar", number));
  }
  assert.equal(
    normalizeGovernmentId("driving_licence", "DL-0123456789012"),
    "DL-0123456789012",
  );
});

test("experience requires dates or explicit current employment, including parsed records", () => {
  const role = {
    name: "Developer",
    joining_date: "2020-01-01",
    leaving_date: "2021-01-01",
  };
  assert.equal(validateRelatedEntries("experiences", [role]), null);
  assert.equal(
    validateRelatedEntries("experiences", [{ ...role, joining_date: "" }])
      .field,
    "joining_date",
  );
  assert.equal(
    validateRelatedEntries("experiences", [{ ...role, leaving_date: "" }])
      .field,
    "leaving_date",
  );
  assert.equal(
    validateRelatedEntries("experiences", [
      { ...role, leaving_date: "", currentlyWorking: true },
    ]),
    null,
  );
  assert.equal(
    validateRelatedEntries("experiences", [
      { ...role, leaving_date: "2019-01-01" },
    ]).field,
    "leaving_date",
  );
  assert.ok(
    validateRelatedEntries("experiences", [
      { ...role, joining_date: "2999-01-01", currentlyWorking: true },
    ]),
  );
  assert.ok(validateRelatedEntries("experiences", []));
  assert.equal(validateRelatedEntries("experiences", [], true), null);
});

test("skill duration is optional while the skill name remains required", () => {
  assert.equal(validateRelatedEntries("skills", []), null);
  assert.equal(
    validateRelatedEntries("skills", [
      { name: "JavaScript", total_years_total_months: "0 months" },
    ]),
    null,
  );
  assert.equal(
    validateRelatedEntries("skills", [
      { name: "JavaScript", total_years_total_months: " " },
    ]),
    null,
  );
  assert.equal(
    validateRelatedEntries("skills", [{ name: "JavaScript" }]),
    null,
  );
  assert.equal(
    validateRelatedEntries("skills", [
      { name: "JavaScript", total_years_total_months: "" },
    ]),
    null,
  );
  assert.equal(
    validateRelatedEntries("skills", [
      { name: "", total_years_total_months: "2 years" },
    ]).field,
    "name",
  );
});

test("referral values are unique and replace Direct with Walkin", () => {
  assert.equal(
    new Set(candidateSources.map((source) => source.value)).size,
    candidateSources.length,
  );
  assert.ok(
    candidateSources.some(
      (source) => source.value === "New Candidate -> Walkin",
    ),
  );
  assert.ok(
    candidateSources.some(
      (source) => source.value === "New Candidate -> LinkedIn",
    ),
  );
  assert.ok(!candidateSources.some((source) => /Direct/.test(source.value)));
});
