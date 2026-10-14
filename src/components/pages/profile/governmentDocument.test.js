import test from "node:test";
import assert from "node:assert/strict";
import {
  documentUploadUrl,
  governmentDocumentFileError,
  governmentDocumentNumbersMatch,
  scanGovernmentDocument,
} from "./governmentDocument.js";

const file = () => new File(["sample image"], "id.webp", { type: "image/webp" });
const reply = (data, ok = true) => ({ ok, json: async () => data });

test("scans each supported document with the endpoint's multipart contract", async () => {
  for (const [type, apiType, number] of [
    ["pan", "pan", "ABCDE1234F"],
    ["aadhaar", "aadhaar", "222222222222"],
    ["driving_licence", "dl", "TN192023004769"],
  ]) {
    const signal = new AbortController().signal;
    const numberRead = await scanGovernmentDocument({
      file: file(), type, signal, apiKey: "test-key",
      request: async (url, options) => {
        assert.equal(url, documentUploadUrl);
        assert.equal(options.method, "POST");
        assert.equal(options.signal, signal);
        assert.equal(options.headers["x-api-key"], "test-key");
        assert.equal(options.headers["Content-Type"], undefined);
        assert.equal(options.body.get("document_type"), apiType);
        assert.equal(options.body.get("file").name, "id.webp");
        assert.deepEqual([...options.body.keys()], ["file", "document_type"]);
        return reply({ success: true, document_type: apiType, document_number: number });
      },
    });
    assert.equal(numberRead, number);
  }
});

test("matching tolerates case and document formatting without accepting different numbers", () => {
  assert.equal(governmentDocumentNumbersMatch("pan", "abcde1234f", "ABCDE1234F"), true);
  assert.equal(governmentDocumentNumbersMatch("aadhaar", "2222-2222-2222", "2222 2222 2222"), true);
  assert.equal(governmentDocumentNumbersMatch("driving_licence", "TN-19/2023 004769", "TN192023004769"), true);
  assert.equal(governmentDocumentNumbersMatch("pan", "ABCDE1234F", "ABCDE1235F"), false);
  assert.equal(governmentDocumentNumbersMatch("aadhaar", "222222222222", "222222222223"), false);
  assert.equal(governmentDocumentNumbersMatch("driving_licence", "TN192023004769", "TN192023004768"), false);
  assert.equal(governmentDocumentNumbersMatch("pan", "", ""), false);
  assert.equal(governmentDocumentNumbersMatch("pan", "ABCDE1234F", undefined), false);
  assert.equal(governmentDocumentNumbersMatch("aadhaar", "invalid", "invalid"), false);
});

test("empty, oversized, and unsupported files are rejected before sending", async () => {
  for (const invalid of [null, new File([], "id.png"), new File(["test"], "id.exe"), { name: "id.jpg", size: 10 * 1024 * 1024 + 1 }]) {
    assert.ok(governmentDocumentFileError(invalid));
    await assert.rejects(scanGovernmentDocument({ file: invalid, type: "pan", request: () => assert.fail("Must not send an invalid file") }));
  }
  assert.equal(governmentDocumentFileError(file()), "");
});

test("unknown document types are rejected before sending", async () => {
  await assert.rejects(scanGovernmentDocument({ file: file(), type: "passport", request: () => assert.fail("Must not send an unsupported type") }), /Choose a government ID type/);
});

test("unsuccessful scans, wrong types and unreadable numbers never verify a document", async () => {
  for (const result of [
    { success: false, message: "No document found" },
    { success: true, document_type: "aadhaar", document_number: "222222222222" },
    { success: true, document_type: "pan", document_number: "" },
    { success: true, document_type: "pan" },
    { success: true, document_type: "pan", document_number: "not a PAN" },
    { success: true, document_type: "pan", document_number: 1234567890 },
  ]) {
    await assert.rejects(scanGovernmentDocument({ file: file(), type: "pan", request: async () => reply(result) }));
  }
  await assert.rejects(scanGovernmentDocument({ file: file(), type: "pan", request: async () => reply({ success: true, document_type: "pan", document_number: "ABCDE1234F" }, false) }));
});

test("invalid JSON, network failures and cancellation remain retryable errors", async () => {
  await assert.rejects(scanGovernmentDocument({ file: file(), type: "pan", request: async () => ({ ok: true, json: async () => { throw new SyntaxError(); } }) }), /invalid response/);
  await assert.rejects(scanGovernmentDocument({ file: file(), type: "pan", request: async () => { throw new Error("Network failure"); } }), /Network failure/);
  await assert.rejects(scanGovernmentDocument({ file: file(), type: "pan", request: async () => { throw new DOMException("Aborted", "AbortError"); } }), { name: "AbortError" });
  await assert.rejects(scanGovernmentDocument({ file: file(), type: "pan", request: async () => ({ ok: true, json: async () => { throw new DOMException("Aborted", "AbortError"); } }) }), { name: "AbortError" });
});
