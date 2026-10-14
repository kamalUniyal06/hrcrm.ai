import test from "node:test";
import assert from "node:assert/strict";
import { experienceDateForInput } from "./experienceDates.js";

test("browser experience dates use month/day/year without swapping ambiguous days and months", () => {
  for (const [input, expected] of [
    ["06/01/2025", "2025-06-01"],
    ["02/01/2026", "2026-02-01"],
    ["01/06/2025", "2025-01-06"],
    ["01/02/2026", "2026-01-02"],
    ["03/01/2025", "2025-03-01"],
    ["12/25/2024", "2024-12-25"],
    [" 1/8/2023 ", "2023-01-08"],
    ["02/29/2024", "2024-02-29"],
    ["2024-12-25", "2024-12-25"],
    ["2024-12-25 00:00:00", "2024-12-25"],
    ["2024-12-25T23:00:00-05:00", "2024-12-25"],
    [null, ""], [undefined, ""], [" ", ""],
  ]) assert.equal(experienceDateForInput(input), expected);
});

test("invalid or unsupported experience dates are not silently reinterpreted", () => {
  for (const input of ["02/31/2024", "02/29/2023", "13/01/2024", "25/12/2024", "2024-02-30", "2024-02-30T00:00:00Z", "Present", "2024"])
    assert.equal(experienceDateForInput(input), input);
});
