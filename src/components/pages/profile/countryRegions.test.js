import test from "node:test";
import assert from "node:assert/strict";
import {
  addressForCountry,
  canonicalAddress,
  findCountry,
  findRegion,
  loadCountries,
} from "./countryRegions.js";

const countries = await loadCountries();

test("countries match by name, code, common name, and alias", () => {
  for (const [input, expected] of [
    ["India", "IN"],
    [" india ", "IN"],
    ["IN", "IN"],
    ["Bharat", "IN"],
    ["U.S.A.", "US"],
    ["United States of America", "US"],
    ["UK", "GB"],
    ["Russia", "RU"],
    ["South Korea", "KR"],
    ["Cote d'Ivoire", "CI"],
  ]) {
    assert.equal(findCountry(countries, input)?.[1], expected, input);
  }
  assert.equal(findCountry(countries, "Atlantis"), null);
  assert.equal(findCountry(countries, ""), null);
});

test("regions match by name, code, and older spellings within their country", () => {
  const india = findCountry(countries, "India");
  assert.equal(findRegion(india, "west bengal")?.[0], "West Bengal");
  assert.equal(findRegion(india, "KA")?.[0], "Karnataka");
  assert.equal(findRegion(india, "Orissa")?.[0], "Odisha");
  assert.equal(findRegion(india, "New Delhi")?.[0], "Delhi");
  assert.equal(findRegion(india, "California"), null);
  assert.equal(findRegion(null, "Delhi"), null);
});

test("an empty country defaults to India and parsed spellings become dropdown values", () => {
  assert.deepEqual(canonicalAddress({ primary_address_country: "", primary_address_state: "" }, countries), {
    primary_address_country: "India",
  });
  assert.deepEqual(canonicalAddress({ primary_address_country: "IN", primary_address_state: "orissa" }, countries), {
    primary_address_country: "India",
    primary_address_state: "Odisha",
  });
  assert.equal(canonicalAddress({ primary_address_country: "India", primary_address_state: "Goa" }, countries), null);
  // Unrecognised values are left for the candidate to fix, not replaced.
  assert.equal(canonicalAddress({ primary_address_country: "Atlantis", primary_address_state: "Delhi" }, countries), null);
});

test("changing country keeps the state only when it belongs to the new country", () => {
  const draft = { primary_address_country: "India", primary_address_state: "Kerala" };
  assert.deepEqual(addressForCountry(draft, countries, "United States"), {
    primary_address_country: "United States",
    primary_address_state: "",
  });
  assert.deepEqual(addressForCountry({ primary_address_state: "NY" }, countries, "United States"), {
    primary_address_country: "United States",
    primary_address_state: "New York",
  });
});
