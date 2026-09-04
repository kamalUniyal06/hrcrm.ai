import {
  Pencil,
  Trash,
  Check,
  LinkIcon,
  Dock,
  SparkleIcon,
  ArrowRight,
  Link,
  ExternalLink,
} from "lucide-react";
import {
  FiLink,
  FiTag,
  FiLayers,
  FiAlertTriangle,
  FiGlobe,
  FiTrendingUp,
} from "react-icons/fi";
import UpdatePopup from "./UpdatePopup";
import { createElement, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteLink, orderAction, updateSeoLink } from "../store/Slices/orders";
import { LoadingChase } from "./Loading";
import { Fa500Px, FaAccusoft, FaAddressBook, FaGoogle } from "react-icons/fa";
import GPCContentPopup from "./GPCContentPopup";
import { apiRequest, fetchGpc } from "../services/api";
import PromptLadger from "./PromptLadger";
import { getCurrentUser } from "../services/utils";

function ValidTick() {
  return (
    <span className="relative group ml-2 inline-flex items-center">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
        <Check size={12} strokeWidth={3} />
      </span>
      <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
        Valid
      </span>
    </span>
  );
}

const LI_API_KEY = "YOUR_SECRET_EXTRACT_HERE";

/**
 * Renders a paragraph preview with every occurrence of `anchor` highlighted
 * via a yellow <mark>. Pure text, so it's safe even when the WP post
 * contains arbitrary HTML.
 */
function HighlightedAnchor({ text, anchor }) {
  if (!anchor || !text) return <>{text}</>;
  const parts = text.split(anchor);
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <mark className="bg-yellow-200 text-slate-900 font-semibold rounded px-0.5">
              {anchor}
            </mark>
          )}
        </span>
      ))}
    </>
  );
}

function LIInsertPopup({ link, orderId, onClose, onInserted }) {
  const dispatch = useDispatch();
  const orders = useSelector((state) => state.orders.orders);
  const { user, businessEmail } = useSelector((state) => state.user);
  const currentUser = getCurrentUser()
  const gpcUserEmail = user?.email || currentUser?.description || businessEmail || "";

  // Stages: "fetching" | "selecting" | "inserting" | "success" | "error"
  const [stage, setStage] = useState("fetching");
  const [errorMsg, setErrorMsg] = useState("");
  const [occurrences, setOccurrences] = useState([]);
  const [meta, setMeta] = useState({ total: 0, unlinked: 0, title: "" });
  const [selected, setSelected] = useState(() => new Set());
  const [result, setResult] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const domain = link.name;
  const anchorText = link.anchor_text_c || "";
  const targetUrl = link.target_url_c || "";
  const backlinkUrl = link.backlink_url || "";

  // ── 1. Fetch anchor occurrences when the popup opens ────────────────────
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setStage("fetching");
      setErrorMsg("");
      setOccurrences([]);
      setSelected(new Set());

      try {
        if (!gpcUserEmail) {
          setStage("error");
          setErrorMsg("Could not verify the current GPC user for WordPress authorization.");
          return;
        }

        const data = await apiRequest({
          endpoint: `${domain}/wp-json/my-api/v1/anchor-occurrences`,
          method: "GET",
          params: { url: targetUrl, anchor_text: anchorText },
          headers: {
            "X-API-Key": LI_API_KEY,
            "X-GPC-User-Email": gpcUserEmail,
          },
        });

        if (cancelled) return;

        if (!data?.success) {
          setStage("error");
          setErrorMsg(data?.message || "Failed to fetch anchor occurrences.");
          return;
        }

        const list = Array.isArray(data.occurrences) ? data.occurrences : [];
        setOccurrences(list);
        setMeta({
          total: data.total || 0,
          unlinked: data.unlinked || 0,
          title: data.title || "",
        });

        setSelected(new Set());

        setStage("selecting");
      } catch (err) {
        if (cancelled) return;
        setStage("error");
        setErrorMsg(
          err?.message ||
          (err?.code === "target_url_not_found"
            ? "Please enter an appropriate target URL."
            : "Could not load anchor occurrences. Please try again."),
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [domain, targetUrl, anchorText, gpcUserEmail, reloadKey]);

  // Helpers ───────────────────────────────────────────────────────────────
  const unlinkedItems = occurrences.filter(
    (o) => !o.already_linked && o.index !== null && o.index !== undefined,
  );
  const allSelected =
    unlinkedItems.length > 0 &&
    unlinkedItems.every((o) => selected.has(o.index));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unlinkedItems.map((o) => o.index)));
    }
  };

  const toggleOne = (idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // ── 2. Insert backlinks into the chosen occurrences ─────────────────────
  const handleInsert = async () => {
    if (selected.size === 0) return;
    setStage("inserting");
    setErrorMsg("");

    try {
      if (!gpcUserEmail) {
        setStage("error");
        setErrorMsg("Could not verify the current GPC user for WordPress authorization.");
        return;
      }

      const data = await apiRequest({
        endpoint: `${domain}/wp-json/my-api/v1/create-post`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": LI_API_KEY,
          "X-GPC-User-Email": gpcUserEmail,
        },
        body: JSON.stringify({
          type: "li",
          gpc_user_email: gpcUserEmail,
          anchor_text: anchorText,
          backlink_url: backlinkUrl,
          target_url: targetUrl,
          occurrences: Array.from(selected),
        }),
      });

      if (!data?.success) {
        setStage("error");
        setErrorMsg(data?.message || "Insert failed.");
        return;
      }

      setResult(data);
      setStage("success");

      if (data.post_url) {
        const updatedLink = {
          ...link,
          assigned_user_link: data.post_url,
          post_id: data.post_url,
        };
        onInserted?.(updatedLink);
        dispatch(
          orderAction.setUpdateOrder(
            orders.map((order) => {
              if (order.order_id !== orderId && order.id !== orderId) {
                return order;
              }

              return {
                ...order,
                seo_backlinks: order.seo_backlinks.map((seoLink) =>
                  seoLink.id === link.id
                    ? {
                      ...seoLink,
                      ...updatedLink,
                    }
                    : seoLink,
                ),
              };
            }),
          ),
        );
        dispatch(
          updateSeoLink(orderId, updatedLink),
        );
      }
    } catch (err) {
      setStage("error");
      setErrorMsg(
        err?.message ||
        (err?.code === "target_url_not_found"
          ? "Please enter an appropriate target URL."
          : "Network error. Please try again."),
      );
    }
  };

  const retry = () => setReloadKey((k) => k + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center gap-2 min-w-0">
            <Link size={16} className="text-white shrink-0" />
            <h2 className="text-white font-semibold text-sm truncate">
              Insert Backlink {meta.title ? `— ${meta.title}` : ""}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition text-lg leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Summary fields */}
        <div className="px-5 pt-4 pb-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-b border-slate-100">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-slate-400 font-medium uppercase tracking-wider">
              Anchor Text
            </span>
            <span className="font-semibold text-slate-700 truncate">
              {anchorText || "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-slate-400 font-medium uppercase tracking-wider">
              Backlink URL
            </span>
            <span className="font-semibold text-indigo-600 truncate">
              {backlinkUrl || "—"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 col-span-2">
            <span className="text-slate-400 font-medium uppercase tracking-wider">
              Target URL
            </span>
            <span className="font-semibold text-slate-700 truncate">
              {targetUrl || "—"}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {stage === "fetching" && (
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium py-6 justify-center">
              <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              Scanning blog post for anchor text…
            </div>
          )}

          {stage === "error" && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-600 text-sm font-medium">
              <span className="shrink-0">⚠️</span>
              <span className="break-words">{errorMsg}</span>
            </div>
          )}

          {(stage === "selecting" || stage === "inserting") &&
            occurrences.length === 0 && (
              <div className="text-center text-sm text-slate-500 py-6">
                No occurrences of the anchor text were found in the post.
              </div>
            )}

          {(stage === "selecting" || stage === "inserting") &&
            occurrences.length > 0 && (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-xs text-slate-500">
                    Found{" "}
                    <span className="font-semibold text-slate-700">
                      {meta.total}
                    </span>{" "}
                    occurrence{meta.total !== 1 ? "s" : ""} ·{" "}
                    <span className="font-semibold text-emerald-700">
                      {meta.unlinked}
                    </span>{" "}
                    available ·{" "}
                    <span className="font-semibold text-amber-700">
                      {meta.total - meta.unlinked}
                    </span>{" "}
                    already linked
                  </div>
                  {unlinkedItems.length > 0 && (
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-indigo-600"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        disabled={stage === "inserting"}
                      />
                      Select all
                    </label>
                  )}
                </div>

                <ul className="space-y-2">
                  {occurrences.map((o) => {
                    const isLinked = o.already_linked;
                    const idx = o.index;
                    const checkable = !isLinked && idx !== null;
                    const isChecked = checkable && selected.has(idx);

                    return (
                      <li
                        key={`${o.absolute_index}-${o.paragraph_text?.slice(0, 16)}`}
                        className={`rounded-xl border px-3 py-2.5 flex items-start gap-2.5 ${isLinked
                          ? "bg-amber-50 border-amber-200 opacity-80"
                          : isChecked
                            ? "bg-indigo-50 border-indigo-300"
                            : "bg-slate-50 border-slate-200 hover:border-indigo-300"
                          }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 accent-indigo-600 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                          checked={isChecked}
                          onChange={() => toggleOne(idx)}
                          disabled={!checkable || stage === "inserting"}
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              #{o.absolute_index + 1}
                            </span>
                            {isLinked ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                                Already linked
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
                                Available
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 leading-snug break-words">
                            <HighlightedAnchor
                              text={o.paragraph_text || ""}
                              anchor={anchorText}
                            />
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

          {stage === "inserting" && (
            <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium py-2 justify-center">
              <span className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
              Inserting backlink in {selected.size} location
              {selected.size !== 1 ? "s" : ""}…
            </div>
          )}

          {stage === "success" && result && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <span>✅</span>
                Backlink inserted in {result.inserted_count ||
                  selected.size}{" "}
                location
                {(result.inserted_count || selected.size) !== 1 ? "s" : ""}!
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  Post URL
                </span>
                <a
                  href={result.post_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-semibold hover:underline break-all"
                >
                  {result.post_url}
                  <span className="text-xs">↗</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2 flex-wrap">
          {stage === "error" && (
            <button
              onClick={retry}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition shadow"
            >
              Retry
            </button>
          )}

          {stage === "selecting" && unlinkedItems.length > 0 && (
            <button
              onClick={handleInsert}
              disabled={selected.size === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow"
            >
              Insert Selected ({selected.size})
            </button>
          )}

          {stage === "inserting" && (
            <button
              disabled
              className="px-4 py-2 rounded-xl bg-indigo-400 text-white text-sm font-semibold opacity-70 cursor-not-allowed shadow"
            >
              Inserting…
            </button>
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
          >
            {stage === "success" ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SeoBacklinkList({ email, seo_backlink, orderId, id }) {
  const gpLinks = seo_backlink.filter((l) => l.type_c === "GP");
  const liLinks = seo_backlink.filter((l) => l.type_c === "LI");
  const { updateLinkLoading, deleting, updateLinkMessage } = useSelector(
    (state) => state.orders,
  );
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState(null);
  const [linkId, setLinkId] = useState(null);
  const [activeType, setActiveType] = useState("GP");
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const dispatch = useDispatch();

  const handleUpdate = (data) => {
    dispatch(updateSeoLink(orderId, { ...item, ...data }, email));
  };

  useEffect(() => {
    if (updateLinkMessage) {
      setOpen(false);
      dispatch(orderAction.clearAllMessages());
    }
  }, [updateLinkMessage]);

  const handleDelete = (linkId) => {
    dispatch(deleteLink(id, linkId));
  };

  const gpLinkGroups = gpLinks.reduce((acc, link) => {
    const key = link.gp_doc_url_c || "__no_doc__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(link);
    return acc;
  }, {});

  const liLinkGroups = liLinks.reduce((acc, link) => {
    const key = link.target_url_c || "__no_target__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(link);
    return acc;
  }, {});

  const gpGroupEntries = Object.entries(gpLinkGroups);
  const liGroupEntries = Object.entries(liLinkGroups);

  useEffect(() => {
    if (activeType === "GP" && !gpGroupEntries.length && liGroupEntries.length) {
      setActiveType("LI");
      setActiveGroupIndex(0);
    }
    if (activeType === "LI" && !liGroupEntries.length && gpGroupEntries.length) {
      setActiveType("GP");
      setActiveGroupIndex(0);
    }
  }, [activeType, gpGroupEntries.length, liGroupEntries.length]);

  const activeGroups = activeType === "GP" ? gpGroupEntries : liGroupEntries;
  const activeGroup = activeGroups[activeGroupIndex] || activeGroups[0];

  useEffect(() => {
    setActiveGroupIndex((index) =>
      activeGroups.length ? Math.min(index, activeGroups.length - 1) : 0,
    );
  }, [activeType, activeGroups.length]);

  return (
    <>
      {open && (
        <UpdatePopup
          open={open}
          loading={updateLinkLoading}
          onClose={() => setOpen(false)}
          title="Update Backlink"
          fields={[
            {
              label: "Link Amount",
              name: "link_amount_c",
              type: "number",
              value: item.link_amount_c.split("$")[1],
            },
            {
              label: "Type",
              name: "type_c",
              type: "select",
              options: [
                { value: "GP", label: "Guest Post" },
                { value: "LI", label: "Link Insertion" },
              ],
              value: item.type_c || "",
            },
            {
              label: "Their Link",
              name: "backlink_url",
              type: "text",
              value: item.backlink_url,
            },
            {
              label: "Anchor Text",
              name: "anchor_text_c",
              type: "text",
              value: item.anchor_text_c || "",
            },
            item.type_c === "LI"
              ? {
                label: "Our Link",
                name: "target_url_c",
                type: "text",
                value: item.target_url_c || "",
              }
              : {
                label: "Doc Link",
                name: "gp_doc_url_c",
                type: "text",
                value: item.gp_doc_url_c || "",
              },
            {
              label: "Website",
              name: "name",
              type: "text",
              value: item.name || "",
            },
            {
              label: "Link Type",
              name: "link_type",
              type: "select",
              options: [
                { value: "dofollow", label: "DoFollow" },
                { value: "nofollow", label: "NoFollow" },
                { value: "authoritative", label: "Authoritative" },
              ],
              value: item.link_type || "",
            },
          ]}
          onUpdate={handleUpdate}
        />
      )}

      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-3 sm:p-4">
          <div className="flex rounded-lg border border-blue-100 bg-white p-1 shadow-sm">
            {[
              { value: "GP", label: "Guest Post", count: gpLinks.length, groups: gpGroupEntries.length },
              { value: "LI", label: "Link Insertion", count: liLinks.length, groups: liGroupEntries.length },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveType(tab.value);
                  setActiveGroupIndex(0);
                }}
                disabled={!tab.groups}
                className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${activeType === tab.value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-blue-50"
                  }`}
              >
                {tab.value === "GP" ? <LinkIcon size={15} /> : <Link size={15} />}
                {tab.label}
                <span className={`rounded-md px-1.5 py-0.5 text-xs ${activeType === tab.value ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{tab.count}</span>
              </button>
            ))}
          </div>
          {activeGroups.length > 1 && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
              <BacklinkPagerButton
                disabled={activeGroupIndex === 0}
                onClick={() => setActiveGroupIndex((index) => Math.max(index - 1, 0))}
              >
                {"<"}
              </BacklinkPagerButton>
              {pageItems(activeGroups.length, activeGroupIndex).map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-400">...</span>
                ) : (
                  <button
                    key={activeGroups[item][0]}
                    onClick={() => setActiveGroupIndex(item)}
                    className={`h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition ${item === activeGroupIndex
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      }`}
                  >
                    {item + 1}
                  </button>
                ),
              )}
              <BacklinkPagerButton
                disabled={activeGroupIndex === activeGroups.length - 1}
                onClick={() =>
                  setActiveGroupIndex((index) =>
                    Math.min(index + 1, activeGroups.length - 1),
                  )
                }
              >
                {">"}
              </BacklinkPagerButton>
            </div>
          )}
        </div>
        <div className="bg-white p-3 sm:p-4">
          {activeGroup ? (
            activeType === "GP" ? (
              <GPLinksTable
                email={email}
                gpLinks={activeGroup[1]}
                orderId={orderId}
                linkId={linkId}
                groupIndex={activeGroupIndex}
                setItem={setItem}
                setOpen={setOpen}
                deleting={deleting}
                setLinkId={setLinkId}
                handleDelete={handleDelete}
              />
            ) : (
              <LILinksTable
                liLinks={activeGroup[1]}
                groupIndex={activeGroupIndex}
                setItem={setItem}
                setOpen={setOpen}
                deleting={deleting}
                setLinkId={setLinkId}
                linkId={linkId}
                handleDelete={handleDelete}
                orderId={orderId}
              />
            )
          ) : (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm font-medium text-slate-500">
              No backlinks found.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BacklinkPagerButton({ children, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function pageItems(total, activeIndex) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index);

  const visible = new Set([0, total - 1, activeIndex - 1, activeIndex, activeIndex + 1]);
  const items = [];
  let previous = -1;

  [...visible]
    .filter((index) => index >= 0 && index < total)
    .sort((a, b) => a - b)
    .forEach((index) => {
      if (index - previous > 1) items.push("ellipsis");
      items.push(index);
      previous = index;
    });

  return items;
}

/* ─────────────────────────────────────────────
   Column definitions — single source of truth
   7 columns: # | Anchor Text | Backlink URL | Spam Score | Amount & Type | Domain | Action
───────────────────────────────────────────── */
const COL_STYLES = [
  "flex-1 min-w-0",
  "flex-1 min-w-0",
  "flex-1 min-w-0",
  "flex-1 min-w-0",
  "flex-1 min-w-0",
  "flex-1 min-w-0",
  "flex-1 min-w-0",
];

function LinkTableHeader() {
  const labels = [
    "#",
    "Anchor Text",
    "Backlink URL",
    "Spam Score",
    "Amount & Type",
    "Domain",
    "Action",
  ];
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-gray-700 px-4 py-3 bg-slate-50 border-t border-slate-200 w-full min-w-0">
      {labels.map((label, i) => (
        <div key={label} className={COL_STYLES[i]}>
          {label}
        </div>
      ))}
    </div>
  );
}

/**
 * Scrolls the header and rows of a link table together.
 *
 * The 7 columns are all `flex-1`, so on a phone each one gets roughly 45px and
 * the anchor text, URLs and domain become unreadable. Since the header and the
 * rows share COL_STYLES, they have to scroll as one unit to stay aligned —
 * hence the min-width on a single inner track rather than per-row overflow.
 * overflow-y is pinned because `overflow-x-auto` alone would compute it from
 * visible to auto and let the row tooltips add a stray vertical scrollbar.
 */
function LinkTableScroller({ children, minWidth = 720, className = "" }) {
  return (
    <div
      className={`overflow-x-auto overflow-y-hidden lg:overflow-x-visible lg:overflow-y-visible ${className}`}
    >
      <div
        className="min-w-[var(--link-table-min-w)] lg:min-w-0"
        style={{ "--link-table-min-w": `${minWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
}

const getSpamLabel = (score) => {
  if (score < 10) return { label: "Low", color: "text-green-600" };
  if (score < 40) return { label: "Moderate", color: "text-yellow-600" };
  return { label: "High", color: "text-red-600" };
};

const formatLinkType = (str) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/* ─────────────────────────────────────────────
   Post-status lookup against the WordPress
   plugin (custom-api-poster). Each card calls
   GET /wp-json/my-api/v1/post-status?url=...
   on mount so we know whether the post is
   still Live, Trashed, Draft, or Not Found.
───────────────────────────────────────────── */
const POST_STATUS_API_KEY = "YOUR_SECRET_EXTRACT_HERE";

const isNumericPostId = (value) => /^\d+$/.test(String(value ?? "").trim());

const buildPostLookupParams = (postRef) => {
  const value = String(postRef ?? "").trim();
  return isNumericPostId(value) ? { post_id: value } : { url: value };
};

const getWebsiteDomain = (website) =>
  String(website ?? "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

function usePostStatus(postRef, website) {
  const [state, setState] = useState({
    loading: false,
    status: null,
    exists: null,
    permalink: null,
    title: null,
    error: false,
  });

  useEffect(() => {
    if (!postRef || !website) {
      setState({
        loading: false,
        status: null,
        exists: null,
        permalink: null,
        title: null,
        error: false,
      });
      return;
    }

    let cancelled = false;
    setState({
      loading: true,
      status: null,
      exists: null,
      permalink: null,
      title: null,
      error: false,
    });

    const domain = getWebsiteDomain(website);
    apiRequest({
      endpoint: `https://${domain}/wp-json/my-api/v1/post-status`,
      method: "GET",
      params: buildPostLookupParams(postRef),
      headers: { "X-Api-Key": POST_STATUS_API_KEY },
    })
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          status: data?.status ?? null,
          exists: !!data?.exists,
          permalink: data?.permalink ?? null,
          title: data?.title ?? null,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          loading: false,
          status: null,
          exists: null,
          permalink: null,
          title: null,
          error: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [postRef, website]);

  return state;
}

function useLinkInsertionStatus({ postRef, website, backlinkUrl, anchorText }) {
  const [state, setState] = useState({
    loading: false,
    status: null,
    exists: null,
    permalink: null,
    title: null,
    linkLive: null,
    linkFound: null,
    error: false,
  });

  useEffect(() => {
    if (!postRef || !website || !backlinkUrl) {
      setState({
        loading: false,
        status: null,
        exists: null,
        permalink: null,
        title: null,
        linkLive: null,
        linkFound: null,
        error: false,
      });
      return;
    }

    let cancelled = false;
    setState({
      loading: true,
      status: null,
      exists: null,
      permalink: null,
      title: null,
      linkLive: null,
      linkFound: null,
      error: false,
    });

    const domain = getWebsiteDomain(website);
    const params = {
      ...buildPostLookupParams(postRef),
      backlink_url: backlinkUrl,
    };
    if (anchorText) params.anchor_text = anchorText;

    apiRequest({
      endpoint: `https://${domain}/wp-json/my-api/v1/link-status`,
      method: "GET",
      params,
      headers: { "X-Api-Key": POST_STATUS_API_KEY },
    })
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          status: data?.status ?? null,
          exists: !!data?.exists,
          permalink: data?.permalink ?? null,
          title: data?.title ?? null,
          linkLive: !!data?.link_live,
          linkFound: !!data?.link_found,
          error: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          loading: false,
          status: null,
          exists: null,
          permalink: null,
          title: null,
          linkLive: null,
          linkFound: null,
          error: true,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [postRef, website, backlinkUrl, anchorText]);

  return state;
}

const STATUS_THEME = {
  publish: {
    label: "Live",
    bg: "bg-emerald-50",
    hover: "hover:bg-emerald-100",
    text: "text-emerald-700",
    sub: "text-emerald-600/70",
    dot: "bg-emerald-500",
    spinnerBorder: "border-emerald-500",
  },
  draft: {
    label: "Draft",
    bg: "bg-amber-50",
    hover: "hover:bg-amber-100",
    text: "text-amber-700",
    sub: "text-amber-600/70",
    dot: "bg-amber-500",
    spinnerBorder: "border-amber-500",
  },
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    hover: "hover:bg-amber-100",
    text: "text-amber-700",
    sub: "text-amber-600/70",
    dot: "bg-amber-500",
    spinnerBorder: "border-amber-500",
  },
  future: {
    label: "Scheduled",
    bg: "bg-blue-50",
    hover: "hover:bg-blue-100",
    text: "text-blue-700",
    sub: "text-blue-600/70",
    dot: "bg-blue-500",
    spinnerBorder: "border-blue-500",
  },
  private: {
    label: "Private",
    bg: "bg-slate-100",
    hover: "hover:bg-slate-200",
    text: "text-slate-700",
    sub: "text-slate-500",
    dot: "bg-slate-500",
    spinnerBorder: "border-slate-500",
  },
  trash: {
    label: "Trashed",
    bg: "bg-rose-50",
    hover: "hover:bg-rose-100",
    text: "text-rose-700",
    sub: "text-rose-600/70",
    dot: "bg-rose-500",
    spinnerBorder: "border-rose-500",
  },
  notfound: {
    label: "Not Found",
    bg: "bg-rose-50",
    hover: "hover:bg-rose-100",
    text: "text-rose-700",
    sub: "text-rose-600/70",
    dot: "bg-rose-500",
    spinnerBorder: "border-rose-500",
  },
  unknown: {
    label: "Unknown",
    bg: "bg-slate-100",
    hover: "hover:bg-slate-200",
    text: "text-slate-700",
    sub: "text-slate-500",
    dot: "bg-slate-400",
    spinnerBorder: "border-slate-400",
  },
  loading: {
    label: "Checking…",
    bg: "bg-slate-100",
    hover: "hover:bg-slate-200",
    text: "text-slate-600",
    sub: "text-slate-400",
    dot: "bg-slate-400",
    spinnerBorder: "border-slate-400",
  },
};

function getStatusTheme(s) {
  if (s.loading) return STATUS_THEME.loading;
  if (s.error) return STATUS_THEME.unknown;
  if (s.exists === false) return STATUS_THEME.notfound;
  return STATUS_THEME[s?.status] || STATUS_THEME.unknown;
}

function PostStatusBadge({ state, url, size = "md" }) {
  const theme = getStatusTheme(state);
  const href = state.permalink || (isNumericPostId(url) ? "#" : url);
  const label = theme.label;
  const sub = state.title || (isNumericPostId(url) ? `Post #${url}` : url);

  const sizing =
    size === "sm" ? "px-2 py-1 text-xs gap-1" : "px-2 py-1 text-sm gap-2";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={state.title ? `${label} — ${state.title}` : label}
      className={`group flex items-center rounded-lg ${theme.bg} ${theme.hover} transition w-full min-w-0 ${sizing}`}
    >
      {state.loading ? (
        <span
          className={`w-3 h-3 rounded-full border-2 ${theme.spinnerBorder} border-t-transparent animate-spin shrink-0`}
        />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} shrink-0`} />
      )}
      <span className={`font-semibold ${theme.text} shrink-0`}>{label}</span>
      <span className={`${theme.sub} truncate min-w-0`}>{sub}</span>
      <span className="opacity-0 group-hover:opacity-100 transition text-slate-400 ml-auto shrink-0">
        ↗
      </span>
    </a>
  );
}

function getLinkInsertionTheme(state) {
  if (state.loading) return STATUS_THEME.loading;
  if (state.error) return STATUS_THEME.unknown;
  if (state.exists === false) return STATUS_THEME.notfound;
  if (state.linkLive) return STATUS_THEME.publish;
  if (state.linkFound === false) return STATUS_THEME.trash;
  return STATUS_THEME[state?.status] || STATUS_THEME.unknown;
}

function LinkInsertionStatusBadge({ state, postRef, size = "md" }) {
  const theme = getLinkInsertionTheme(state);
  const href = state.permalink || (isNumericPostId(postRef) ? "#" : postRef);
  const label = state.linkLive
    ? "Live Link"
    : state.linkFound === false && state.exists !== false
      ? "Link Removed"
      : theme.label;
  const sub =
    state.title || (isNumericPostId(postRef) ? `Post #${postRef}` : postRef);

  const sizing =
    size === "sm" ? "px-2 py-1 text-xs gap-1" : "px-2 py-1 text-sm gap-2";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={state.title ? `${label} - ${state.title}` : label}
      className={`group flex items-center rounded-lg ${theme.bg} ${theme.hover} transition w-full min-w-0 ${sizing}`}
    >
      {state.loading ? (
        <span
          className={`w-3 h-3 rounded-full border-2 ${theme.spinnerBorder} border-t-transparent animate-spin shrink-0`}
        />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} shrink-0`} />
      )}
      <span className={`font-semibold ${theme.text} shrink-0`}>{label}</span>
      <span className={`${theme.sub} truncate min-w-0`}>{sub}</span>
      <ExternalLink
        size={12}
        className="opacity-0 group-hover:opacity-100 transition text-slate-400 ml-auto shrink-0"
      />
    </a>
  );
}

function PostStatusChip({ url, website, size = "md" }) {
  const state = usePostStatus(url, website);
  return <PostStatusBadge state={state} url={url} size={size} />;
}

function LinkTableRow({
  link,
  rowIndex,
  setItem,
  setOpen,
  setLinkId,
  linkId,
  deleting,
  handleDelete,
}) {
  const spam = getSpamLabel(link.spam_score_c);
  const [activePromptId, setActivePromptId] = useState(null);
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-t border-slate-100 text-sm w-full min-w-0 ${link.link_type === "dofollow" ? "bg-green-100" : ""}`}
    >
      <PromptLadger activePromptId={activePromptId} setActivePromptId={setActivePromptId} isModal={true} />
      {/* Col 0 — # */}
      <div className={COL_STYLES[0]}>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold shadow-sm">
          {rowIndex + 1}
        </span>
      </div>

      {/* Col 1 — Anchor Text + verdict icon */}
      <div className={`${COL_STYLES[1]} flex items-center gap-1`}>
        <span
          className={`truncate font-medium text-slate-800 ${!Number(link.is_anchor_text_valid) ? "line-through" : ""
            }`}
        >
          {link.anchor_text_c || "-"}
        </span>
        {link.link_verdict_prompt_ledger_id && (
          <button
            onClick={() =>
              setActivePromptId(link.link_verdict_prompt_ledger_id)
            }
            className="text-yellow-600 hover:scale-110 shrink-0"
          >
            <SparkleIcon size={14} />
          </button>
        )}
      </div>

      {/* Col 2 — Backlink URL + verdict icon */}
      <div className={`${COL_STYLES[2]} flex items-center gap-1 min-w-0`}>
        <a
          href={link.backlink_url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 transition min-w-0"
        >
          <span
            className={`truncate font-medium text-slate-800 ${!Number(link.is_link_valid) ? "line-through" : ""
              }`}
          >
            {link.backlink_url || "-"}
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition shrink-0">
            ↗
          </span>
        </a>
        {link.link_verdict_prompt_ledger_id && (
          <button
            onClick={() =>
              setActivePromptId(link.link_verdict_prompt_ledger_id)
            }
            className="text-yellow-600 hover:scale-110 shrink-0"
          >
            <SparkleIcon size={14} />
          </button>
        )}
      </div>

      {/* Col 3 — Spam Score */}
      <div className={`${COL_STYLES[3]} font-medium ${spam.color}`}>
        <div
          className={`truncate max-w-[130px] font-medium text-slate-800 ${link.spam_score_c > 7 ? "line-through" : ""
            }`}
        >
          <span className="text-xs font-bold text-slate-500">MOZ</span>
          <span className="text-yellow-400 text-xs">★</span>
          <span>{link.spam_score_c}%</span>
        </div>
      </div>

      {/* Col 4 — Amount & Type */}
      <div className={`${COL_STYLES[4]} flex flex-col gap-0.5`}>
        <span className="font-semibold text-indigo-600">
          {link.link_amount_c}
        </span>
        <span
          className={`text-xs font-semibold ${link.link_type === "dofollow" ? "text-green-600" : "text-red-600"}`}
        >
          {formatLinkType(link.link_type)}
        </span>
      </div>

      {/* Col 5 — Domain + verdict icon */}
      <div className={`${COL_STYLES[5]} flex items-center gap-1 min-w-0`}>
        <span
          className={`truncate font-medium text-slate-800 ${!Number(link.is_domain_valid) ? "line-through" : ""
            }`}
        >
          {(() => {
            try {
              return new URL(link.backlink_url).hostname.replace(/^www\./, "");
            } catch {
              return link.backlink_url;
            }
          })()}
        </span>
        {link.link_verdict_prompt_ledger_id && (
          <button
            onClick={() =>
              setActivePromptId(link.link_verdict_prompt_ledger_id)
            }
            className="text-yellow-600 hover:scale-110 shrink-0"
          >
            <SparkleIcon size={14} />
          </button>
        )}
      </div>

      {/* Col 6 — Actions */}
      <div className={`${COL_STYLES[6]} flex gap-2`}>
        <button
          onClick={() => {
            setItem(link);
            setOpen(true);
          }}
          className="px-2 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => {
            setLinkId(link.id);
            handleDelete(link.id);
          }}
          disabled={deleting}
          className="px-2 py-1 rounded-xl bg-red-600 text-white hover:bg-red-700 transition shadow"
        >
          {deleting && linkId === link.id ? (
            <LoadingChase size="16" color="white" />
          ) : (
            <Trash size={14} />
          )}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   GPLinksTable
───────────────────────────────────────────── */
function GPLinksTable({
  email,
  gpLinks,
  setItem,
  setOpen,
  deleting,
  setLinkId,
  linkId,
  orderId,
  handleDelete,
}) {
  const rep = gpLinks[0];
  return (
    <div className="overflow-hidden mb-4 border-2 border-blue-300 rounded-xl">
      <DocumentAnalysisCard
        email={email}
        website={rep.name}
        docLink={rep.gp_doc_url_c}
        orderId={orderId}
        docNiche={rep.niche}
        ContentValid={rep.is_content_valid}
        DocName={rep.document_name}
        linkCount={gpLinks.length}
        linkId={rep.id}
        link={rep}
        gpLinks={gpLinks}
        ContentVerdictPromptLedger={rep.guestpost_prompt_ledger[0]}
      />
      <LinkTableHeader />
      {gpLinks.map((gpLink, rowIndex) => (
        <LinkTableRow
          key={gpLink.id}
          link={gpLink}
          rowIndex={rowIndex}
          setItem={setItem}
          setOpen={setOpen}
          setLinkId={setLinkId}
          linkId={linkId}
          deleting={deleting}
          handleDelete={handleDelete}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LILinksTable
───────────────────────────────────────────── */
function LILinksTable({
  liLinks,
  setItem,
  setOpen,
  deleting,
  setLinkId,
  linkId,
  handleDelete,
  orderId,
}) {
  const rep = liLinks[0];
  return (
    <div className="overflow-hidden mb-4 border-2 border-emerald-300 rounded-xl w-full min-w-0">
      <LIAnalysisCard
        targetUrl={rep.target_url_c}
        website={rep.name}
        linkCount={liLinks.length}
        link={rep}
        orderId={orderId}
      />
      <LinkTableHeader />
      {liLinks.map((liLink, rowIndex) => (
        <LinkTableRow
          key={liLink.id}
          link={liLink}
          rowIndex={rowIndex}
          setItem={setItem}
          setOpen={setOpen}
          setLinkId={setLinkId}
          linkId={linkId}
          deleting={deleting}
          handleDelete={handleDelete}
          orderId={orderId}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   DocumentAnalysisCard  –  GP header
───────────────────────────────────────────── */
function DocumentAnalysisCard({
  email,
  docLink,
  docNiche,
  website,
  ContentValid,
  DocName,
  linkCount,
  ContentVerdictPromptLedger,
  orderId,
  linkId,
  link,
  gpLinks = [],
}) {
  const [loading, setLoading] = useState(false);
  const [activePromptId, setActivePromptId] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [openPopup, setOpenPopup] = useState(false);
  const { updateLinkLoading } = useSelector((state) => state.orders);
  const isLoading = loading || updateLinkLoading;
  const postedUrl = link?.post_id || link?.assigned_user_link || "";
  const postStatus = usePostStatus(postedUrl, website);
  // When the WordPress lookup definitively says the post is gone
  // (exists === false), revert to the ZeroGPT Start-Now flow so the
  // user can republish. We deliberately stay "posted" during loading,
  // network errors, and other statuses (draft, trash, etc.).
  const treatAsPosted = !!postedUrl && postStatus.exists !== false;
  const handleStartNow = async () => {
    try {
      setLoading(true);

      const data = await fetchGpc({
        params: { type: "zerogpt" },
        method: "POST",
        body: { doc_url: docLink },
      });

      setAnalysisData(data);
      setOpenPopup(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="overflow-hidden">
      <PromptLadger
        activePromptId={activePromptId}
        setActivePromptId={setActivePromptId}
        isModal={true}
      />
      {/* HEADER */}
      <div className="flex items-center justify-center gap-2 bg-blue-300 px-4 py-2">
        <div className="text-white text-md font-bold flex items-center gap-2">
          GuestPost Result for
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-md ml-2 text-black p-1 rounded-2xl hover:underline"
          >
            {website ?? "-"}
          </a>
        </div>
      </div>

      {/* CONTENT — labels sit in row 1 and values in row 2 of one grid, so the
          column count cannot be reduced without breaking that pairing. Scroll
          sideways on narrow screens instead. */}
      <div className="flex items-center gap-4 p-2 sm:p-4 min-w-0">
        <LinkTableScroller className="flex-1 min-w-0" minWidth={620}>
          <div className="bg-white rounded-lg px-2 py-3 shadow grid grid-cols-5 gap-4">
            <div className="text-sm font-semibold text-gray-500">Doc Name</div>
            <div className="text-sm font-semibold text-gray-500">Niche</div>
            <div className="text-sm font-semibold text-gray-500">
              Content Verdict
            </div>
            <div className="text-sm font-semibold text-gray-500">
              {treatAsPosted ? "Blog Status" : "ZeroGPT"}
            </div>
            <div className="text-sm font-semibold text-gray-500">Link Count</div>

            <a
              href={docLink}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg bg-indigo-50 px-1 py-1 text-sm hover:bg-indigo-100 transition w-full"
            >
              <span
                className={`truncate max-w-[130px] font-medium text-slate-800 ${Number(link.is_content_valid) ? "" : "line-through"
                  }`}
              >
                {DocName || "Untitled Document"}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition text-indigo-500 ml-1">
                ↗
              </span>
            </a>

            <span className="text-md text-slate-500 truncate">
              {docNiche || "No Niche"}
            </span>

            <div className="flex items-center gap-2">
              {ContentVerdictPromptLedger && (
                <button
                  onClick={() =>
                    setActivePromptId(ContentVerdictPromptLedger)
                  }
                  className="text-yellow-600 hover:scale-110"
                >
                  <SparkleIcon size={18} />
                </button>
              )}
              <ValidationBadge valid={ContentValid} />
            </div>

            <div className="flex items-center gap-2 min-w-0">
              {treatAsPosted ? (
                <PostStatusBadge state={postStatus} url={postedUrl} />
              ) : (
                <button
                  onClick={handleStartNow}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition-all duration-200"
                  style={{
                    background: isLoading ? "#9ca3af" : "#eab308",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  {isLoading ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Start Now
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex items-center">
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                {linkCount}
              </span>
            </div>
          </div>
        </LinkTableScroller>
        {openPopup && analysisData && (
          <GPCContentPopup
            email={email}
            data={analysisData}
            website={website}
            orderId={orderId}
            link={link}
            backlinks={gpLinks}
            linkId={linkId}
            onClose={() => setOpenPopup(false)}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIAnalysisCard  –  LI header
───────────────────────────────────────────── */
function LIAnalysisCard({ targetUrl, website, link, orderId }) {
  const [liPopupOpen, setLiPopupOpen] = useState(false);
  const liPostRef = link?.post_id || link?.assigned_user_link || "";
  const liStatus = useLinkInsertionStatus({
    postRef: liPostRef,
    website,
    backlinkUrl: link?.backlink_url || "",
    anchorText: link?.anchor_text_c || "",
  });
  const liTreatAsPosted =
    !!liPostRef && liStatus.exists !== false && liStatus.linkFound !== false;

  return (
    <div className="overflow-hidden w-full min-w-0">
      {/* HEADER */}
      <div className="flex items-center justify-center gap-2 bg-emerald-400 px-4 py-2 min-w-0">
        <div className="text-white text-md font-bold flex items-center gap-2 min-w-0 max-w-full">
          <span className="shrink-0">Link Insertion for</span>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-md ml-2 text-black p-1 rounded-2xl hover:underline truncate min-w-0"
          >
            {website ?? targetUrl ?? "-"}
          </a>
        </div>
      </div>

      {/* CONTENT — same label-row/value-row grid as the GP card, so it scrolls
          sideways on narrow screens rather than dropping to fewer columns. */}
      <div className="flex items-center gap-4 p-2 sm:p-4 min-w-0">
        <LinkTableScroller className="flex-1 min-w-0" minWidth={480}>
          <div className="min-w-0 bg-white rounded-lg px-3 py-3 shadow grid grid-cols-3 gap-6 items-center">
            <div className="text-sm font-semibold text-gray-500 min-w-0">
              Target URL
            </div>
            <div className="text-sm font-semibold text-gray-500 min-w-0">
              Monthly Traffic
            </div>
            <div className="text-sm font-semibold text-gray-500 min-w-0">
              Action
            </div>

            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg bg-emerald-50 px-1 py-1 text-sm hover:bg-emerald-100 transition w-full min-w-0"
            >
              <span className="font-semibold text-emerald-700 truncate min-w-0 flex-1">
                {targetUrl || "No Target URL"}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition text-emerald-500 ml-1 shrink-0">
                ↗
              </span>
            </a>

            {/* Traffic mini badges */}
            <div className="flex flex-wrap gap-1.5 items-center min-w-0">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold">
                <FaGoogle size={10} /> 100
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 text-xs font-semibold">
                <Fa500Px size={10} /> 100
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold">
                <FaAccusoft size={10} /> 100
              </span>
            </div>
            <div className="flex items-center justify-start min-w-0">
              {liTreatAsPosted ? (
                <div className="min-w-0 max-w-[220px]">
                  <LinkInsertionStatusBadge
                    state={liStatus}
                    postRef={liPostRef}
                    size="sm"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setLiPopupOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shadow whitespace-nowrap"
                  title="Insert Backlink"
                >
                  <Link size={16} />
                  <span>Insert Backlink</span>
                </button>
              )}
            </div>
          </div>
        </LinkTableScroller>
      </div>
      {liPopupOpen && (
        <LIInsertPopup
          link={link}
          orderId={orderId}
          onClose={() => setLiPopupOpen(false)}
        />
      )}
    </div>
  );
}

/* ── Shared helpers ── */
const getSpamStyle = (score) => {
  if (score < 10)
    return {
      label: "Low",
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-700",
      icon: "check",
    };
  return {
    label: "High",
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-700",
    icon: "cross",
  };
};

export function TheirLink({ data }) {
  const spam = getSpamStyle(data.spam_score_c);
  return (
    <div className="relative p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5 hover:shadow-md transition">
      <div className="flex items-center justify-center rounded-xl gap-3 bg-gradient-to-r from-blue-500 to-purple-500 p-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          Their Link
        </h3>
      </div>
      <div className="flex items-start gap-0">
        <div className="flex-1 flex flex-col gap-1 pr-4">
          <div className="flex items-center gap-2">
            <FiTag className="text-slate-400" size={13} />
            <p className="text-xs text-slate-500">Anchor Text</p>
          </div>
          <p className="text-sm font-semibold text-slate-800 break-all flex items-center gap-1">
            {data.anchor_text_c || "-"}
          </p>
        </div>
        <div className="relative inline-flex items-center">
          <div className="flex items-center gap-2 pl-3 pr-8 py-1.5 rounded-full border-2 border-green-700 bg-green-100 text-green-700 text-sm font-medium">
            <SparkleIcon className="w-4 h-4 text-green-600" />
          </div>
          <div
            className={`absolute -right-1 flex items-center justify-center w-8 h-8 rounded-full shadow-md ${data.is_anchor_text_valid === "1" ? "bg-green-600" : "bg-red-600"}`}
          >
            {data.is_anchor_text_valid === "1" ? (
              <img
                width="65"
                height="65"
                src="https://img.icons8.com/3d-fluency/94/ok.png"
                alt="ok"
              />
            ) : (
              <img
                src="https://img.icons8.com/3d-fluency/94/cancel.png"
                alt="cross"
                width="65"
                height="65"
              />
            )}
          </div>
        </div>
      </div>
      <span className="block border-t border-gray-200"></span>
      <div className="flex items-center justify-between gap-0">
        <div className="flex flex-col gap-1 pl-4 items-end">
          <div className="flex items-center gap-2">
            <FiLayers className="text-indigo-500" size={14} />
            <p className="text-xs text-slate-500">Amount</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-base">
            {data.link_amount_c ?? "-"}
          </div>
        </div>
        <span className="self-stretch border-l border-gray-200 mx-2"></span>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-50">
            <FiLink size={14} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Backlink URL</p>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={data.backlink_url}
                target="_blank"
                className="group inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition"
              >
                <span className="truncate max-w-[220px] lg:max-w-[150px]">
                  {data.backlink_url}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition">
                  ↗
                </span>
              </a>
            </div>
          </div>
        </div>
        <div className="relative inline-flex items-center">
          <div className="flex items-center gap-2 pl-2 pr-8 py-1.5 rounded-full border-2 border-green-700 bg-green-100 text-green-700 text-sm font-medium">
            <SparkleIcon className="w-4 h-4 text-green-600" />
          </div>
          <div className="absolute -right-1 flex items-center justify-center w-8 h-8 rounded-full bg-green-600 shadow-md">
            <img
              width="65"
              height="65"
              src="https://img.icons8.com/3d-fluency/94/ok.png"
              alt="ok"
            />
          </div>
        </div>
      </div>
      <span className="block border-t border-gray-200"></span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 flex items-center gap-4 pr-2 min-w-[220px]">
          <Meta icon={FiLink} label="Type" value={data.type_c} />
          <span className="self-stretch border-l border-gray-200 mx-2"></span>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-100">
              <FiTag size={14} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Link Type</p>
              <p className="text-sm font-semibold text-slate-800 capitalize">
                {data.link_type}
              </p>
            </div>
          </div>
        </div>
        <span className="hidden sm:block self-stretch border-l border-gray-200 mx-4"></span>
        <div className="flex items-center">
          <div className="relative inline-flex justify-end max-w-[500px] lg:max-w-[100px]">
            <div
              className={`flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 pr-6 sm:pr-8 py-1 rounded-full border-2 ${spam.bg} ${spam.text} ${spam.border} text-xs sm:text-sm font-medium whitespace-nowrap`}
            >
              <FiAlertTriangle
                className={`w-3 h-3 sm:w-4 sm:h-4 ${spam.text}`}
              />
              <span>
                Spam {data.spam_score_c}% · {spam.label}
              </span>
              <span className="ml-1 flex items-center gap-1 font-bold text-blue-600">
                MOZ{" "}
                <span className="text-yellow-400 text-xs sm:text-sm">★</span>
              </span>
            </div>
            <div
              className={`absolute -right-1 flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full shadow-md ${spam.icon === "check" ? "bg-green-600" : "bg-red-600"}`}
            >
              {spam.icon === "check" ? (
                <img
                  className="w-5 h-5 sm:w-7 sm:h-7"
                  src="https://img.icons8.com/3d-fluency/94/ok.png"
                  alt="ok"
                />
              ) : (
                <img
                  className="w-5 h-5 sm:w-7 sm:h-7"
                  src="https://img.icons8.com/3d-fluency/94/cancel.png"
                  alt="cross"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OurLink({ data }) {
  return (
    <div className="relative p-5 rounded-xl bg-white shadow-sm space-y-5 hover:shadow-md transition">
      <div className="flex items-center justify-center rounded-xl gap-3 bg-gradient-to-r from-blue-500 to-purple-500 p-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-widest">
          Our Link
        </h3>
      </div>
      <div className="flex flex-wrap items-center justify-center">
        {data?.type_c === "LI" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-50">
                <FiLink className="text-indigo-600" size={14} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Target URL</p>
                <a
                  href={data?.target_url_c}
                  target="_blank"
                  className="group mt-2 inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition"
                >
                  <span className="truncate max-w-[280px]">
                    {data?.target_url_c}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition">
                    ↗
                  </span>
                </a>
              </div>
            </div>
            <div className="flex">
              <div className="p-2 rounded-lg bg-indigo-50">
                <FiTrendingUp className="text-indigo-600" size={14} />
              </div>
              <p className="text-sm font-medium text-slate-600 ml-3">
                Monthly Traffic
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                icon={<FaGoogle size={16} />}
                label="Google"
                value={100}
                iconBg="bg-red-100"
                iconColor="text-red-600"
                cardBg="from-red-50 to-white"
              />
              <StatCard
                icon={<Fa500Px size={16} />}
                label="Ahrefs"
                value={100}
                iconBg="bg-orange-100"
                iconColor="text-orange-600"
                cardBg="from-orange-50 to-white"
              />
              <StatCard
                icon={<FaAccusoft size={16} />}
                label="Semrush"
                value={100}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
                cardBg="from-emerald-50 to-white"
              />
              <StatCard
                icon={<FaAddressBook size={16} />}
                label="All Links"
                value={100}
                iconBg="bg-violet-100"
                iconColor="text-violet-600"
                cardBg="from-violet-50 to-white"
              />
            </div>
          </div>
        )}
        {data?.type_c === "GP" && (
          <div className="w-full flex flex-col gap-0">
            <div className="flex items-start gap-0 py-3">
              <div className="flex-1 flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-1">
                  <FiGlobe className="text-slate-400" size={13} />
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    Website
                  </p>
                </div>
                <p className="text-sm text-slate-700 font-medium break-all">
                  {data?.name || "-"}
                </p>
              </div>
              <span className="self-stretch border-l border-gray-200 mx-2"></span>
              <div className="flex-1 flex flex-col gap-1 pl-4">
                <div className="flex items-center gap-1">
                  <LinkIcon className="text-slate-400" size={13} />
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    Doc Link
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={data?.gp_doc_url_c}
                    target="_blank"
                    className="group inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 transition max-w-fit"
                  >
                    <span className="truncate max-w-[160px]">
                      {data?.gp_doc_url_c}
                    </span>
                    <span className="opacity-0 group-hover:opacity-100 transition">
                      ↗
                    </span>
                  </a>
                </div>
              </div>
              <div className="relative inline-flex items-center">
                <div className="flex items-center gap-2 pl-4 pr-10 py-1.5 rounded-full border-2 border-green-700 bg-green-100 text-green-700 text-sm font-semibold">
                  <SparkleIcon className="w-5 h-5 text-green-600" />
                </div>
                <div
                  className={`absolute -right-1 flex items-center justify-center w-10 h-10 rounded-full shadow-md ${data.is_link_valid === "1" ? "bg-green-600" : "bg-red-600"}`}
                >
                  {data.is_link_valid === "1" ? (
                    <img
                      width="94"
                      height="94"
                      src="https://img.icons8.com/3d-fluency/94/ok.png"
                      alt="ok"
                    />
                  ) : (
                    <img
                      src="https://img.icons8.com/3d-fluency/94/cancel.png"
                      alt="cross"
                      width="94"
                      height="94"
                    />
                  )}
                </div>
              </div>
            </div>
            <span className="block border-t border-gray-200"></span>
            <div className="flex items-start gap-0 py-3">
              <div className="flex-1 flex flex-col gap-1 pr-4">
                <div className="flex items-center gap-1">
                  <Dock className="text-slate-400" size={13} />
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    Doc Niche
                  </p>
                </div>
                <p className="text-sm text-slate-700 font-medium break-all">
                  {data?.niche || "-"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({ icon, label, value, valid }) {
  return (
    <div className="flex items-start gap-2">
      {createElement(icon, { className: "text-slate-400 mt-0.5", size: 14 })}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-700 font-medium break-all">
          {value || "-"}
          {valid && <ValidTick />}
        </p>
      </div>
    </div>
  );
}

const StatCard = ({ icon, label, value, iconBg, iconColor, cardBg }) => (
  <div
    className={`flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-br ${cardBg} px-4 py-3 hover:shadow-md hover:-translate-y-0.5 transition`}
  >
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>{icon}</div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
    </div>
    <span className="text-sm font-semibold text-slate-900">{value}</span>
  </div>
);

const ValidationBadge = ({ valid }) =>
  valid === "1" ? (
    <span className="flex items-center gap-1 text-green-600 font-medium">
      <img
        width="30"
        height="30"
        src="https://img.icons8.com/3d-fluency/94/ok.png"
        alt="ok"
      />
    </span>
  ) : (
    <span className="flex items-center gap-1 text-red-600 font-medium">
      <img
        className="w-5 h-5 sm:w-7 sm:h-7"
        src="https://img.icons8.com/3d-fluency/94/cancel.png"
        alt="cross"
      />
    </span>
  );
