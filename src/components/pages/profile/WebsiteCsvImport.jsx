import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "react-toastify";
import { fetchGpc } from "../../../services/api";
import { getMappableWebsiteFields } from "./profileUtils";

function WebsiteCsvImport({ disabled, onImportSuccess }) {
  const [step, setStep] = useState("idle");
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const fileRef = useRef(null);

  const reset = () => {
    setStep("idle");
    setFile(null);
    setPreviewData(null);
    setMapping({});
    setError(null);
    fileRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are allowed.");
      setStep("error");
      return;
    }

    setError(null);
    setFile(selected);
    fileRef.current = selected;
    setStep("previewing");

    try {
      const formData = new FormData();
      formData.append("file", selected, selected.name);
      const json = await fetchGpc({
        method: "POST",
        params: { type: "get_json" },
        body: formData,
      });

      if (!json.success) {
        throw new Error(json.message || json.error || "Preview failed");
      }

      setPreviewData(json);
      const autoMap = {};
      getMappableWebsiteFields(json.available_fields).forEach((field) => {
        if (json.data?.includes(field.label)) autoMap[field.key] = field.label;
        else if (json.data?.includes(field.key)) autoMap[field.key] = field.key;
      });
      setMapping(autoMap);
      setStep("mapping");
    } catch (err) {
      setError(err.message || "Failed to read CSV. Please try again.");
      setStep("error");
    }
  };

  const handleImport = async () => {
    const currentFile = fileRef.current;
    if (!currentFile) return;

    setError(null);
    setStep("importing");
    try {
      const freshFile = new File([currentFile], currentFile.name, {
        type: "text/csv",
      });
      const formData = new FormData();
      formData.append("file", freshFile, freshFile.name);
      formData.append(
        "data",
        new Blob([JSON.stringify(mapping)], { type: "text/plain" }),
      );

      const json = await fetchGpc({
        method: "POST",
        params: { type: "get_json", upload: 1 },
        body: formData,
      });

      if (!json.success) {
        throw new Error(json.message || json.error || "Import failed");
      }

      await onImportSuccess?.();
      toast.success(
        json.count
          ? `${json.count} websites imported successfully`
          : "Websites imported successfully",
      );
      reset();
    } catch (err) {
      setError(err.message || "Import failed. Please try again.");
      setStep("mapping");
    }
  };

  const fields = previewData
    ? getMappableWebsiteFields(previewData.available_fields)
    : [];
  const csvColumns = previewData?.data ?? [];
  const showModal = step !== "idle";

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={disabled || step === "previewing" || step === "importing"}
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Upload size={16} />
        Import CSV
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-black text-slate-950">
                  {step === "mapping" ? "Map CSV Columns" : "Import Websites"}
                </p>
                {file && (
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {file.name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={reset}
                disabled={step === "importing"}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5">
              {error && (
                <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                  {error}
                </div>
              )}

              {step === "previewing" && (
                <div className="py-10 text-center">
                  <Loader2
                    size={26}
                    className="mx-auto mb-3 animate-spin text-indigo-600"
                  />
                  <p className="text-sm font-black text-slate-800">
                    Reading CSV...
                  </p>
                </div>
              )}

              {step === "mapping" && (
                <>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                      {previewData?.total_rows ?? 0} rows
                    </span>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      {Object.keys(mapping).length} fields mapped
                    </span>
                  </div>

                  <div className="mb-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                    {fields.map((field) => (
                      <div
                        key={field.key}
                        className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[1fr_1fr] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-slate-800">
                            {field.label}
                            {field.required && (
                              <span className="ml-1 text-red-400">*</span>
                            )}
                          </p>
                          <p className="truncate font-mono text-[10px] text-slate-400">
                            {field.key}
                          </p>
                        </div>
                        <select
                          value={mapping[field.key] ?? ""}
                          onChange={(event) =>
                            setMapping((prev) => {
                              const next = { ...prev };
                              if (event.target.value) {
                                next[field.key] = event.target.value;
                              } else {
                                delete next[field.key];
                              }
                              return next;
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
                        >
                          <option value="">Skip</option>
                          {csvColumns.map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={reset}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-500 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleImport}
                      disabled={Object.keys(mapping).length === 0}
                      className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Import
                    </button>
                  </div>
                </>
              )}

              {step === "importing" && (
                <div className="py-10 text-center">
                  <Loader2
                    size={26}
                    className="mx-auto mb-3 animate-spin text-indigo-600"
                  />
                  <p className="text-sm font-black text-slate-800">
                    Importing websites...
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WebsiteCsvImport;
