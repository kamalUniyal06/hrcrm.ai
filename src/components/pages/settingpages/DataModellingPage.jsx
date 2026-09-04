import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";

const TOKEN_SECRET = "MY_SUPER_SECRET_123";

async function generateToken() {
  const payload = {
    ts: Math.floor(Date.now() / 1000),
    source: "claude-mcp",
  };
  const json = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(TOKEN_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(json));
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return btoa(`${json}||${sigHex}`);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function syntaxHighlight(json) {
  return json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+\.?\d*([eE][+-]?\d+)?)/g,
      (m) => {
        if (/^"/.test(m)) return /:$/.test(m) ? `<span class="dm-jk">${m}</span>` : `<span class="dm-js">${m}</span>`;
        if (/true|false/.test(m)) return `<span class="dm-jb">${m}</span>`;
        if (/null/.test(m)) return `<span class="dm-jb">${m}</span>`;
        return `<span class="dm-jn">${m}</span>`;
      }
    );
}

function getPlaceholder(type, name) {
  if (name === "id") return "";
  switch (type) {
    case "bool": return false;
    case "int": case "decimal": case "float": case "currency": return 0;
    case "date": return "2025-01-01";
    case "datetime": return "2025-01-01 00:00:00";
    default: return "";
  }
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

.dm-wrap {
  --dm-bg: #f5f7fa;
  --dm-surface: #ffffff;
  --dm-surface2: #f0f2f6;
  --dm-border: #e2e6ec;
  --dm-border2: #cdd3dd;
  --dm-text: #1a2233;
  --dm-muted: #6b7a99;
  --dm-hint: #a0aab8;
  --dm-accent: #4361ee;
  --dm-accent-light: #eef0fd;
  --dm-accent-dark: #2d46c7;
  --dm-green: #0f9f6e;
  --dm-green-light: #e6f7f1;
  --dm-red: #e53e3e;
  --dm-red-light: #fff0f0;
  --dm-amber: #d97706;
  --dm-amber-light: #fef3c7;
  --dm-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --dm-shadow-md: 0 4px 12px rgba(0,0,0,0.08);
}

.dm-wrap *, .dm-wrap *::before, .dm-wrap *::after {
  box-sizing: border-box; margin: 0; padding: 0;
}

.dm-app {
  display: grid;
  grid-template-areas: "topbar topbar" "sidebar main";
  grid-template-columns: 220px 1fr;
  grid-template-rows: 54px 1fr;
  height: 100vh;
  overflow: hidden;
  font-family: 'Inter', sans-serif;
  background: var(--dm-bg);
  color: var(--dm-text);
  font-size: 13px;
  line-height: 1.6;
}

/* TOPBAR */
.dm-topbar {
  grid-area: topbar;
  background: var(--dm-surface);
  border-bottom: 1px solid var(--dm-border);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 12px;
  box-shadow: var(--dm-shadow);
  z-index: 10;
}
.dm-logo {
  font-size: 15px;
  font-weight: 700;
  color: var(--dm-text);
  letter-spacing: -0.3px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.dm-logo-icon {
  width: 28px; height: 28px;
  background: var(--dm-accent);
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  font-size: 14px; font-weight: 700;
}
.dm-logo span { color: var(--dm-accent); }
.dm-topbar-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.dm-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 20px;
  background: var(--dm-accent-light);
  color: var(--dm-accent);
}

/* SIDEBAR */
.dm-sidebar {
  grid-area: sidebar;
  background: var(--dm-surface);
  border-right: 1px solid var(--dm-border);
  padding: 16px 10px;
  overflow-y: auto;
}
.dm-section {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--dm-hint);
  padding: 0 10px;
  margin: 18px 0 6px;
}
.dm-section:first-child { margin-top: 0; }

.dm-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--dm-muted);
  cursor: pointer;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 500;
  transition: all 0.12s;
  margin-bottom: 1px;
  text-align: left;
}
.dm-action-btn:hover { background: var(--dm-bg); color: var(--dm-text); }
.dm-action-btn.active { background: var(--dm-accent-light); color: var(--dm-accent); }

.dm-pill {
  margin-left: auto;
  font-size: 9.5px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}
.dm-pill-post { background: #eef0fd; color: #4361ee; }
.dm-pill-get  { background: #e6f7f1; color: #0f9f6e; }
.dm-pill-del  { background: #fff0f0; color: #e53e3e; }

/* MAIN */
.dm-main { grid-area: main; overflow-y: auto; padding: 20px 24px; background: var(--dm-bg); }
.dm-pane { max-width: 900px; margin: 0 auto; }

/* CARD */
.dm-card {
  background: var(--dm-surface);
  border: 1px solid var(--dm-border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: var(--dm-shadow);
}
.dm-card-header {
  padding: 13px 18px;
  border-bottom: 1px solid var(--dm-border);
  display: flex;
  align-items: center;
  gap: 10px;
}
.dm-card-header-pill {
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 5px;
}
.dm-card-title { font-size: 13.5px; font-weight: 600; color: var(--dm-text); }
.dm-card-desc  { font-size: 11.5px; color: var(--dm-muted); margin-left: auto; }
.dm-card-body  { padding: 18px; }

/* FORM */
.dm-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.dm-field { display: flex; flex-direction: column; gap: 5px; }
.dm-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--dm-muted);
}
.dm-req { color: var(--dm-red); }

.dm-input, .dm-select, .dm-textarea {
  background: var(--dm-bg);
  border: 1px solid var(--dm-border);
  color: var(--dm-text);
  padding: 8px 11px;
  border-radius: 7px;
  font-family: inherit;
  font-size: 13px;
  transition: all 0.12s;
  width: 100%;
}
.dm-input:focus, .dm-select:focus, .dm-textarea:focus {
  outline: none;
  border-color: var(--dm-accent);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(67,97,238,0.08);
}
.dm-select { cursor: pointer; }
.dm-textarea {
  resize: vertical;
  min-height: 80px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.5;
}
.dm-textarea.err { border-color: var(--dm-red); }

/* DATE PILLS */
.dm-date-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.dm-date-pill {
  background: var(--dm-bg);
  border: 1px solid var(--dm-border);
  color: var(--dm-muted);
  padding: 5px 11px;
  border-radius: 20px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  transition: all 0.12s;
}
.dm-date-pill:hover { border-color: var(--dm-accent); color: var(--dm-accent); background: var(--dm-accent-light); }
.dm-date-pill.active { background: var(--dm-accent); color: #fff; border-color: var(--dm-accent); font-weight: 600; }
.dm-custom-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 10px; }

/* FIELD CHIPS */
.dm-fields-wrap {
  background: var(--dm-bg);
  border: 1px solid var(--dm-border);
  border-radius: 8px;
  padding: 10px;
}
.dm-chip-search {
  width: 100%;
  background: var(--dm-surface);
  border: 1px solid var(--dm-border);
  color: var(--dm-text);
  padding: 7px 11px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 12px;
  margin-bottom: 9px;
}
.dm-chip-search:focus { outline: none; border-color: var(--dm-accent); }
.dm-chip-grid { display: flex; flex-wrap: wrap; gap: 5px; max-height: 180px; overflow-y: auto; }
.dm-chip {
  background: var(--dm-surface);
  border: 1px solid var(--dm-border);
  color: var(--dm-text);
  padding: 4px 9px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.12s;
  font-family: inherit;
}
.dm-chip:hover { border-color: var(--dm-accent); color: var(--dm-accent); background: var(--dm-accent-light); }
.dm-chip.sel { background: var(--dm-accent); color: #fff; border-color: var(--dm-accent); }
.dm-chip-type { font-size: 9px; opacity: 0.65; font-family: 'JetBrains Mono', monospace; }
.dm-chip-loading { padding: 10px; color: var(--dm-muted); font-size: 12px; }

/* JSON ACTIONS */
.dm-json-row { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
.dm-json-ok  { font-size: 11px; color: var(--dm-green); font-weight: 500; }
.dm-json-err { font-size: 11px; color: var(--dm-red); font-weight: 500; }

/* BUTTONS */
.dm-btn {
  background: var(--dm-surface);
  border: 1px solid var(--dm-border);
  color: var(--dm-muted);
  cursor: pointer;
  border-radius: 5px;
  font-family: inherit;
  font-size: 11px;
  padding: 4px 9px;
  transition: all 0.12s;
}
.dm-btn:hover { border-color: var(--dm-accent); color: var(--dm-accent); }

.dm-send {
  background: var(--dm-accent);
  color: #fff;
  border: none;
  padding: 9px 22px;
  border-radius: 7px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.2px;
  transition: all 0.12s;
  display: flex;
  align-items: center;
  gap: 7px;
}
.dm-send:hover { background: var(--dm-accent-dark); }
.dm-send:disabled { opacity: 0.5; cursor: not-allowed; }
.dm-send.danger { background: var(--dm-red); }
.dm-send.danger:hover { background: #c53030; }
.dm-send.green  { background: var(--dm-green); }
.dm-send.green:hover { background: #0b8a5e; }

/* DIVIDER */
.dm-divider { height: 1px; background: var(--dm-border); margin: 14px 0; }

/* RESPONSE PANEL */
.dm-resp-panel {
  background: var(--dm-surface);
  border: 1px solid var(--dm-border);
  border-radius: 12px;
  overflow: hidden;
  max-width: 900px;
  margin: 0 auto;
  box-shadow: var(--dm-shadow);
}
.dm-resp-head {
  background: var(--dm-surface);
  border-bottom: 1px solid var(--dm-border);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.dm-resp-title { font-size: 13px; font-weight: 600; }
.dm-resp-status {
  font-size: 10.5px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
}
.dm-resp-idle { background: var(--dm-surface2); color: var(--dm-muted); }
.dm-resp-ok   { background: var(--dm-green-light); color: var(--dm-green); }
.dm-resp-err  { background: var(--dm-red-light); color: var(--dm-red); }
.dm-resp-time { font-size: 11px; color: var(--dm-muted); }
.dm-resp-body {
  padding: 14px 18px;
  overflow: auto;
  max-height: 400px;
  min-height: 90px;
  background: #1e2430;
  color: #e2e8f0;
  font-size: 12.5px;
  line-height: 1.65;
  font-family: 'JetBrains Mono', monospace;
  white-space: pre-wrap;
  word-break: break-word;
}

/* JSON SYNTAX */
.dm-jk { color: #7eb6f6; }
.dm-js { color: #7dd3a8; }
.dm-jn { color: #f9a8a8; }
.dm-jb { color: #f9b8d4; }

/* SCHEMA */
.dm-schema-tabs { display: flex; gap: 1px; background: var(--dm-bg); padding: 3px; border-radius: 7px; flex-wrap: wrap; }
.dm-schema-tab {
  background: transparent;
  border: none;
  color: var(--dm-muted);
  padding: 6px 12px;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 600;
  transition: all 0.12s;
}
.dm-schema-tab:hover { color: var(--dm-text); background: var(--dm-surface); }
.dm-schema-tab.active { color: var(--dm-accent); background: var(--dm-surface); box-shadow: var(--dm-shadow); }
.dm-schema-body { padding: 18px; position: relative; }
.dm-schema-label {
  color: var(--dm-muted);
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 7px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.dm-schema-code {
  background: #1e2430;
  border-radius: 8px;
  padding: 14px 16px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.7;
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', monospace;
  color: #e2e8f0;
}
.dm-copy-btn {
  position: absolute;
  top: 26px; right: 26px;
  background: var(--dm-accent);
  color: #fff;
  border: none;
  padding: 4px 10px;
  border-radius: 5px;
  cursor: pointer;
  font-family: inherit;
  font-size: 10px;
  font-weight: 600;
}
.dm-copy-btn:hover { background: var(--dm-accent-dark); }

@keyframes dm-spin { to { transform: rotate(360deg); } }
.dm-spin { display: inline-block; animation: dm-spin 0.6s linear infinite; }

/* ── NARROW SCREENS ───────────────────────────────────────────────────────
   The shell is a fixed 220px sidebar beside main, with no breakpoints at
   all, so below ~900px the content column had almost nothing left. Here it
   collapses to a single column and the sidebar becomes a horizontally
   scrolling strip of the same action buttons — nothing is dropped, the
   group headings just fold away since they read oddly in a single row. */
@media (max-width: 900px) {
  .dm-app {
    grid-template-areas: "topbar" "sidebar" "main";
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }

  .dm-topbar {
    padding: 8px 12px;
    flex-wrap: wrap;
    row-gap: 4px;
  }
  .dm-topbar-info { margin-left: auto; }

  .dm-sidebar {
    border-right: none;
    border-bottom: 1px solid var(--dm-border);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
  .dm-sidebar::-webkit-scrollbar { display: none; }
  .dm-sidebar { scrollbar-width: none; }

  .dm-section { display: none; }

  .dm-action-btn {
    width: auto;
    flex: 0 0 auto;
    margin-bottom: 0;
    white-space: nowrap;
  }

  .dm-main { padding: 12px; }
  .dm-pane { max-width: 100%; }
  .dm-custom-dates { grid-template-columns: 1fr; }
}
`;

// ─── SMALL REUSABLE UI ────────────────────────────────────────────────────────

const PILL_BG = { POST: "#eef0fd", GET: "#e6f7f1", DEL: "#fff0f0" };
const PILL_COLOR = { POST: "#4361ee", GET: "#0f9f6e", DEL: "#e53e3e" };
const HEADER_BG = { POST: "var(--dm-accent-light)", GET: "var(--dm-green-light)", DEL: "var(--dm-red-light)" };

const Pill = ({ type }) => (
  <span
    className="dm-card-header-pill"
    style={{ background: PILL_BG[type] || PILL_BG.POST, color: PILL_COLOR[type] || PILL_COLOR.POST }}
  >
    {type}
  </span>
);

const SpinIcon = () => (
  <svg className="dm-spin" width="13" height="13" viewBox="0 0 14 14">
    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" fill="none"
      strokeDasharray="20" strokeDashoffset="10" strokeLinecap="round" />
  </svg>
);

const SendBtn = ({ onClick, loading, variant = "" }) => (
  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
    <button className={`dm-send ${variant}`} onClick={onClick} disabled={loading}>
      {loading ? <><SpinIcon /> Sending…</> : "▶ Send Request"}
    </button>
  </div>
);

const CardWrap = ({ pillType, title, desc, children }) => (
  <div className="dm-card">
    <div className="dm-card-header" style={{ background: HEADER_BG[pillType] || "var(--dm-surface)" }}>
      <Pill type={pillType} />
      <span className="dm-card-title">{title}</span>
      <span className="dm-card-desc">{desc}</span>
    </div>
    <div className="dm-card-body">{children}</div>
  </div>
);

const ModSel = ({ value, onChange, modules }) => (
  <select className="dm-select" value={value} onChange={e => onChange(e.target.value)}>
    <option value="">— select module —</option>
    {modules.map(m => (
      <option key={m.key} value={m.key}>{m.label} ({m.key})</option>
    ))}
  </select>
);

const FieldChips = ({ fields, selected, onToggle, loading }) => {
  const [filter, setFilter] = useState("");
  const visible = filter
    ? fields.filter(f =>
      f.name.toLowerCase().includes(filter.toLowerCase()) ||
      (f.label || "").toLowerCase().includes(filter.toLowerCase())
    )
    : fields;

  if (loading) return <div className="dm-chip-loading">Loading fields…</div>;
  if (!fields.length) return <div className="dm-chip-loading">No fields found.</div>;

  return (
    <div className="dm-fields-wrap">
      <input
        className="dm-chip-search"
        type="text"
        placeholder="Search fields…"
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      <div className="dm-chip-grid">
        {visible.map(f => (
          <span
            key={f.name}
            className={`dm-chip${selected.includes(f.name) ? " sel" : ""}`}
            title={`${f.label || f.name} [${f.type}]`}
            onClick={() => onToggle(f.name, f.type)}
          >
            {f.name}
            <span className="dm-chip-type">({f.type})</span>
          </span>
        ))}
      </div>
    </div>
  );
};

const JsonBox = ({ value, onChange, rows = 6, placeholder = "{}" }) => {
  const [err, setErr] = useState("");
  const handle = e => {
    const v = e.target.value;
    try { JSON.parse(v); setErr(""); } catch (ex) { setErr(ex.message); }
    onChange(v);
  };
  const format = () => {
    try { onChange(JSON.stringify(JSON.parse(value), null, 2)); setErr(""); } catch { }
  };
  return (
    <div>
      <textarea
        className={`dm-textarea${err ? " err" : ""}`}
        rows={rows}
        value={value}
        onChange={handle}
        placeholder={placeholder}
        spellCheck={false}
      />
      <div className="dm-json-row">
        <button className="dm-btn" onClick={format}>Format</button>
        <button className="dm-btn" onClick={() => { onChange("{}"); setErr(""); }}>Clear</button>
        {err
          ? <span className="dm-json-err">✗ {err}</span>
          : <span className="dm-json-ok">✓ valid JSON</span>
        }
      </div>
    </div>
  );
};

const DATE_RANGES = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "this_week", label: "This week" },
  { key: "last_week", label: "Last week" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "custom", label: "Custom…" },
  { key: "", label: "All time" },
];

const DatePills = ({ value, onChange, customFrom, customTo, onFrom, onTo }) => (
  <div style={{ marginTop: 14 }}>
    <div className="dm-label" style={{ marginBottom: 7 }}>Date Range</div>
    <div className="dm-date-pills">
      {DATE_RANGES.map(r => (
        <button
          key={r.key === "" ? "all" : r.key}
          className={`dm-date-pill${value === r.key ? " active" : ""}`}
          onClick={() => onChange(r.key)}
        >
          {r.label}
        </button>
      ))}
    </div>
    {value === "custom" && (
      <div className="dm-custom-dates">
        <div className="dm-field">
          <label className="dm-label">From</label>
          <input type="date" className="dm-input" value={customFrom} onChange={e => onFrom(e.target.value)} />
        </div>
        <div className="dm-field">
          <label className="dm-label">To</label>
          <input type="date" className="dm-input" value={customTo} onChange={e => onTo(e.target.value)} />
        </div>
      </div>
    )}
  </div>
);

// ─── PANES ────────────────────────────────────────────────────────────────────

function PaneCreate({ modules, fieldCache, loadFields, onSend, loading }) {
  const [mod, setMod] = useState("");
  const [data, setData] = useState("{}");
  const [selected, setSelected] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const fields = mod ? fieldCache[mod] || [] : [];

  const handleMod = async m => {
    setMod(m);
    setSelected([]);
    setData("{}");
    if (m && !fieldCache[m]) {
      setFieldsLoading(true);
      await loadFields(m);
      setFieldsLoading(false);
    }
  };

  const toggleChip = (name, type) => {
    try {
      const obj = JSON.parse(data);
      if (selected.includes(name)) {
        delete obj[name];
        setSelected(prev => prev.filter(f => f !== name));
      } else {
        obj[name] = getPlaceholder(type, name);
        setSelected(prev => [...prev, name]);
      }
      setData(JSON.stringify(obj, null, 2));
    } catch { }
  };

  const send = () => {
    if (!mod) return alert("Please select a module");
    try {
      const parsed = JSON.parse(data);
      onSend({ action: "create", module: mod, data: parsed });
    } catch { alert("JSON in data is invalid"); }
  };

  return (
    <div className="dm-pane">
      <CardWrap pillType="POST" title="Create Record" desc="Creates a new record in any module">
        <div className="dm-grid">
          <div className="dm-field">
            <label className="dm-label">Module <span className="dm-req">*</span></label>
            <ModSel value={mod} onChange={handleMod} modules={modules} />
          </div>
        </div>

        {mod && (
          <>
            <div className="dm-divider" />
            <div className="dm-field">
              <label className="dm-label">
                Fields — click to add to JSON data
              </label>
              <FieldChips fields={fields} selected={selected} onToggle={toggleChip} loading={fieldsLoading} />
            </div>
          </>
        )}

        <div className="dm-divider" />
        <div className="dm-field">
          <label className="dm-label">
            Data <span className="dm-req">*</span>{" "}
            <span style={{ color: "var(--dm-hint)", fontSize: 10, textTransform: "none", fontWeight: 400 }}>
              — select fields above to populate
            </span>
          </label>
          <JsonBox value={data} onChange={setData} rows={7} />
        </div>
      </CardWrap>
      <SendBtn onClick={send} loading={loading} />
    </div>
  );
}

function PaneUpdate({ modules, fieldCache, loadFields, onSend, loading }) {
  const [mod, setMod] = useState("");
  const [id, setId] = useState("");
  const [data, setData] = useState("{}");
  const [selected, setSelected] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const fields = mod ? fieldCache[mod] || [] : [];

  const handleMod = async m => {
    setMod(m);
    setSelected([]);
    setData("{}");
    if (m && !fieldCache[m]) {
      setFieldsLoading(true);
      await loadFields(m);
      setFieldsLoading(false);
    }
  };

  const toggleChip = (name, type) => {
    try {
      const obj = JSON.parse(data);
      if (selected.includes(name)) {
        delete obj[name];
        setSelected(prev => prev.filter(f => f !== name));
      } else {
        obj[name] = getPlaceholder(type, name);
        setSelected(prev => [...prev, name]);
      }
      setData(JSON.stringify(obj, null, 2));
    } catch { }
  };

  const send = () => {
    if (!mod || !id.trim()) return alert("Module and Record ID are required");
    try {
      const parsed = JSON.parse(data);
      onSend({ action: "update", module: mod, id: id.trim(), data: parsed });
    } catch { alert("JSON in data is invalid"); }
  };

  return (
    <div className="dm-pane">
      <CardWrap pillType="POST" title="Update Record" desc="Update fields on an existing record">
        <div className="dm-grid">
          <div className="dm-field">
            <label className="dm-label">Module <span className="dm-req">*</span></label>
            <ModSel value={mod} onChange={handleMod} modules={modules} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Record ID <span className="dm-req">*</span></label>
            <input className="dm-input" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={id} onChange={e => setId(e.target.value)} />
          </div>
        </div>

        {mod && (
          <>
            <div className="dm-divider" />
            <div className="dm-field">
              <label className="dm-label">Fields — click to add to data JSON</label>
              <FieldChips fields={fields} selected={selected} onToggle={toggleChip} loading={fieldsLoading} />
            </div>
          </>
        )}

        <div className="dm-divider" />
        <div className="dm-field">
          <label className="dm-label">Data <span className="dm-req">*</span></label>
          <JsonBox value={data} onChange={setData} rows={7} />
        </div>
      </CardWrap>
      <SendBtn onClick={send} loading={loading} />
    </div>
  );
}

function PaneDelete({ modules, onSend, loading }) {
  const [mod, setMod] = useState("");
  const [id, setId] = useState("");

  const send = () => {
    if (!mod || !id.trim()) return alert("Module and Record ID are required");
    onSend({ action: "delete", module: mod, id: id.trim() });
  };

  return (
    <div className="dm-pane">
      <CardWrap pillType="DEL" title="Delete Record" desc="Soft-delete (sets deleted=1)">
        <div className="dm-grid">
          <div className="dm-field">
            <label className="dm-label">Module <span className="dm-req">*</span></label>
            <ModSel value={mod} onChange={setMod} modules={modules} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Record ID <span className="dm-req">*</span></label>
            <input className="dm-input" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={id} onChange={e => setId(e.target.value)} />
          </div>
        </div>
      </CardWrap>
      <SendBtn onClick={send} loading={loading} variant="danger" />
    </div>
  );
}

function PaneFetch({ modules, fieldCache, loadFields, onSend, loading }) {
  const [mod, setMod] = useState("");
  const [dateField, setDateField] = useState("date_entered");
  const [dateRange, setDateRange] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState("{}");
  const [search, setSearch] = useState("");
  const [searchFields, setSearchFields] = useState("");
  const [orderBy, setOrderBy] = useState("date_entered");
  const [orderDir, setOrderDir] = useState("DESC");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selected, setSelected] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const fields = mod ? fieldCache[mod] || [] : [];

  const handleMod = async m => {
    setMod(m);
    setSelected([]);
    if (m && !fieldCache[m]) {
      setFieldsLoading(true);
      await loadFields(m);
      setFieldsLoading(false);
    }
  };

  const toggleChip = (name) =>
    setSelected(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);

  const send = () => {
    if (!mod) return alert("Please select a module");
    const payload = { action: "fetch", module: mod };
    if (dateRange) {
      payload.date_range = dateRange;
      payload.date_field = dateField || "date_entered";
      if (dateRange === "custom") { payload.date_from = customFrom; payload.date_to = customTo; }
    }
    try { const f = JSON.parse(filters); if (Object.keys(f).length) payload.filters = f; } catch { }
    if (search.trim()) {
      payload.search = search.trim();
      if (searchFields.trim()) payload.search_fields = searchFields.split(",").map(s => s.trim());
    }
    if (selected.length) payload.fields = selected;
    payload.order_by = orderBy || "date_entered";
    payload.order_dir = orderDir;
    payload.page = parseInt(page) || 1;
    payload.per_page = parseInt(perPage) || 20;
    onSend(payload);
  };

  return (
    <div className="dm-pane">
      <CardWrap pillType="GET" title="Fetch / Search Records" desc="Filter, paginate, date-range, free-text">
        <div className="dm-grid">
          <div className="dm-field">
            <label className="dm-label">Module <span className="dm-req">*</span></label>
            <ModSel value={mod} onChange={handleMod} modules={modules} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Date Field</label>
            <input className="dm-input" value={dateField} onChange={e => setDateField(e.target.value)} placeholder="date_entered" />
          </div>
        </div>

        <DatePills value={dateRange} onChange={setDateRange}
          customFrom={customFrom} customTo={customTo} onFrom={setCustomFrom} onTo={setCustomTo} />

        {mod && (
          <>
            <div className="dm-divider" />
            <div className="dm-field">
              <label className="dm-label">
                Return Fields{" "}
                <span style={{ color: "var(--dm-hint)", fontSize: 10, textTransform: "none", fontWeight: 400 }}>
                  — click to select (empty = all)
                </span>
              </label>
              <FieldChips fields={fields} selected={selected} onToggle={toggleChip} loading={fieldsLoading} />
            </div>
          </>
        )}

        <div className="dm-divider" />
        <div className="dm-grid">
          <div className="dm-field">
            <label className="dm-label">Free-text Search</label>
            <input className="dm-input" placeholder="search term…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Search Fields <span style={{ color: "var(--dm-hint)", fontSize: 10 }}>(comma-sep)</span></label>
            <input className="dm-input" placeholder="name,email1,description" value={searchFields} onChange={e => setSearchFields(e.target.value)} />
          </div>
        </div>

        <div className="dm-grid" style={{ marginTop: 12 }}>
          <div className="dm-field">
            <label className="dm-label">Filters <span style={{ color: "var(--dm-hint)", fontSize: 10 }}>field=value pairs</span></label>
            <JsonBox value={filters} onChange={setFilters} rows={3} placeholder='{"status":"New"}' />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="dm-field">
              <label className="dm-label">Order By</label>
              <input className="dm-input" value={orderBy} onChange={e => setOrderBy(e.target.value)} />
            </div>
            <div className="dm-field">
              <label className="dm-label">Order Dir</label>
              <select className="dm-select" value={orderDir} onChange={e => setOrderDir(e.target.value)}>
                <option value="DESC">DESC</option>
                <option value="ASC">ASC</option>
              </select>
            </div>
          </div>
        </div>

        <div className="dm-grid" style={{ marginTop: 12 }}>
          <div className="dm-field">
            <label className="dm-label">Page</label>
            <input className="dm-input" type="number" min={1} value={page} onChange={e => setPage(e.target.value)} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Per Page</label>
            <input className="dm-input" type="number" min={1} max={200} value={perPage} onChange={e => setPerPage(e.target.value)} />
          </div>
        </div>
      </CardWrap>
      <SendBtn onClick={send} loading={loading} variant="green" />
    </div>
  );
}

function PaneFetchRelated({ modules, fieldCache, loadFields, onSend, loading }) {
  const [mod, setMod] = useState("");
  const [id, setId] = useState("");
  const [relMod, setRelMod] = useState("");
  const [dateField, setDateField] = useState("date_entered");
  const [dateRange, setDateRange] = useState("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState("{}");
  const [search, setSearch] = useState("");
  const [searchFields, setSearchFields] = useState("");
  const [orderBy, setOrderBy] = useState("date_entered");
  const [orderDir, setOrderDir] = useState("DESC");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selected, setSelected] = useState([]);
  const [fieldsLoading, setFieldsLoading] = useState(false);

  const fields = relMod ? fieldCache[relMod] || [] : [];

  const handleRelMod = async m => {
    setRelMod(m);
    setSelected([]);
    if (m && !fieldCache[m]) {
      setFieldsLoading(true);
      await loadFields(m);
      setFieldsLoading(false);
    }
  };

  const toggleChip = (name) =>
    setSelected(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);

  const send = () => {
    if (!mod || !id.trim() || !relMod) return alert("Parent Module, Parent Record ID, and Related Module are required");
    const payload = { action: "fetch_related", module: mod, id: id.trim(), related_module: relMod };
    if (dateRange) {
      payload.date_range = dateRange;
      payload.date_field = dateField || "date_entered";
      if (dateRange === "custom") { payload.date_from = customFrom; payload.date_to = customTo; }
    }
    try { const f = JSON.parse(filters); if (Object.keys(f).length) payload.filters = f; } catch { }
    if (search.trim()) {
      payload.search = search.trim();
      if (searchFields.trim()) payload.search_fields = searchFields.split(",").map(s => s.trim());
    }
    if (selected.length) payload.fields = selected;
    payload.order_by = orderBy || "date_entered";
    payload.order_dir = orderDir;
    payload.page = parseInt(page) || 1;
    payload.per_page = parseInt(perPage) || 20;
    onSend(payload);
  };

  return (
    <div className="dm-pane">
      <CardWrap pillType="GET" title="Fetch Related Records" desc="Get child/related records from a parent record">
        <div className="dm-grid">
          <div className="dm-field">
            <label className="dm-label">Parent Module <span className="dm-req">*</span></label>
            <ModSel value={mod} onChange={setMod} modules={modules} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Parent Record ID <span className="dm-req">*</span></label>
            <input className="dm-input" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={id} onChange={e => setId(e.target.value)} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Related Module <span className="dm-req">*</span></label>
            <ModSel value={relMod} onChange={handleRelMod} modules={modules} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Date Field</label>
            <input className="dm-input" value={dateField} onChange={e => setDateField(e.target.value)} />
          </div>
        </div>

        <DatePills value={dateRange} onChange={setDateRange}
          customFrom={customFrom} customTo={customTo} onFrom={setCustomFrom} onTo={setCustomTo} />

        {relMod && (
          <>
            <div className="dm-divider" />
            <div className="dm-field">
              <label className="dm-label">
                Return Fields{" "}
                <span style={{ color: "var(--dm-hint)", fontSize: 10, textTransform: "none", fontWeight: 400 }}>
                  — click to select (empty = all)
                </span>
              </label>
              <FieldChips fields={fields} selected={selected} onToggle={toggleChip} loading={fieldsLoading} />
            </div>
          </>
        )}

        <div className="dm-divider" />
        <div className="dm-grid">
          <div className="dm-field">
            <label className="dm-label">Free-text Search</label>
            <input className="dm-input" placeholder="search term…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Search Fields <span style={{ color: "var(--dm-hint)", fontSize: 10 }}>(comma-sep)</span></label>
            <input className="dm-input" placeholder="name,email1" value={searchFields} onChange={e => setSearchFields(e.target.value)} />
          </div>
        </div>

        <div className="dm-grid" style={{ marginTop: 12 }}>
          <div className="dm-field">
            <label className="dm-label">Filters</label>
            <JsonBox value={filters} onChange={setFilters} rows={3} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="dm-field">
              <label className="dm-label">Order By</label>
              <input className="dm-input" value={orderBy} onChange={e => setOrderBy(e.target.value)} />
            </div>
            <div className="dm-field">
              <label className="dm-label">Order Dir</label>
              <select className="dm-select" value={orderDir} onChange={e => setOrderDir(e.target.value)}>
                <option value="DESC">DESC</option>
                <option value="ASC">ASC</option>
              </select>
            </div>
          </div>
        </div>

        <div className="dm-grid" style={{ marginTop: 12 }}>
          <div className="dm-field">
            <label className="dm-label">Page</label>
            <input className="dm-input" type="number" min={1} value={page} onChange={e => setPage(e.target.value)} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Per Page</label>
            <input className="dm-input" type="number" min={1} max={200} value={perPage} onChange={e => setPerPage(e.target.value)} />
          </div>
        </div>
      </CardWrap>
      <SendBtn onClick={send} loading={loading} variant="green" />
    </div>
  );
}

function PaneRelationship({ action, modules, onSend, loading }) {
  const [mod, setMod] = useState("");
  const [id, setId] = useState("");
  const [relMod, setRelMod] = useState("");
  const [relId, setRelId] = useState("");
  const [relName, setRelName] = useState("");

  const isRemove = action === "remove_relationship";

  const send = () => {
    if (!mod || !id.trim() || !relMod || !relId.trim())
      return alert("Module, Record ID, Related Module, and Related Record ID are required");
    const payload = { action, module: mod, id: id.trim(), related_module: relMod, related_id: relId.trim() };
    if (relName.trim()) payload.relationship_name = relName.trim();
    onSend(payload);
  };

  return (
    <div className="dm-pane">
      <CardWrap
        pillType={isRemove ? "DEL" : "POST"}
        title={isRemove ? "Remove Relationship" : "Add Relationship"}
        desc={isRemove ? "Unlink two records" : "Link two records via a named relationship"}
      >
        <div className="dm-grid">
          <div className="dm-field">
            <label className="dm-label">Parent Module <span className="dm-req">*</span></label>
            <ModSel value={mod} onChange={setMod} modules={modules} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Parent Record ID <span className="dm-req">*</span></label>
            <input className="dm-input" placeholder="parent record UUID" value={id} onChange={e => setId(e.target.value)} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Related Module <span className="dm-req">*</span></label>
            <ModSel value={relMod} onChange={setRelMod} modules={modules} />
          </div>
          <div className="dm-field">
            <label className="dm-label">Related Record ID <span className="dm-req">*</span></label>
            <input className="dm-input" placeholder="related record UUID" value={relId} onChange={e => setRelId(e.target.value)} />
          </div>
          <div className="dm-field">
            <label className="dm-label">
              Relationship Name{" "}
              <span style={{ color: "var(--dm-hint)", fontSize: 10 }}>(optional)</span>
            </label>
            <input className="dm-input" placeholder="accounts_contacts" value={relName} onChange={e => setRelName(e.target.value)} />
          </div>
        </div>
      </CardWrap>
      <SendBtn onClick={send} loading={loading} variant={isRemove ? "danger" : ""} />
    </div>
  );
}

// ─── SCHEMA ───────────────────────────────────────────────────────────────────

const SCHEMA_TABS = [
  { key: "create", label: "create" },
  { key: "update", label: "update" },
  { key: "delete", label: "delete" },
  { key: "fetch", label: "fetch" },
  { key: "fetch_related", label: "fetch_related" },
  { key: "add_rel", label: "add_relationship" },
  { key: "rem_rel", label: "remove_relationship" },
];

const SCHEMAS = {
  create: {
    req: `{\n  "action": "create",\n  "module": "Accounts",\n  "data": {\n    "name":         "Acme Corp",\n    "phone_office": "123-456-7890",\n    "website":      "https://acme.com"\n  }\n}`,
    res: `{\n  "success": true,\n  "action":  "create",\n  "module":  "Accounts",\n  "id":      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"\n}`,
  },
  update: {
    req: `{\n  "action": "update",\n  "module": "Accounts",\n  "id":     "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",\n  "data": {\n    "phone_office": "999-000-1111"\n  }\n}`,
    res: `{\n  "success": true,\n  "action":  "update",\n  "module":  "Accounts",\n  "id":      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"\n}`,
  },
  delete: {
    req: `{\n  "action": "delete",\n  "module": "Leads",\n  "id":     "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"\n}`,
    res: `{\n  "success": true,\n  "action":  "delete",\n  "module":  "Leads",\n  "id":      "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"\n}`,
  },
  fetch: {
    req: `{\n  "action":       "fetch",\n  "module":       "Leads",\n  "date_range":   "today",\n  "date_field":   "date_entered",\n  "date_from":    "2025-01-01",\n  "date_to":      "2025-03-31",\n  "filters":      { "status": "New" },\n  "search":       "acme",\n  "search_fields":["first_name","last_name","email1"],\n  "fields":       ["first_name","last_name","status"],\n  "order_by":     "date_entered",\n  "order_dir":    "DESC",\n  "page":         1,\n  "per_page":     20\n}`,
    res: `{\n  "success":     true,\n  "action":      "fetch",\n  "module":      "Leads",\n  "total":       142,\n  "page":        1,\n  "per_page":    20,\n  "total_pages": 8,\n  "records": [\n    { "id": "...", "first_name": "John", "last_name": "Doe" }\n  ]\n}`,
  },
  fetch_related: {
    req: `{\n  "action":         "fetch_related",\n  "module":         "Accounts",\n  "id":             "acc-111",\n  "related_module": "Contacts",\n  "date_range":     "this_month",\n  "fields":         ["first_name","last_name","email1"],\n  "order_by":       "date_entered",\n  "order_dir":      "DESC",\n  "page":           1,\n  "per_page":       20\n}`,
    res: `{\n  "success":        true,\n  "action":         "fetch_related",\n  "related_module": "Contacts",\n  "total":          5,\n  "records":        [ ... ]\n}`,
  },
  add_rel: {
    req: `{\n  "action":            "add_relationship",\n  "module":            "Accounts",\n  "id":                "acc-uuid",\n  "related_module":    "Contacts",\n  "related_id":        "con-uuid",\n  "relationship_name": "accounts_contacts"\n}`,
    res: `{\n  "success":           true,\n  "action":            "add_relationship",\n  "module":            "Accounts",\n  "id":                "acc-uuid",\n  "related_module":    "Contacts",\n  "related_id":        "con-uuid"\n}`,
  },
  rem_rel: {
    req: `{\n  "action":            "remove_relationship",\n  "module":            "Accounts",\n  "id":                "acc-uuid",\n  "related_module":    "Contacts",\n  "related_id":        "con-uuid",\n  "relationship_name": "accounts_contacts"\n}`,
  },
};

function PaneSchema() {
  const [active, setActive] = useState("create");
  const s = SCHEMAS[active];
  return (
    <div className="dm-pane">
      <div className="dm-card">
        <div className="dm-card-header">
          <span style={{ fontSize: 16 }}>📄</span>
          <span className="dm-card-title">JSON Schema Reference</span>
          <span className="dm-card-desc">Request and response shapes for each action</span>
        </div>
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--dm-border)" }}>
          <div className="dm-schema-tabs">
            {SCHEMA_TABS.map(t => (
              <button key={t.key} className={`dm-schema-tab${active === t.key ? " active" : ""}`}
                onClick={() => setActive(t.key)}>{t.label}</button>
            ))}
          </div>
        </div>
        <div className="dm-schema-body">
          <div className="dm-schema-label">Request</div>
          <div style={{ position: "relative" }}>
            <button className="dm-copy-btn"
              onClick={() => navigator.clipboard.writeText(s.req).catch(() => { })}>Copy</button>
            <pre className="dm-schema-code" dangerouslySetInnerHTML={{ __html: syntaxHighlight(s.req) }} />
          </div>
          {s.res && (
            <>
              <div className="dm-schema-label" style={{ marginTop: 14 }}>Response</div>
              <pre className="dm-schema-code" dangerouslySetInnerHTML={{ __html: syntaxHighlight(s.res) }} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

const SIDEBAR = [
  { section: "Actions" },
  { key: "create", label: "Create Record", pill: "POST", icon: "➕" },
  { key: "update", label: "Update Record", pill: "POST", icon: "✏️" },
  { key: "delete", label: "Delete Record", pill: "DEL", icon: "🗑" },
  { key: "fetch", label: "Fetch / Search", pill: "GET", icon: "🔍" },
  { key: "fetch_related", label: "Fetch Related", pill: "GET", icon: "🔗" },
  { section: "Relationships" },
  { key: "add_relationship", label: "Add Relationship", pill: "POST", icon: "＋" },
  { key: "remove_relationship", label: "Remove Relationship", pill: "DEL", icon: "✖" },
  { section: "Reference" },
  { key: "schema", label: "JSON Schemas", pill: null, icon: "📄" },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function DataModellingPage() {
  const { crmEndpoint } = useSelector(s => s.user);

  const [active, setActive] = useState("create");
  const [modules, setModules] = useState([]);
  const [fieldCache, setFieldCache] = useState({});
  const [sending, setSending] = useState(false);
  const [resp, setResp] = useState({ html: "", status: "IDLE", ms: "" });

  const baseUrl = crmEndpoint ? crmEndpoint.split("index.php")[0] : "";
  const apiUrl = baseUrl ? `${baseUrl}index.php?entryPoint=smart_gateway` : "";

  useEffect(() => {
    if (!baseUrl) return;
    const url = `${baseUrl}index.php?entryPoint=get_module_list`;
    fetch(url, { credentials: "same-origin" })
      .then(r => r.json())
      .then(data => {
        if (data && typeof data === "object") {
          const list = Object.entries(data).map(([key, label]) => ({ key, label }));
          setModules(list);
        }
      })
      .catch(console.error);
  }, [baseUrl]);

  const loadFields = useCallback(async (moduleName) => {
    if (fieldCache[moduleName] !== undefined) return;
    setFieldCache(prev => ({ ...prev, [moduleName]: [] }));
    try {
      const url = `${baseUrl}index.php?entryPoint=get_fields&module_name=${encodeURIComponent(moduleName)}`;
      const r = await fetch(url, { credentials: "same-origin" });
      const data = await r.json();
      let fields = [];
      if (Array.isArray(data)) {
        fields = data.map(f => ({
          name: f.name || f.field_name || String(f),
          type: f.type || "varchar",
          label: f.label || f.name || "",
        }));
      } else if (data && typeof data === "object") {
        fields = Object.entries(data).map(([name, meta]) => ({
          name,
          type: (meta && meta.type) || "varchar",
          label: (meta && meta.label) || name,
        }));
      }
      setFieldCache(prev => ({ ...prev, [moduleName]: fields }));
    } catch {
      setFieldCache(prev => ({ ...prev, [moduleName]: [] }));
    }
  }, [baseUrl, fieldCache]);

  const handleSend = async (payload) => {
    setSending(true);
    setResp({ html: '<span style="color:#7eb6f6">Sending request…</span>', status: "...", ms: "" });
    const t0 = Date.now();
    try {
      const token = await generateToken();
      const res = await fetch(apiUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Token": token,
        },
        body: JSON.stringify(payload),
      });
      const ms = Date.now() - t0;
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch { data = { success: false, error: "Invalid JSON response", raw: text }; }
      const ok = res.ok && data?.success !== false;
      setResp({
        html: syntaxHighlight(JSON.stringify(data, null, 2)),
        status: ok ? "SUCCESS" : "ERROR",
        ms: `${ms} ms`,
      });
    } catch (err) {
      const ms = Date.now() - t0;
      setResp({
        html: syntaxHighlight(JSON.stringify({ success: false, error: err.message }, null, 2)),
        status: "ERROR",
        ms: `${ms} ms`,
      });
    } finally {
      setSending(false);
    }
  };

  const copyResp = () => {
    const el = document.getElementById("dm-resp-body");
    if (el) navigator.clipboard.writeText(el.innerText).catch(() => { });
  };
  const clearResp = () => setResp({
    html: '<span style="color:#7eb6f6;opacity:0.5;font-style:italic">Cleared.</span>',
    status: "IDLE",
    ms: "",
  });

  const sharedProps = { modules, fieldCache, loadFields, onSend: handleSend, loading: sending };

  const respStatusClass =
    resp?.status === "SUCCESS" ? "dm-resp-ok" :
      resp?.status === "ERROR" ? "dm-resp-err" : "dm-resp-idle";

  return (
    <div className="dm-wrap">
      <style>{CSS}</style>
      <div className="dm-app">

        {/* TOPBAR */}
        <header className="dm-topbar">
          <div className="dm-logo">
            <div className="dm-logo-icon">ORC</div>
            <span>Data</span> Modelling
          </div>
          <div className="dm-topbar-info">
            <span className="dm-badge">CRM API</span>
          </div>
        </header>

        {/* SIDEBAR */}
        <nav className="dm-sidebar">
          {SIDEBAR.map((item, i) =>
            item.section
              ? <div key={i} className="dm-section">{item.section}</div>
              : (
                <button
                  key={item.key}
                  className={`dm-action-btn${active === item.key ? " active" : ""}`}
                  onClick={() => setActive(item.key)}
                >
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  {item.label}
                  {item.pill && (
                    <span
                      className="dm-pill"
                      style={{
                        background: PILL_BG[item.pill],
                        color: PILL_COLOR[item.pill],
                      }}
                    >
                      {item.pill}
                    </span>
                  )}
                </button>
              )
          )}
        </nav>

        {/* MAIN */}
        <main className="dm-main">
          {active === "create" && <PaneCreate          {...sharedProps} />}
          {active === "update" && <PaneUpdate          {...sharedProps} />}
          {active === "delete" && <PaneDelete          {...sharedProps} />}
          {active === "fetch" && <PaneFetch           {...sharedProps} />}
          {active === "fetch_related" && <PaneFetchRelated    {...sharedProps} />}
          {active === "add_relationship" && <PaneRelationship action="add_relationship"    {...sharedProps} />}
          {active === "remove_relationship" && <PaneRelationship action="remove_relationship" {...sharedProps} />}
          {active === "schema" && <PaneSchema />}

          {/* RESPONSE PANEL */}
          {active !== "schema" && (
            <div className="dm-resp-panel" style={{ marginTop: 0 }}>
              <div className="dm-resp-head">
                <span style={{ fontSize: 14 }}>⌨</span>
                <span className="dm-resp-title">Response</span>
                <span className={`dm-resp-status ${respStatusClass}`}>{resp?.status}</span>
                {resp.ms && <span className="dm-resp-time">{resp.ms}</span>}
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button className="dm-btn" onClick={copyResp}>Copy</button>
                  <button className="dm-btn" onClick={clearResp}>Clear</button>
                </div>
              </div>
              <pre
                id="dm-resp-body"
                className="dm-resp-body h-[300px] min-h-[120px] max-h-[80vh] resize-y overflow-auto box-border p-3 border border-gray-700"
                dangerouslySetInnerHTML={{
                  __html:
                    resp.html ||
                    '<span style="color:#7eb6f6;opacity:0.5;font-style:italic">Waiting for request…</span>',
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}