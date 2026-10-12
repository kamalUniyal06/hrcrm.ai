import test from "node:test";
import assert from "node:assert/strict";
import { experienceDateForInput } from "./experienceDates.js";

test("experience dates use day/month/year without swapping ambiguous days and months", () => {
  for (const [input, expected] of [
    ["01/03/2025", "2025-03-01"],
    ["03/01/2025", "2025-01-03"],
    ["25/12/2024", "2024-12-25"],
    [" 1/8/2023 ", "2023-08-01"],
    ["29/02/2024", "2024-02-29"],
    ["2024-12-25", "2024-12-25"],
    ["2024-12-25 00:00:00", "2024-12-25"],
    ["2024-12-25T23:00:00-05:00", "2024-12-25"],
    [null, ""], [undefined, ""], [" ", ""],
  ]) assert.equal(experienceDateForInput(input), expected);
});

test("invalid or unsupported experience dates are not silently reinterpreted", () => {
  for (const input of ["31/02/2024", "29/02/2023", "01/13/2024", "2024-02-30", "2024-02-30T00:00:00Z", "Present", "2024"])
    assert.equal(experienceDateForInput(input), input);
});
