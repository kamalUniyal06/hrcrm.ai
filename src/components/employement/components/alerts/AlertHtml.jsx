import { useEffect, useMemo, useRef, useState } from "react";
import { sanitizeAlertHtml } from "./alertUi";

const themeToken = (name, fallback) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

// A complete page for the iframe. Alerts are often pasted email templates, so they are
// rendered apart from the app: Tailwind's reset can't flatten their headings and lists, and
// their own <style> rules can't leak into the app. Colors and font follow the active theme.
function templateDocument(html) {
  const font = getComputedStyle(document.body).fontFamily || "system-ui, sans-serif";
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><style>
html { overflow-y: hidden; }
body { margin: 0; display: flow-root; background: ${themeToken("--card", "white")}; color: ${themeToken("--card-foreground", "black")}; font: 14px/1.6 ${font}; overflow-wrap: anywhere; }
body > :first-child { margin-top: 0; }
body > :last-child { margin-bottom: 0; }
img, video { max-width: 100%; height: auto; }
a { color: ${themeToken("--primary", "blue")}; }
</style></head><body>${html}</body></html>`;
}

// Sandboxed: no scripts run, links open in a new tab. The frame grows to fit its content.
function TemplateFrame({ html, title }) {
  const frameRef = useRef(null);
  const observerRef = useRef(null);
  const [height, setHeight] = useState(80);
  const srcDoc = useMemo(() => templateDocument(html), [html]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  const handleLoad = () => {
    const body = frameRef.current?.contentDocument?.body;
    if (!body) return;
    const measure = () => setHeight(Math.ceil(body.scrollHeight));
    measure();
    observerRef.current?.disconnect();
    if (typeof ResizeObserver !== "undefined") {
      observerRef.current = new ResizeObserver(measure);
      observerRef.current.observe(body);
    }
  };

  return (
    <iframe
      ref={frameRef}
      title={title}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      onLoad={handleLoad}
      className="block w-full border-0"
      style={{ height }}
    />
  );
}

/** An alert or announcement body, rendered as designed. */
export default function AlertHtml({ description, title, emptyText = "No details were added." }) {
  const html = useMemo(() => sanitizeAlertHtml(description), [description]);
  if (!html) return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  return <TemplateFrame html={html} title={title} />;
}
