import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { cn } from "@/lib/utils";

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfResumePreview({ file }) {
  const canvas = useRef(null);
  const textId = useId();
  const [document, setDocument] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [rendered, setRendered] = useState(null);
  const [failure, setFailure] = useState(null);
  const pdf = document?.file === file ? document.pdf : null;
  const error = failure?.file === file ? failure.message : "";
  const ready = rendered?.file === file && rendered.page === pageNumber;

  useEffect(() => {
    let active = true;
    let loadingTask;
    setPageNumber(1);

    async function load() {
      try {
        const data = new Uint8Array(await file.arrayBuffer());
        if (!active) return;
        loadingTask = getDocument({ data, isEvalSupported: false, useSystemFonts: true });
        const loaded = await loadingTask.promise;
        if (active) setDocument({ file, pdf: loaded });
      } catch (error) {
        if (active) setFailure({
          file,
          message: error.name === "PasswordException"
            ? "This PDF is password-protected. Open the full preview to unlock it, or choose an unlocked copy."
            : "We couldn't display this PDF. Open the full preview or choose another file.",
        });
      }
    }
    void load();
    return () => {
      active = false;
      void loadingTask?.destroy();
    };
  }, [file]);

  useEffect(() => {
    if (!pdf) return;
    let active = true;
    let renderTask;

    async function render() {
      try {
        const page = await pdf.getPage(pageNumber);
        if (!active || !canvas.current) return;
        const base = page.getViewport({ scale: 1 });
        const scale = (720 / base.width) * Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });
        const target = canvas.current;
        target.width = Math.ceil(viewport.width);
        target.height = Math.ceil(viewport.height);
        renderTask = page.render({ canvasContext: target.getContext("2d"), viewport });
        await renderTask.promise;
        const content = await page.getTextContent().catch(() => null);
        if (active) setRendered({
          file, page: pageNumber,
          text: content?.items.map(item => item.str || "").join(" ") || "",
        });
      } catch (error) {
        if (active && error.name !== "RenderingCancelledException") {
          setFailure({ file, message: "This page couldn't be displayed. Open the full preview to review your resume." });
        }
      }
    }
    void render();
    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, file]);

  const pageButton = "grid size-11 place-items-center rounded-lg text-primary hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:text-muted-foreground disabled:opacity-40";

  return (
    <div aria-busy={!ready && !error}>
      <div className="relative max-h-[420px] overflow-auto rounded-lg border border-border bg-muted p-2 sm:max-h-[520px] sm:p-3">
        {error ? (
          <div role="status" className="flex min-h-48 flex-col items-center justify-center gap-3 p-4 text-center">
            <FileText size={28} className="text-primary" aria-hidden="true" />
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">{error}</p>
          </div>
        ) : (
          <>
            {!ready && (
              <div role="status" className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Loading resume preview…
              </div>
            )}
            <canvas
              ref={canvas}
              role="img"
              aria-label={`Resume preview: ${file.name}, page ${pageNumber}${pdf ? ` of ${pdf.numPages}` : ""}`}
              aria-describedby={ready && rendered.text ? textId : undefined}
              className={cn("h-auto w-full", !ready && "hidden")}
            />
            {ready && <p id={textId} className="sr-only">{rendered.text}</p>}
          </>
        )}
      </div>
      {pdf && !error && (
        <nav aria-label="Resume preview pages" className="mt-2 flex items-center justify-center gap-3">
          <button type="button" aria-label="Previous resume page" disabled={!ready || pageNumber <= 1} onClick={() => setPageNumber(page => page - 1)} className={pageButton}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span role="status" aria-live="polite" className="text-xs tabular-nums text-muted-foreground">Page {pageNumber} of {pdf.numPages}</span>
          <button type="button" aria-label="Next resume page" disabled={!ready || pageNumber >= pdf.numPages} onClick={() => setPageNumber(page => page + 1)} className={pageButton}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </nav>
      )}
    </div>
  );
}
