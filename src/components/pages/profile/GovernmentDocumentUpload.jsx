import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { onboardingStyles as styles } from "./onboardingStyles";
import { useEffect, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import { FileImage, Loader2, ScanLine, ShieldCheck, UploadCloud, X } from "lucide-react";

export default function GovernmentDocumentUpload({
  label, file, scanning, scanned, matches, error, onFileChange, onScan,
}) {
  const input = useRef(null);
  const dragDepth = useRef(0);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [failedPreview, setFailedPreview] = useState(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewUrl = preview?.file === file ? preview.url : null;
  const previewFailed = !!file && failedPreview === file;
  const showDropHint = dragging && !scanning;

  return (
    <div className="border-t border-border pt-6">
      <label htmlFor="government-document-file" className={styles.label}>{label} document <span className="text-primary">*</span></label>
      <p id="government-document-hint" className={styles.help}>Use a clear image with the ID number visible. JPG, PNG, or WEBP, up to 10 MB.</p>
      <div
        role="group"
        aria-label={`Upload ${label} document`}
        aria-busy={scanning}
        className={cn(
          "relative mt-4 border-y border-dashed border-border py-5 transition-colors duration-150 motion-reduce:transition-none",
          showDropHint && "border-primary bg-accent",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          if (scanning || !Array.from(event.dataTransfer.types).includes("Files")) return;
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = scanning ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (!dragDepth.current) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setDragging(false);
          if (!scanning && event.dataTransfer.files?.[0]) {
            onFileChange(event.dataTransfer.files[0]);
          }
        }}
      >
        {file && previewUrl && !previewFailed && (
          <Motion.figure
            key={previewUrl}
            aria-label={`${label} document preview`}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto mb-5 max-w-sm overflow-hidden rounded-lg bg-muted"
          >
            <img
              src={previewUrl}
              alt={`Preview of selected ${label} document`}
              className="aspect-[1.586] w-full object-contain"
              onError={() => setFailedPreview(file)}
            />
            {scanning && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
                <div className="absolute inset-0 bg-primary/5" />
                <Motion.div
                  key={reducedMotion ? "still" : "scanning"}
                  data-testid="id-scan-line"
                  initial={false}
                  animate={{ y: reducedMotion ? "0%" : ["-50%", "50%"] }}
                  transition={reducedMotion
                    ? { duration: 0 }
                    : { duration: 2.2, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
                  className="absolute inset-0 bg-linear-to-b from-transparent via-primary/15 to-transparent"
                >
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-primary shadow-[0_0_12px_var(--primary)]" />
                </Motion.div>
                <span className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-primary">
                  <ScanLine size={14} /> Scanning ID
                </span>
              </div>
            )}
          </Motion.figure>
        )}
        {previewFailed && <p className="mb-4 text-sm text-destructive">This image could not be previewed. Choose another JPG, PNG, or WEBP image.</p>}
        <div className="flex flex-wrap items-center gap-3">
          {file ? <FileImage size={22} className="shrink-0 text-primary" aria-hidden="true" /> : <UploadCloud size={26} className="shrink-0 text-primary" aria-hidden="true" />}
          <div className="min-w-0 flex-1 basis-40">
            <p className="break-all text-sm font-medium">{showDropHint ? "Drop your ID image here" : file ? file.name : "Drag and drop your ID image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${scanning ? "Verification in progress" : "Drop another image to replace it"}` : "Or choose an image from your device."}</p>
          </div>
          {file && <button type="button" aria-label="Remove selected ID document" disabled={scanning} onClick={() => onFileChange(null)} className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-50"><X size={18} /></button>}
          <button type="button" disabled={scanning} onClick={() => input.current?.click()} className={styles.secondary}>
            <UploadCloud size={16} aria-hidden="true" /> {file ? "Replace image" : "Choose image"}
          </button>
        </div>
        <input ref={input} id="government-document-file" type="file" accept=".jpg,.jpeg,.png,.webp"
          aria-describedby="government-document-hint government-document-status" className="sr-only" tabIndex={-1} disabled={scanning}
          onChange={(event) => { if (event.target.files?.[0]) onFileChange(event.target.files[0]); event.target.value = ""; }} />
      </div>
      <button type="button" onClick={onScan} disabled={!file || scanning || previewFailed} className={cn(styles.secondary, "mt-4 w-full sm:w-auto")}>
        {scanning ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ScanLine size={16} aria-hidden="true" />}
        {scanning ? "Verifying ID…" : scanned ? "Verify again" : "Verify ID"}
      </button>
      <div id="government-document-status" role="status" aria-live="polite" aria-atomic="true">
        {scanning ? (
          <p className={styles.help}>Scanning your document to verify your ID. Keep this page open.</p>
        ) : error ? (
          <p className={cn(styles.help, `text-destructive`)}>{error}</p>
        ) : matches ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-[var(--employee-green)]"><ShieldCheck size={16} aria-hidden="true" /> ID verified. You can continue.</p>
        ) : scanned ? (
          <p className={cn(styles.help, "text-destructive")}>We couldn't verify this ID. Check the entered number and use the correct document, then try again.</p>
        ) : (
          <p className={styles.help}>Verify your ID to continue to your resume.</p>
        )}
      </div>
    </div>
  );
}
