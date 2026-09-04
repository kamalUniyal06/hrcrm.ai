import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { apiRequest } from "../services/api";
import { updateSeoLink } from "../store/Slices/orders";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getCurrentUser } from "../services/utils";

const escapeRegExp = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeAttr = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const buildAnchorPattern = (anchor) => {
  const value = String(anchor ?? "").trim();
  if (!value) return null;

  const escaped = escapeRegExp(value).replace(/\s+/g, "\\s+");
  const start = /^[A-Za-z0-9_]/.test(value) ? "\\b" : "";
  const end = /[A-Za-z0-9_]$/.test(value) ? "\\b" : "";
  return new RegExp(`${start}${escaped}${end}`, "i");
};

export default function GPCContentPopup({
  email,
  data,
  onClose,
  website,
  orderId,
  linkId,
  link,
  backlinks = [],
}) {
  const sections = data?.data?.humanizer_response?.sections || [];
  const highlightLines = useMemo(() => {
    const findHArray = (value, depth = 0) => {
      if (!value || depth > 5) return null;
      if (Array.isArray(value)) return null;
      if (typeof value !== "object") return null;

      if (
        Array.isArray(value.h) &&
        value.h.some((item) => typeof item === "string")
      ) {
        return value.h;
      }

      for (const child of Object.values(value)) {
        const found = findHArray(child, depth + 1);
        if (found) return found;
      }

      return null;
    };

    const raw =
      data?.data?.h ||
      data?.h ||
      data?.data?.humanizer_response?.h ||
      data?.humanizer_response?.h ||
      findHArray(data) ||
      [];
    return Array.isArray(raw) ? raw.filter(Boolean).map(String) : [];
  }, [data]);
  const aiScore = data?.data?.ai_score ?? 34;
  const humanizedScore = data?.data?.human_score.toFixed(2) ?? 66;
  const initialBacklinks = useMemo(() => {
    const source =
      Array.isArray(backlinks) && backlinks.length ? backlinks : [link];
    const seen = new Set();

    return source
      .filter(Boolean)
      .map((item, index) => ({
        id: item.id || `${item.anchor_text_c || "anchor"}-${index}`,
        anchor: String(item.anchor_text_c || "").trim(),
        url: String(item.backlink_url || "").trim(),
        type: item.link_type || "",
      }))
      .filter((item) => {
        const key = `${item.anchor}|${item.url}`;
        if (!item.anchor || !item.url || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [backlinks, link]);
  const [selected, setSelected] = useState({});
  const [prevSelected, setPrevSelected] = useState({});
  const [editableBacklinks, setEditableBacklinks] = useState([]);
  const [showBacklinkEditor, setShowBacklinkEditor] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [humanizingAll, setHumanizingAll] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [anchorPicker, setAnchorPicker] = useState(null);
  const finalOutputRef = useRef(null);
  const anchorPickerRef = useRef(null);
  const dispatch = useDispatch();
  const { user, businessEmail } = useSelector((state) => state.user);
  const currentUser = getCurrentUser();
  const gpcUserEmail =
    user?.email || currentUser?.description || businessEmail || "";
  // Dynamic publishing domain based on passed website
  const publishDomain = website
    ? website.replace(/^https?:\/\//, "").replace(/\/$/, "")
    : "www.mailsextract.com";

  useEffect(() => {
    // Merge incoming backlinks with any user edits already in local state so
    // that a Redux refresh (e.g. after publishing, which rewrites post_id on
    // the order) does not overwrite the anchor the user just picked from the
    // Final Output selector. We keep structural changes from the server
    // (added / removed backlinks) but preserve user-edited anchor + url.
    setEditableBacklinks((prev) => {
      if (!prev || prev.length === 0) return initialBacklinks;
      const prevById = new Map(prev.map((item) => [item.id, item]));
      return initialBacklinks.map((incoming) => {
        const existing = prevById.get(incoming.id);
        if (!existing) return incoming;
        return {
          ...incoming,
          anchor: existing.anchor,
          url: existing.url,
        };
      });
    });
  }, [initialBacklinks]);

  const finalOutputTextBlocks = useMemo(
    () =>
      sections.flatMap((sec, si) =>
        sec.items.map((item, ii) =>
          String(
            `${si}-${ii}` in selected
              ? selected[`${si}-${ii}`]
              : item.original_text,
          ),
        ),
      ),
    [sections, selected],
  );

  const backlinkStatuses = useMemo(
    () =>
      editableBacklinks.map((item) => {
        const pattern = buildAnchorPattern(item.anchor);
        const found =
          !!pattern && finalOutputTextBlocks.some((text) => pattern.test(text));
        const valid = Boolean(item.anchor && item.url);

        return {
          ...item,
          active: valid,
          found,
          valid,
          status: !valid ? "invalid" : found ? "ready" : "missing",
        };
      }),
    [editableBacklinks, finalOutputTextBlocks],
  );

  const activeBacklinks = useMemo(
    () => backlinkStatuses.filter((item) => item.valid && item.found),
    [backlinkStatuses],
  );

  const selectedMissingBacklinks = useMemo(
    () => backlinkStatuses.filter((item) => item.valid && !item.found),
    [backlinkStatuses],
  );

  const invalidBacklinks = useMemo(
    () => backlinkStatuses.filter((item) => !item.valid),
    [backlinkStatuses],
  );
  const hasBacklinkPublishBlockers =
    selectedMissingBacklinks.length > 0 || invalidBacklinks.length > 0;

  const updateBacklink = (id, field, value) => {
    setEditableBacklinks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
    setIsDirty(true);
  };

  const setValue = useCallback((key, val, currentSelected) => {
    const current = currentSelected ?? null;
    setPrevSelected((p) => ({ ...p, [key]: current }));
    setSelected((prev) => ({ ...prev, [key]: val }));
    setIsDirty(true);
  }, []);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const undoKey = (key) => {
    if (!(key in prevSelected)) return;
    setSelected((prev) => ({ ...prev, [key]: prevSelected[key] }));
    setPrevSelected((prev) => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  };

  const canUndo = (key) => key in prevSelected;

  const getVal = (key, fallback) =>
    key in selected ? selected[key] : fallback;

  const undoAll = () => {
    setSelected({});
    setPrevSelected({});
    setIsDirty(true);
  };

  const normalizeText = useCallback((text) => {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = String(text ?? "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&#160;/g, " ");
    return textarea.value
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }, []);

  const highlightedKeys = useMemo(() => {
    const normalizedHighlights = highlightLines
      .map(normalizeText)
      .filter(Boolean);
    const keys = new Set();

    if (normalizedHighlights.length === 0) return keys;

    const isHighlighted = (text) => {
      const normalizedText = normalizeText(text);
      if (!normalizedText) return false;
      return normalizedHighlights.some(
        (line) =>
          normalizedText.includes(line) || line.includes(normalizedText),
      );
    };

    sections.forEach((sec, si) => {
      if (isHighlighted(sec.Original_heading)) {
        keys.add(`heading-${si}`);
      }
      sec.items.forEach((item, ii) => {
        if (isHighlighted(item.original_text)) {
          keys.add(`${si}-${ii}`);
        }
      });
    });

    return keys;
  }, [highlightLines, normalizeText, sections]);

  const humanizeAll = () => {
    setHumanizingAll(true);
    setTimeout(() => {
      setSelected((prev) => {
        const next = { ...prev };
        const nextPrev = { ...prevSelected };
        sections.forEach((sec, si) => {
          const hKey = `heading-${si}`;
          if (highlightedKeys.has(hKey)) {
            nextPrev[hKey] = hKey in prev ? prev[hKey] : sec.Original_heading;
            next[hKey] = sec.humanized_heading;
          }
          sec.items.forEach((item, ii) => {
            const key = `${si}-${ii}`;
            if (highlightedKeys.has(key)) {
              nextPrev[key] = key in prev ? prev[key] : item.original_text;
              next[key] = item.humanized_text;
            }
          });
        });
        setPrevSelected(nextPrev);
        return next;
      });
      if (highlightedKeys.size > 0) {
        setIsDirty(true);
      }
      setHumanizingAll(false);
    }, 400);
  };

  const closeAnchorPicker = useCallback(() => {
    setAnchorPicker(null);
    const sel = window.getSelection?.();
    if (sel && !sel.isCollapsed) sel.removeAllRanges();
  }, []);

  const assignAnchorToBacklink = useCallback(
    (backlinkId, newAnchor) => {
      const cleaned = String(newAnchor ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (!cleaned) return;
      setEditableBacklinks((prev) =>
        prev.map((item) =>
          item.id === backlinkId ? { ...item, anchor: cleaned } : item,
        ),
      );
      setIsDirty(true);
      closeAnchorPicker();
    },
    [closeAnchorPicker],
  );

  // Detect text selection inside the Final Output column and show a
  // floating picker that lets the user assign that text as the anchor
  // for any backlink in the order.
  useEffect(() => {
    const handleMouseUp = (event) => {
      // Ignore clicks/releases on the picker itself.
      if (
        anchorPickerRef.current &&
        anchorPickerRef.current.contains(event.target)
      ) {
        return;
      }

      const container = finalOutputRef.current;
      if (!container) return;

      const selection = window.getSelection?.();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setAnchorPicker(null);
        return;
      }

      const range = selection.getRangeAt(0);
      if (
        !container.contains(range.startContainer) ||
        !container.contains(range.endContainer)
      ) {
        setAnchorPicker(null);
        return;
      }

      const text = selection.toString().replace(/\s+/g, " ").trim();
      if (!text) {
        setAnchorPicker(null);
        return;
      }

      const rect = range.getBoundingClientRect();
      setAnchorPicker({
        text,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left + rect.width / 2,
      });
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Dismiss the picker on Escape, scroll inside the column, or window resize.
  useEffect(() => {
    if (!anchorPicker) return;

    const handleKey = (event) => {
      if (event.key === "Escape") closeAnchorPicker();
    };
    const handleDismiss = () => closeAnchorPicker();
    const handleMouseDown = (event) => {
      if (
        anchorPickerRef.current &&
        anchorPickerRef.current.contains(event.target)
      ) {
        return;
      }
      closeAnchorPicker();
    };

    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleDismiss);
    document.addEventListener("mousedown", handleMouseDown);
    const column = finalOutputRef.current;
    column?.addEventListener("scroll", handleDismiss);

    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleDismiss);
      document.removeEventListener("mousedown", handleMouseDown);
      column?.removeEventListener("scroll", handleDismiss);
    };
  }, [anchorPicker, closeAnchorPicker]);

  const applyBacklinksToText = (text, usedBacklinkIds) => {
    let output = String(text ?? "");

    activeBacklinks.forEach((backlink) => {
      if (usedBacklinkIds.has(backlink.id)) return;

      const pattern = buildAnchorPattern(backlink.anchor);
      if (!pattern) return;
      if (!pattern.test(output)) return;

      output = output.replace(
        pattern,
        (match) =>
          `<a href="${escapeAttr(backlink.url)}" target="_blank" rel="noopener">${match}</a>`,
      );
      usedBacklinkIds.add(backlink.id);
    });

    return output;
  };

  const buildFinalContent = () => {
    let html = "";
    let title = "";
    const usedBacklinkIds = new Set();
    sections.forEach((sec, si) => {
      const headingText = getVal(`heading-${si}`, sec.Original_heading);
      if (si === 0 && sec.tag_name === "h1") title = headingText;
      const tag = sec.tag_name || "h2";
      html += `<${tag}>${headingText}</${tag}>`;
      sec.items.forEach((item, ii) => {
        const text = applyBacklinksToText(
          getVal(`${si}-${ii}`, item.original_text),
          usedBacklinkIds,
        );
        const t = item.tag_name || "p";
        html +=
          t === "li" ? `<ul><li>${text}</li></ul>` : `<${t}>${text}</${t}>`;
      });
    });
    return { title: title || "My Blog Post", content: html };
  };

  const handleLiveNow = async () => {
    setPublishing(true);
    setPublishedUrl(null);
    try {
      if (!gpcUserEmail) {
        toast.error(
          "Could not verify the current GPC user for WordPress authorization.",
        );
        return;
      }

      if (hasBacklinkPublishBlockers) {
        if (invalidBacklinks.length > 0) {
          toast.error("Complete backlink details");
          setShowBacklinkEditor(true);
          return;
        }

        const anchors = selectedMissingBacklinks
          .slice(0, 3)
          .map((item) => `"${item.anchor}"`)
          .join(", ");
        const extra =
          selectedMissingBacklinks.length > 3
            ? ` and ${selectedMissingBacklinks.length - 3} more`
            : "";
        toast.error(`Missing anchor: ${anchors}${extra}`);
        setShowBacklinkEditor(true);
        return;
      }

      const { title, content } = buildFinalContent();
      const result = await apiRequest({
        endpoint: `https://${publishDomain}/wp-json/my-api/v1/create-post`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": "YOUR_SECRET_EXTRACT_HERE",
          "X-GPC-User-Email": gpcUserEmail,
        },
        body: JSON.stringify({
          title,
          content,
          status: "publish",
          gpc_user_email: gpcUserEmail,
        }),
      });
      if (result.success) {
        setPublishedUrl(result.url);
        setIsDirty(false);

        // Persist the post URL + any user-edited anchor/url back to the CRM.
        // `editableBacklinks` holds the current picker edits; we compare each
        // to the original record to avoid pointless writes, while also
        // making sure the primary link is updated even if nothing changed
        // so that post_id / assigned_user_link land on the order.
        const originalBacklinksArr =
          Array.isArray(backlinks) && backlinks.length
            ? backlinks
            : [link].filter(Boolean);
        const originalById = new Map(
          originalBacklinksArr.filter(Boolean).map((b) => [b.id, b]),
        );
        const primaryLinkId = link?.id;
        const dispatchedIds = new Set();

        editableBacklinks.forEach((edited) => {
          const original = originalById.get(edited.id);
          if (!original) return;

          const anchorChanged =
            String(original.anchor_text_c || "").trim() !==
            String(edited.anchor || "").trim();
          const urlChanged =
            String(original.backlink_url || "").trim() !==
            String(edited.url || "").trim();
          const isPrimary =
            primaryLinkId != null && edited.id === primaryLinkId;

          if (!anchorChanged && !urlChanged && !isPrimary) return;

          const payload = {
            ...original,
            anchor_text_c: edited.anchor,
            backlink_url: edited.url,
          };
          if (isPrimary) {
            payload.assigned_user_link = result.url;
            payload.post_id = result.url;
          }

          dispatchedIds.add(edited.id);
          dispatch(updateSeoLink(orderId, payload,email));
        });

        // Fallback: ensure the primary link still gets the post URL even if
        // it was deduplicated out of editableBacklinks.
        if (
          link &&
          primaryLinkId != null &&
          !dispatchedIds.has(primaryLinkId)
        ) {
          dispatch(
            updateSeoLink(orderId, {
              ...link,
              assigned_user_link: result.url,
              post_id: result.url,
            }),
          );
        }
      } else toast.error("Publishing failed. Please try again.");
    } catch (err) {
      toast.error(err?.message || "Publishing failed. Please try again.");
    } finally {
      setPublishing(false);
    }
  };

  const HighlightedText = ({ text }) => {
    const value = String(text ?? "");
    const lowerValue = value.toLowerCase();
    const matches = highlightLines
      .map((line) => String(line ?? "").trim())
      .filter(Boolean)
      .map((line) => {
        const index = lowerValue.indexOf(line.toLowerCase());
        return index >= 0 ? { index, length: line.length } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.index - b.index);

    const ranges = [];
    matches.forEach((match) => {
      const last = ranges[ranges.length - 1];
      if (!last || match.index >= last.index + last.length) {
        ranges.push(match);
      }
    });

    if (ranges.length === 0) {
      return (
        <mark className="rounded px-1 bg-yellow-300/90 text-slate-950">
          {value}
        </mark>
      );
    }

    const parts = [];
    let cursor = 0;
    ranges.forEach((range, i) => {
      if (cursor < range.index) {
        parts.push(value.slice(cursor, range.index));
      }
      parts.push(
        <mark
          key={`${range.index}-${i}`}
          className="rounded px-1 bg-yellow-300/90 text-slate-950"
        >
          {value.slice(range.index, range.index + range.length)}
        </mark>,
      );
      cursor = range.index + range.length;
    });
    if (cursor < value.length) {
      parts.push(value.slice(cursor));
    }

    return <>{parts}</>;
  };

  const renderContent = (tag, text, highlighted = false) => {
    const content = highlighted ? <HighlightedText text={text} /> : text;
    if (tag === "h1")
      return <p className="text-sm font-bold leading-snug">{content}</p>;
    if (tag === "h2")
      return <p className="text-sm font-semibold leading-snug">{content}</p>;
    if (tag === "li")
      return (
        <p className="text-sm leading-relaxed pl-3 border-l-2 border-current opacity-70">
          {content}
        </p>
      );
    return <p className="text-sm leading-relaxed">{content}</p>;
  };

  const renderLinkedPreviewText = (text, usedBacklinkIds) => {
    let parts = [String(text ?? "")];

    activeBacklinks.forEach((backlink) => {
      if (usedBacklinkIds.has(backlink.id)) return;

      const pattern = buildAnchorPattern(backlink.anchor);
      if (!pattern) return;

      let inserted = false;
      parts = parts.flatMap((part, index) => {
        if (inserted || typeof part !== "string") return [part];

        const match = part.match(pattern);
        if (!match || match.index === undefined) return [part];

        inserted = true;
        usedBacklinkIds.add(backlink.id);

        const before = part.slice(0, match.index);
        const matchedText = match[0];
        const after = part.slice(match.index + matchedText.length);

        return [
          before,
          <a
            key={`${backlink.id}-${index}`}
            href={backlink.url}
            target="_blank"
            rel="noopener noreferrer"
            title={backlink.url}
            onClick={(e) => {
              // Allow opening with Ctrl/Cmd-click, but otherwise keep
              // the click focused on text-selection inside the column.
              if (!(e.ctrlKey || e.metaKey)) e.preventDefault();
            }}
            className="rounded px-1 font-semibold text-emerald-200 underline decoration-emerald-400/70 underline-offset-2 cursor-text"
            style={{ background: "rgba(16,185,129,0.18)" }}
          >
            {matchedText}
          </a>,
          after,
        ].filter(Boolean);
      });
    });

    return <>{parts}</>;
  };

  const UndoBtn = ({ keyName }) => (
    <button
      onClick={() => undoKey(keyName)}
      title="Undo"
      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-150 text-xs
        ${canUndo(keyName)
          ? "bg-amber-100 text-amber-600 hover:bg-amber-200 cursor-pointer shadow-sm"
          : "opacity-0 pointer-events-none"
        }`}
    >
      ↩
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative w-full flex flex-col rounded-2xl overflow-hidden"
        style={{
          height: "88vh",
          background: "#0f0f13",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        }}
      >
        {/* ── HEADER ── */}
        <div
          className="flex items-center justify-between px-5 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-sm tracking-wide">
              Content Selector
            </span>
            <span
              className="text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{
                background:
                  aiScore > 50
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(34,197,94,0.15)",
                color: aiScore > 50 ? "#f87171" : "#4ade80",
                border: `1px solid ${aiScore > 50 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
              }}
            >
              AI {aiScore}%
            </span>
            <span
              className="text-xs font-medium px-2.5 py-0.5 rounded-full"
              style={{
                background:
                  aiScore > 50
                    ? "rgba(239,68,68,0.15)"
                    : "rgba(34,197,94,0.15)",
                color: aiScore > 50 ? "#f87171" : "#4ade80",
                border: `1px solid ${aiScore > 50 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
              }}
            >
              Humanized {humanizedScore}%
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {publishedUrl && (
              <div
                className="flex items-center gap-3 px-3 py-2 rounded-xl animate-fadeIn"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.15))",
                  border: "1px solid rgba(16,185,129,0.35)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                }}
              >
                {/* Success Icon */}
                <div className="w-7 h-7 flex items-center justify-center rounded-full bg-emerald-500/20">
                  <span className="text-emerald-400 text-sm">✓</span>
                </div>

                {/* Text */}
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] text-emerald-300 font-medium">
                    Blog Drafted Successfully
                  </span>
                  <span className="text-[10px] text-slate-400 truncate max-w-[180px]">
                    {publishedUrl}
                  </span>
                </div>

                {/* CTA Button */}
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150"
                  style={{
                    background: "rgba(59,130,246,0.2)",
                    color: "#93c5fd",
                    border: "1px solid rgba(59,130,246,0.35)",
                  }}
                >
                  View ↗
                </a>
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-150"
                  style={{
                    background: copied
                      ? "rgba(16,185,129,0.2)"
                      : "rgba(255,255,255,0.06)",
                    color: copied ? "#34d399" : "#cbd5f5",
                    border: copied
                      ? "1px solid rgba(16,185,129,0.4)"
                      : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            )}
            {/* Undo All */}
            <button
              onClick={undoAll}
              disabled={Object.keys(selected).length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                background:
                  Object.keys(selected).length === 0
                    ? "rgba(100,100,100,0.2)"
                    : "rgba(245,158,11,0.15)",
                color:
                  Object.keys(selected).length === 0 ? "#6b7280" : "#fbbf24",
                border:
                  Object.keys(selected).length === 0
                    ? "1px solid rgba(255,255,255,0.08)"
                    : "1px solid rgba(245,158,11,0.35)",
                cursor:
                  Object.keys(selected).length === 0
                    ? "not-allowed"
                    : "pointer",
                opacity: Object.keys(selected).length === 0 ? 0.6 : 1,
              }}
            >
              Undo all
            </button>

            {/* Humanize All */}
            <button
              onClick={humanizeAll}
              disabled={humanizingAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                background: humanizingAll
                  ? "rgba(139,92,246,0.3)"
                  : "rgba(139,92,246,0.18)",
                color: "#c4b5fd",
                border: "1px solid rgba(139,92,246,0.4)",
              }}
            >
              {humanizingAll ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                  Humanizing…
                </>
              ) : (
                <>✦ Humanize all</>
              )}
            </button>

            {/* Live Now */}
            <button
              onClick={
                hasBacklinkPublishBlockers
                  ? () => setShowBacklinkEditor(true)
                  : handleLiveNow
              }
              disabled={publishing || (publishedUrl && !isDirty)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                background:
                  publishing || (publishedUrl && !isDirty)
                    ? "rgba(100,100,100,0.2)"
                    : hasBacklinkPublishBlockers
                      ? "rgba(245,158,11,0.15)"
                      : "rgba(16,185,129,0.15)",
                color:
                  publishing || (publishedUrl && !isDirty)
                    ? "#6b7280"
                    : hasBacklinkPublishBlockers
                      ? "#fbbf24"
                      : "#34d399",
                border: hasBacklinkPublishBlockers
                  ? "1px solid rgba(245,158,11,0.35)"
                  : "1px solid rgba(16,185,129,0.35)",
                cursor:
                  publishing || (publishedUrl && !isDirty)
                    ? "not-allowed"
                    : "pointer",
                opacity: publishing || (publishedUrl && !isDirty) ? 0.6 : 1,
              }}
            >
              {publishing ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  Publishing…
                </>
              ) : publishedUrl && !isDirty ? (
                <>✓ Up to date</>
              ) : hasBacklinkPublishBlockers ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Fix backlinks
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live now
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── COLUMN HEADERS ── */}
        {editableBacklinks.length > 0 && (
          <div
            className="flex items-center justify-between gap-3 px-5 py-2.5 flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Backlinks
              </span>
              <span
                className="text-xs font-medium truncate"
                style={{
                  color: hasBacklinkPublishBlockers ? "#fbbf24" : "#6ee7b7",
                }}
              >
                {hasBacklinkPublishBlockers
                  ? `${selectedMissingBacklinks.length + invalidBacklinks.length} need update`
                  : `${activeBacklinks.length} ready`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowBacklinkEditor(true)}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition"
              style={{
                background: hasBacklinkPublishBlockers
                  ? "rgba(245,158,11,0.15)"
                  : "rgba(16,185,129,0.14)",
                color: hasBacklinkPublishBlockers ? "#fbbf24" : "#86efac",
                border: hasBacklinkPublishBlockers
                  ? "1px solid rgba(245,158,11,0.35)"
                  : "1px solid rgba(16,185,129,0.28)",
              }}
            >
              Edit backlinks
            </button>
          </div>
        )}

        <div
          className="grid grid-cols-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          {[
            { label: "Original", color: "#60a5fa", dot: "#3b82f6" },
            { label: "Final Output", color: "#a3e635", dot: "#84cc16" },
            { label: "Humanized", color: "#c084fc", dot: "#a855f7" },
          ].map(({ label, color, dot }, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold tracking-widest uppercase"
              style={{
                color,
                borderRight:
                  i < 2 ? "1px solid rgba(255,255,255,0.07)" : "none",
                background: i === 1 ? "rgba(255,255,255,0.02)" : "transparent",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: dot }}
              />
              {label}
            </div>
          ))}
        </div>

        {/* ── 3-COLUMN BODY ── */}
        <div className="grid grid-cols-3 flex-1 overflow-hidden">
          {/* ORIGINAL */}
          <div
            className="overflow-y-auto px-4 py-4 space-y-4"
            style={{ borderRight: "1px solid rgba(255,255,255,0.07)" }}
          >
            {sections.map((sec, si) => (
              <div key={si}>
                {(() => {
                  const key = `heading-${si}`;
                  const highlighted = highlightedKeys.has(key);
                  return (
                    <div
                      className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg"
                      style={{
                        background: highlighted
                          ? "rgba(250,204,21,0.13)"
                          : "rgba(96,165,250,0.07)",
                        border: highlighted
                          ? "1px solid rgba(250,204,21,0.35)"
                          : "1px solid rgba(96,165,250,0.12)",
                      }}
                    >
                      <div className="flex-1 text-blue-200">
                        {renderContent(
                          sec.tag_name,
                          sec.Original_heading,
                          highlighted,
                        )}
                      </div>
                    </div>
                  );
                })()}
                {sec.items.map((item, ii) =>
                  (() => {
                    const key = `${si}-${ii}`;
                    const highlighted = highlightedKeys.has(key);
                    return (
                      <div
                        key={ii}
                        className="flex items-start gap-2 mb-2 px-3 py-2.5 rounded-lg group"
                        style={{
                          background: highlighted
                            ? "rgba(250,204,21,0.1)"
                            : "rgba(255,255,255,0.03)",
                          border: highlighted
                            ? "1px solid rgba(250,204,21,0.32)"
                            : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex-1 text-slate-300">
                          {renderContent(
                            item.tag_name,
                            item.original_text,
                            highlighted,
                          )}
                        </div>
                        <button
                          onClick={() =>
                            setValue(
                              `${si}-${ii}`,
                              item.original_text,
                              getVal(`${si}-${ii}`, item.original_text),
                            )
                          }
                          className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                          style={{
                            background: "rgba(96,165,250,0.15)",
                            color: "#93c5fd",
                            border: "1px solid rgba(96,165,250,0.25)",
                          }}
                        >
                          Use
                        </button>
                      </div>
                    );
                  })(),
                )}
              </div>
            ))}
          </div>

          {/* FINAL OUTPUT */}
          <div
            ref={finalOutputRef}
            className="overflow-y-auto px-4 py-4 space-y-4 select-text"
            style={{
              borderRight: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.015)",
            }}
          >
            {(() => {
              const previewUsedBacklinkIds = new Set();

              return sections.map((sec, si) => {
                const hKey = `heading-${si}`;
                const hVal = getVal(hKey, sec.Original_heading);
                return (
                  <div key={si}>
                    <div
                      className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg"
                      style={{
                        background: "rgba(163,230,53,0.07)",
                        border: "1px solid rgba(163,230,53,0.15)",
                      }}
                    >
                      <div className="flex-1 text-lime-200">
                        {renderContent(sec.tag_name, hVal)}
                      </div>
                      <UndoBtn keyName={hKey} />
                    </div>
                    {sec.items.map((item, ii) => {
                      const key = `${si}-${ii}`;
                      const val = getVal(key, item.original_text);
                      return (
                        <div
                          key={ii}
                          className="flex items-start gap-2 mb-2 px-3 py-2.5 rounded-lg"
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(163,230,53,0.1)",
                          }}
                        >
                          <div className="flex-1 text-slate-200">
                            {renderContent(
                              item.tag_name,
                              renderLinkedPreviewText(
                                val,
                                previewUsedBacklinkIds,
                              ),
                            )}
                          </div>
                          <UndoBtn keyName={key} />
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>

          {/* HUMANIZED */}
          <div className="overflow-y-auto px-4 py-4 space-y-4">
            {sections.map((sec, si) => (
              <div key={si}>
                <div
                  className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg group"
                  style={{
                    background: "rgba(192,132,252,0.07)",
                    border: "1px solid rgba(192,132,252,0.12)",
                  }}
                >
                  <div className="flex-1 text-purple-200">
                    {renderContent(sec.tag_name, sec.humanized_heading)}
                  </div>
                  <button
                    onClick={() =>
                      setValue(
                        `heading-${si}`,
                        sec.humanized_heading,
                        getVal(`heading-${si}`, sec.Original_heading),
                      )
                    }
                    className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                    style={{
                      background: "rgba(192,132,252,0.15)",
                      color: "#d8b4fe",
                      border: "1px solid rgba(192,132,252,0.3)",
                    }}
                  >
                    Use
                  </button>
                </div>
                {sec.items.map((item, ii) => (
                  <div
                    key={ii}
                    className="flex items-start gap-2 mb-2 px-3 py-2.5 rounded-lg group"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="flex-1 text-slate-300">
                      {renderContent(item.tag_name, item.humanized_text)}
                    </div>
                    <button
                      onClick={() =>
                        setValue(
                          `${si}-${ii}`,
                          item.humanized_text,
                          getVal(`${si}-${ii}`, item.original_text),
                        )
                      }
                      className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity font-medium"
                      style={{
                        background: "rgba(192,132,252,0.15)",
                        color: "#d8b4fe",
                        border: "1px solid rgba(192,132,252,0.3)",
                      }}
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {anchorPicker &&
          (() => {
            const PICKER_WIDTH = 320;
            const PICKER_HEIGHT_GUESS = 60 + editableBacklinks.length * 56;
            const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
            const vh = typeof window !== "undefined" ? window.innerHeight : 800;
            const left = Math.max(
              12,
              Math.min(
                vw - PICKER_WIDTH - 12,
                anchorPicker.left - PICKER_WIDTH / 2,
              ),
            );
            const showAbove = anchorPicker.top > PICKER_HEIGHT_GUESS + 16;
            const top = showAbove
              ? Math.max(12, anchorPicker.top - PICKER_HEIGHT_GUESS - 10)
              : Math.min(
                vh - PICKER_HEIGHT_GUESS - 12,
                anchorPicker.bottom + 10,
              );

            return (
              <div
                ref={anchorPickerRef}
                className="fixed z-60 rounded-xl shadow-2xl"
                style={{
                  top,
                  left,
                  width: PICKER_WIDTH,
                  background: "#15161c",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 18px 48px rgba(0,0,0,0.55)",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div
                  className="px-3.5 py-2.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                      Assign anchor to backlink
                    </span>
                    <button
                      type="button"
                      onClick={closeAnchorPicker}
                      className="w-5 h-5 rounded text-slate-400 hover:text-white"
                      style={{ background: "rgba(255,255,255,0.05)" }}
                      title="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div
                    className="mt-1.5 truncate text-xs font-semibold text-emerald-200"
                    title={anchorPicker.text}
                  >
                    “{anchorPicker.text}”
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto py-1">
                  {editableBacklinks.length === 0 ? (
                    <div className="px-3.5 py-4 text-xs text-slate-400">
                      No backlinks on this order yet.
                    </div>
                  ) : (
                    editableBacklinks.map((bl) => {
                      const status = backlinkStatuses.find(
                        (s) => s.id === bl.id,
                      );
                      const isCurrent =
                        (status?.anchor || "").trim().toLowerCase() ===
                        anchorPicker.text.toLowerCase();
                      const dotColor =
                        status?.status === "ready"
                          ? "#34d399"
                          : status?.status === "invalid"
                            ? "#f87171"
                            : "#fbbf24";

                      return (
                        <button
                          key={bl.id}
                          type="button"
                          disabled={isCurrent}
                          onClick={() =>
                            assignAnchorToBacklink(bl.id, anchorPicker.text)
                          }
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left transition-colors"
                          style={{
                            opacity: isCurrent ? 0.55 : 1,
                            cursor: isCurrent ? "default" : "pointer",
                            background: "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!isCurrent)
                              e.currentTarget.style.background =
                                "rgba(255,255,255,0.05)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <span
                            className="mt-1 h-2 w-2 shrink-0 rounded-full"
                            style={{ background: dotColor }}
                            title={status?.status || ""}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-100">
                              {bl.anchor || (
                                <span className="italic text-slate-500">
                                  No anchor yet
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[11px] text-slate-400">
                              {bl.url || "Missing URL"}
                            </div>
                          </div>
                          {isCurrent ? (
                            <span className="shrink-0 text-[10px] font-semibold text-emerald-300">
                              CURRENT
                            </span>
                          ) : (
                            <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                              Use →
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

        {showBacklinkEditor && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/55 px-4">
            <div
              className="w-full max-w-3xl rounded-2xl overflow-hidden"
              style={{
                background: "#111217",
                border: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
              }}
            >
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
              >
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Edit backlinks
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Anchor must match Final Output.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBacklinkEditor(false)}
                  className="w-8 h-8 rounded-lg text-sm"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  ×
                </button>
              </div>

              <div className="max-h-[58vh] overflow-y-auto p-5 space-y-4">
                {backlinkStatuses.map((backlink, index) => {
                  const missing = backlink?.status === "missing";
                  const invalid = backlink?.status === "invalid";
                  const ready = backlink?.status === "ready";

                  return (
                    <div
                      key={backlink.id}
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(255,255,255,0.035)",
                        border: ready
                          ? "1px solid rgba(16,185,129,0.25)"
                          : "1px solid rgba(245,158,11,0.35)",
                      }}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Backlink {index + 1}
                        </span>
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color: ready
                              ? "#6ee7b7"
                              : invalid
                                ? "#fca5a5"
                                : "#fbbf24",
                          }}
                        >
                          {ready
                            ? "Ready"
                            : invalid
                              ? "Incomplete"
                              : "Anchor missing"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.3fr] gap-3">
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-400">
                            Anchor text
                          </span>
                          <input
                            value={backlink.anchor}
                            onChange={(event) =>
                              updateBacklink(
                                backlink.id,
                                "anchor",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              color: "#e5e7eb",
                              border:
                                missing || invalid
                                  ? "1px solid rgba(245,158,11,0.45)"
                                  : "1px solid rgba(255,255,255,0.1)",
                            }}
                          />
                        </label>

                        <label className="block">
                          <span className="mb-1 block text-xs font-medium text-slate-400">
                            Backlink URL
                          </span>
                          <input
                            value={backlink.url}
                            onChange={(event) =>
                              updateBacklink(
                                backlink.id,
                                "url",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              color: "#e5e7eb",
                              border: !backlink.url
                                ? "1px solid rgba(239,68,68,0.45)"
                                : "1px solid rgba(255,255,255,0.1)",
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="flex justify-end gap-2 px-5 py-4"
                style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setEditableBacklinks(initialBacklinks);
                    setIsDirty(true);
                  }}
                  className="rounded-lg px-3.5 py-2 text-xs font-semibold"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    color: "#cbd5e1",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowBacklinkEditor(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold"
                  style={{
                    background: hasBacklinkPublishBlockers
                      ? "rgba(245,158,11,0.16)"
                      : "rgba(16,185,129,0.16)",
                    color: hasBacklinkPublishBlockers ? "#fbbf24" : "#86efac",
                    border: hasBacklinkPublishBlockers
                      ? "1px solid rgba(245,158,11,0.35)"
                      : "1px solid rgba(16,185,129,0.35)",
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
