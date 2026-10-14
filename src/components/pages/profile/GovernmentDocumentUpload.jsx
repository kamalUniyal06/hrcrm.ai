import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { onboardingStyles as styles } from "./onboardingStyles";
import { useEffect, useRef, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Check, FileImage, Loader2, ScanLine, UploadCloud, X } from "lucide-react";

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
  // Verifying is the next action once an image is chosen, so it takes the primary style.
  const verifyIsNext = !!file && !matches && !previewFailed;

  return (
    <div className="border-t border-border pt-6">
      <label htmlFor="government-document-file" className={styles.label}>{label} document <span className="text-primary">*</span></label>
      <p id="government-document-hint" className={styles.help}>Use a clear image with the ID number visible. JPG, PNG, or WEBP, up to 10 MB.</p>
      <div
        role="group"
        aria-label={`Upload ${label} document`}
        aria-busy={scanning}
        className={cn(
          "relative mt-4 rounded-2xl border-2 border-dashed border-border bg-card/60 p-4 transition-[border-color,background-color,scale] duration-200 hover:border-primary/40 hover:bg-accent/40 motion-reduce:transition-none sm:p-5",
          showDropHint && "scale-[1.01] border-primary bg-accent",
          matches && "border-solid border-[var(--employee-green)]/40 bg-[var(--employee-green-soft)]/50",
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
          <Motion.span
            aria-hidden="true"
            animate={file ? { y: 0, scale: 1 } : showDropHint ? { y: -4, scale: 1.1 } : { y: [0, -4, 0], scale: 1 }}
            transition={file || showDropHint
              ? { type: "spring", stiffness: 300, damping: 16 }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-accent text-primary shadow-sm"
          >
            {file ? <FileImage size={22} /> : <UploadCloud size={24} />}
          </Motion.span>
          <div className="min-w-0 flex-1 basis-40">
            <p className="break-all text-sm font-medium">{showDropHint ? "Drop your ID image here" : file ? file.name : "Drag and drop your ID image"}</p>
            <p className="mt-1 text-xs text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${scanning ? "Verification in progress" : "Drop another image to replace it"}` : "Or choose an image from your device."}</p>
          </div>
          {file && <button type="button" aria-label="Remove selected ID document" disabled={scanning} onClick={() => onFileChange(null)} className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-50"><X size={18} /></button>}
          <button type="button" disabled={scanning} onClick={() => input.current?.click()} className={cn(styles.secondary, "bg-card")}>
            <UploadCloud size={16} aria-hidden="true" /> {file ? "Replace image" : "Choose image"}
          </button>
        </div>
        <input ref={input} id="government-document-file" type="file" accept=".jpg,.jpeg,.png,.webp"
          aria-describedby="government-document-hint government-document-status" className="sr-only" tabIndex={-1} disabled={scanning}
          onChange={(event) => { if (event.target.files?.[0]) onFileChange(event.target.files[0]); event.target.value = ""; }} />
      </div>
      <Motion.button
        type="button"
        onClick={onScan}
        disabled={!file || scanning || previewFailed}
        whileTap={verifyIsNext && !scanning ? { scale: 0.98 } : undefined}
        className={cn(
          verifyIsNext ? styles.primary : styles.secondary,
          "group/cta relative mt-4 w-full overflow-hidden sm:w-auto",
          verifyIsNext && !scanning && "shadow-[0_14px_30px_-16px_color-mix(in_srgb,var(--primary)_80%,transparent)]",
        )}
      >
        {verifyIsNext && <span aria-hidden="true" className={cn(styles.shine, "group-disabled/cta:hidden")} />}
        {scanning ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <ScanLine size={16} aria-hidden="true" />}
        {scanning ? "Verifying ID…" : scanned ? "Verify again" : "Verify ID"}
      </Motion.button>
      <div id="government-document-status" role="status" aria-live="polite" aria-atomic="true">
        {scanning ? (
          <p className={styles.help}>Scanning your document to verify your ID. Keep this page open.</p>
        ) : error ? (
          <p className={cn(styles.help, `text-destructive`)}>{error}</p>
        ) : matches ? (
          <Motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-3 flex items-center gap-2.5 rounded-xl border border-[var(--employee-green)]/25 bg-[var(--employee-green-soft)] px-3 py-2.5 text-sm font-medium text-[var(--employee-green)]"
          >
            <Motion.span
              aria-hidden="true"
              initial={reducedMotion ? false : { scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 16, delay: 0.1 }}
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--employee-green)] text-white"
            >
              <Check size={14} strokeWidth={3} />
            </Motion.span>
            ID verified. You can continue.
          </Motion.p>
        ) : scanned ? (
          <p className={cn(styles.help, "text-destructive")}>We couldn't verify this ID. Check the entered number and use the correct document, then try again.</p>
        ) : (
          <p className={styles.help}>Verify your ID to complete registration.</p>
        )}
      </div>
    </div>
  );
}
