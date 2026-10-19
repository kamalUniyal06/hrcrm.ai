// Country and state/region lookups for the candidate address form. The data
// (country-region-data, MIT) is loaded on demand so it stays out of the main
// bundle. Countries are [name, code, [[regionName, regionCode], ...]].

export const DEFAULT_COUNTRY = "India";

// Names that resumes and older records use but the data set spells differently.
const countryAliases = {
  usa: "US", us: "US", "united states of america": "US", america: "US",
  uk: "GB", "great britain": "GB", britain: "GB", england: "GB", scotland: "GB", wales: "GB",
  uae: "AE", emirates: "AE",
  bharat: "IN", ind: "IN", hindustan: "IN",
  "south korea": "KR", korea: "KR", "north korea": "KP",
};
const regionAliases = {
  IN: {
    orissa: "Odisha", pondicherry: "Puducherry", uttaranchal: "Uttarakhand",
    "new delhi": "Delhi", "nct of delhi": "Delhi", "national capital territory of delhi": "Delhi",
    "j&k": "Jammu and Kashmir", "jammu & kashmir": "Jammu and Kashmir",
  },
};

export function normalizePlace(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^the /, "");
}

let displayNames;
function commonCountryName(code) {
  try {
    displayNames ||= new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code);
  } catch {
    return "";
  }
}

const indexes = new WeakMap();
function countryIndex(countries) {
  let index = indexes.get(countries);
  if (index) return index;
  index = new Map();
  const byCode = new Map(countries.map((country) => [country[1], country]));
  for (const country of countries) {
    index.set(normalizePlace(country[0]), country);
    index.set(normalizePlace(country[1]), country);
  }
  // Common English names ("Russia", "South Korea", "Czechia") never replace a data-set name.
  for (const country of countries) {
    const common = normalizePlace(commonCountryName(country[1]));
    if (common && !index.has(common)) index.set(common, country);
  }
  for (const [alias, code] of Object.entries(countryAliases)) {
    if (byCode.has(code)) index.set(alias, byCode.get(code));
  }
  indexes.set(countries, index);
  return index;
}

export function findCountry(countries, value) {
  if (!countries?.length || !normalizePlace(value)) return null;
  return countryIndex(countries).get(normalizePlace(value)) || null;
}

export function findRegion(country, value) {
  const wanted = normalizePlace(value);
  if (!country || !wanted) return null;
  const alias = regionAliases[country[1]]?.[wanted];
  const target = alias ? normalizePlace(alias) : wanted;
  return country[2].find(([name, code]) => normalizePlace(name) === target || normalizePlace(code) === target) || null;
}

// Fills in the default country and rewrites recognised spellings ("IN",
// "orissa") to the names the dropdowns use. Returns only the changed fields,
// or null when nothing needs to change.
export function canonicalAddress(draft, countries) {
  if (!countries?.length) return null;
  const patch = {};
  const countryValue = draft.primary_address_country?.trim() || "";
  const country = findCountry(countries, countryValue || DEFAULT_COUNTRY);
  if (country && country[0] !== countryValue) patch.primary_address_country = country[0];
  const region = findRegion(country, draft.primary_address_state);
  if (region && region[0] !== draft.primary_address_state) patch.primary_address_state = region[0];
  return Object.keys(patch).length ? patch : null;
}

// Keeps the state only when it belongs to the newly selected country.
export function addressForCountry(draft, countries, countryName) {
  const country = findCountry(countries, countryName);
  const region = findRegion(country, draft.primary_address_state);
  return {
    primary_address_country: countryName,
    primary_address_state: region ? region[0] : "",
  };
}

let loading;
export function loadCountries() {
  loading ||= import("country-region-data")
    .then((module) => module.allCountries)
    .catch((error) => {
      loading = undefined;
      throw error;
    });
  return loading;
}
