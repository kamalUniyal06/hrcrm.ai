import { lazy, Suspense, useEffect, useState } from "react";
import { Download, ExternalLink, Eye, FileText } from "lucide-react";

const PdfResumePreview = lazy(() => import("./PdfResumePreview"));

export default function ResumePreview({ file }) {
  const [preview, setPreview] = useState(null);
  const isPdf = /\.pdf$/i.test(file.name);

  useEffect(() => {
    // Set the MIME type explicitly for files uploaded without browser metadata.
    const document = isPdf ? file.slice(0, file.size, "application/pdf") : file;
    const url = URL.createObjectURL(document);
    setPreview({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file, isPdf]);

  const url = preview?.file === file ? preview.url : null;
  const linkClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

  return (
    <section aria-label="Resume preview" className="w-full min-w-0 text-left">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          <Eye size={17} className="text-primary" aria-hidden="true" /> Resume preview
        </h2>
        {url && (isPdf ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Open full preview <ExternalLink size={15} aria-hidden="true" />
          </a>
        ) : (
          <a href={url} download={file.name} className={linkClass}>
            Download resume <Download size={15} aria-hidden="true" />
          </a>
        ))}
      </div>
      {url ? isPdf ? (
        <Suspense fallback={<p role="status" className="py-12 text-center text-sm text-muted-foreground">Loading resume preview…</p>}>
          <PdfResumePreview key={url} file={file} />
        </Suspense>
      ) : (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 py-6 text-center">
          <FileText size={32} className="text-primary" aria-hidden="true" />
          <p className="text-sm font-medium">Word document selected</p>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            Download your resume to review it in Word, or choose a PDF for an inline preview.
          </p>
        </div>
      ) : (
        <p role="status" className="py-12 text-center text-sm text-muted-foreground">Preparing resume preview…</p>
      )}
    </section>
  );
}
