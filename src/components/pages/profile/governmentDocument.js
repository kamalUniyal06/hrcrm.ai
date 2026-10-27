import { governmentIdError, normalizeGovernmentId } from "./onboardingValidation.js";
import { CRM_ENDPOINT } from "../../../services/crmUrl.js";

export const documentUploadUrl =
  `${CRM_ENDPOINT}?entryPoint=hrc&type=upload_doc`;

const documentTypes = { pan: "pan", aadhaar: "aadhaar", driving_licence: "dl" };

export function governmentDocumentFileError(file) {
  if (!file) return "Choose a government ID document to scan.";
  if (!/\.(jpe?g|png|webp)$/i.test(file.name))
    return "Choose a JPG, PNG, or WEBP image of your government ID.";
  if (!file.size || file.size > 10 * 1024 * 1024)
    return "Choose a non-empty government ID image up to 10 MB.";
  return "";
}

export function governmentDocumentNumbersMatch(type, entered, scanned) {
  if (typeof entered !== "string" || typeof scanned !== "string") return false;
  if (governmentIdError(type, entered) || governmentIdError(type, scanned)) return false;
  const canonical = (number) => {
    const normalized = normalizeGovernmentId(type, number);
    return type === "driving_licence" ? normalized.replace(/[\s/-]/g, "") : normalized;
  };
  return canonical(entered) === canonical(scanned);
}

export async function scanGovernmentDocument({ file, type, request, signal, apiKey }) {
  const fileError = governmentDocumentFileError(file);
  if (fileError) throw new Error(fileError);
  const documentType = documentTypes[type];
  if (!documentType) throw new Error("Choose a government ID type.");
  const body = new FormData();
  body.append("file", file, file.name);
  body.append("document_type", documentType);
  const response = await request(documentUploadUrl, {
    method: "POST",
    ...(apiKey ? { headers: { "x-api-key": apiKey } } : {}),
    body,
    signal,
  });
  let result;
  try { result = await response.json(); }
  catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error("The document scan returned an invalid response. Please try again.");
  }
  if (!response.ok || result?.success !== true)
    throw new Error(result?.message || "Unable to scan this document. Please try a clearer image.");
  if (result.document_type !== documentType)
    throw new Error("The scanned document type does not match your selection. Upload the correct ID.");
  if (typeof result.document_number !== "string" || governmentIdError(type, result.document_number))
    throw new Error("A valid document number could not be read. Please upload a clearer image.");
  return normalizeGovernmentId(type, result.document_number);
}
