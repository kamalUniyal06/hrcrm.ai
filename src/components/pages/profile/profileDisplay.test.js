import test from "node:test";
import assert from "node:assert/strict";
import {
  capitalize,
  displayUrl,
  experienceDuration,
  formatAddress,
  formatDateRange,
  formatProfileDate,
  isWebUrl,
  profileCompletion,
  relatedEntryView,
} from "./profileDisplay.js";

test("calendar dates are formatted and other values stay as entered", () => {
  assert.equal(formatProfileDate("2022-03-01"), "Mar 2022");
  assert.equal(formatProfileDate("2002-01-01", "full"), "1 January 2002");
  for (const value of ["2018", "Present", "2024-02-30"]) assert.equal(formatProfileDate(value), value);
  assert.equal(formatProfileDate(undefined), "");
});

test("date ranges show an ongoing label only after a start date", () => {
  assert.equal(formatDateRange("2022-03-01", "2024-01-15"), "Mar 2022 – Jan 2024");
  assert.equal(formatDateRange("2022-03-01", "", "Present"), "Mar 2022 – Present");
  assert.equal(formatDateRange("", "", "Present"), "");
  assert.equal(formatDateRange("", "2020"), "2020");
});

test("experience duration counts calendar months inclusively", () => {
  assert.equal(experienceDuration("2022-03-01", "2024-05-31"), "2 yrs 3 mos");
  assert.equal(experienceDuration("2024-01-10", "2024-01-20"), "1 mo");
  assert.equal(experienceDuration("2023-01-01", "2023-12-31"), "1 yr");
  assert.equal(experienceDuration("2024-01-01", "", "2024-06-15"), "6 mos");
  assert.equal(experienceDuration("2024-06-01", "2024-01-01"), "");
  assert.equal(experienceDuration("", "2024-01-01"), "");
});

test("text helpers tidy values for display", () => {
  assert.equal(capitalize("male"), "Male");
  assert.equal(displayUrl("https://www.linkedin.com/in/someone/"), "linkedin.com/in/someone");
  assert.equal(isWebUrl("https://github.com/someone"), true);
  assert.equal(isWebUrl("javascript:alert(1)"), false);
  assert.deepEqual(formatAddress({
    primary_address_street: "12 Park Street",
    primary_address_city: "Kolkata",
    primary_address_state: "West Bengal",
    primary_address_postalcode: "700016",
    primary_address_country: "India",
  }), ["12 Park Street", "Kolkata, West Bengal 700016", "India"]);
  assert.deepEqual(formatAddress({ primary_address_city: "Pune" }), ["Pune"]);
});

test("profile completion reports missing fields in order", () => {
  assert.deepEqual(profileCompletion({ first_name: "A", last_name: "B", email1: "a@b.co", phone_mobile: "123", current_designation: "Dev", primary_address_city: "X", description: " " }), {
    percent: 75,
    missing: [{ key: "description", label: "About you" }, { key: "profile_image", label: "Profile photo" }],
  });
  assert.equal(profileCompletion(null).percent, 0);
});

test("related entries drop empty and repeated details", () => {
  const experience = relatedEntryView("experiences", {
    name: "Developer", designation: "developer", company_name: "Acme", company_location: "",
    joining_date: "2022-03-01", leaving_date: "2023-02-28", description: "Built things", responsibilities: "Built things",
  });
  assert.equal(experience.title, "Developer");
  assert.deepEqual(experience.subtitle, ["Acme"]);
  assert.equal(experience.period, "Mar 2022 – Feb 2023");
  assert.equal(experience.duration, "1 yr");
  assert.deepEqual(experience.details, []);
  assert.deepEqual(experience.body, ["Built things"]);

  const education = relatedEntryView("education", { qualification: "B.Tech", institution: "IIT", percentage: "8.1", status: "completed" });
  assert.equal(education.title, "B.Tech");
  assert.deepEqual(education.details, [["Grade", "8.1"], ["Status", "Completed"]]);

  const skill = relatedEntryView("skills", { skill_name: "React", version: "18", total_years_total_months: "" });
  assert.equal(skill.title, "React");
  assert.deepEqual(skill.details, [["Version", "18"]]);
});
