/**
 * Encrypted employee names for the Haunted Office game link.
 * Copied from the game's src/game/token.js; the two must stay identical or the game
 * can't read the name. Token = 'v1.' + base64url(iv) + '.' + base64url(ciphertext) + '.' + base64url(hmac).
 * Keys: sha256(secret + ':aes') for AES-256-CBC, sha256(secret + ':hmac') for HMAC-SHA256.
 */

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), (c) => c.charCodeAt(0));
const concat = (a, b) => {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
};

async function deriveKeys(secret) {
  const aesRaw = await subtle.digest("SHA-256", enc.encode(`${secret}:aes`));
  const macRaw = await subtle.digest("SHA-256", enc.encode(`${secret}:hmac`));
  return {
    aes: await subtle.importKey("raw", aesRaw, "AES-CBC", false, ["encrypt", "decrypt"]),
    mac: await subtle.importKey("raw", macRaw, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]),
  };
}

/** "Priya Sharma" → "priya-sharma", the game's default player id. */
export const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "player";

export async function encryptName(name, extra = {}, secret) {
  if (!secret) throw new Error("The game key is not configured.");
  const { aes, mac } = await deriveKeys(secret);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const payload = enc.encode(JSON.stringify({ name: name.trim().slice(0, 24), emp: (extra.emp || slug(name)).slice(0, 32), iat: Math.floor(Date.now() / 1000) }));
  const ct = new Uint8Array(await subtle.encrypt({ name: "AES-CBC", iv }, aes, payload));
  const sig = new Uint8Array(await subtle.sign("HMAC", mac, concat(iv, ct)));
  return `v1.${b64url(iv)}.${b64url(ct)}.${b64url(sig)}`;
}

/** The game's check, kept here so tests can prove a token round-trips. */
export async function decryptName(token, secret) {
  try {
    const [v, ivS, ctS, sigS] = String(token || "").split(".");
    if (v !== "v1" || !ivS || !ctS || !sigS || !secret) return null;
    const { aes, mac } = await deriveKeys(secret);
    const iv = unb64url(ivS), ct = unb64url(ctS), sig = unb64url(sigS);
    if (!(await subtle.verify("HMAC", mac, sig, concat(iv, ct)))) return null;
    const data = JSON.parse(dec.decode(await subtle.decrypt({ name: "AES-CBC", iv }, aes, ct)));
    return typeof data.name === "string" ? { name: data.name.slice(0, 24), emp: String(data.emp || slug(data.name)).slice(0, 32) } : null;
  } catch {
    return null;
  }
}

// The game reads the token from ?t=…, so it goes in the query string, not the path.
export function hauntedOfficeLink(baseUrl, token) {
  const url = new URL(baseUrl);
  url.searchParams.set("t", token);
  return url.toString();
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

// A link a phone can open. A phone can't reach "localhost", so when the HR app itself was
// opened from a network address (e.g. 192.168.1.20), the game link uses that host instead.
// `reachable` is false when no phone could open the link.
export function phoneLink(link, pageHostname = "") {
  const url = new URL(link);
  if (!LOCAL_HOSTS.has(url.hostname)) return { link: url.toString(), reachable: true };
  if (pageHostname && !LOCAL_HOSTS.has(pageHostname)) {
    url.hostname = pageHostname;
    return { link: url.toString(), reachable: true };
  }
  return { link: url.toString(), reachable: false };
}

// The game's leaderboard page sits next to it: <game url>/board.html.
export function hauntedOfficeBoardLink(baseUrl) {
  const base = new URL(baseUrl);
  base.search = "";
  base.hash = "";
  if (!base.pathname.endsWith("/")) base.pathname = base.pathname.replace(/[^/]*$/, "");
  return new URL("board.html", base).toString();
}

// Who plays: the display name, and a stable 32-character id (the employee id without dashes).
export function hauntedOfficePlayer({ name, email, employeeId }) {
  const cleanName = String(name || "").trim() || String(email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const emp = String(employeeId || "").replace(/-/g, "").slice(0, 32) || slug(String(email || cleanName));
  return { name: cleanName || "Player", emp };
}

// "a@x.com, B@x.com; c@x.com" → a set of lower-case emails.
export const parseEmailList = (value) =>
  new Set(String(value ?? "").split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean));

// Who gets the Halloween look and the game (VITE_SHOW_HALLOWEEN_THEME):
// "admin" = admins only, "all" = every employee and admin, "off" = nobody.
// Unset or unknown means "all". Candidates never see it, and neither does anyone whose
// email is in `excluded` (VITE_HALLOWEEN_EXCLUDED_EMAILS). Emails in `allowed`
// (VITE_HALLOWEEN_ALLOWED_EMAILS) always see it, whatever the setting or role,
// unless they are also excluded.
export function canSeeHalloween(setting, { isAdmin = false, isEmployee = false, email = "" } = {}, excluded = "", allowed = "") {
  const audience = String(setting ?? "").trim().toLowerCase();
  const address = String(email ?? "").trim().toLowerCase();
  if (parseEmailList(excluded).has(address)) return false;
  if (parseEmailList(allowed).has(address)) return true;
  if (["off", "none", "false", "0"].includes(audience)) return false;
  if (audience === "admin") return Boolean(isAdmin);
  return Boolean(isAdmin || isEmployee);
}

// Decorations and the game button show from 15 October to 2 November.
export function isHalloweenSeason(now = new Date()) {
  const month = now.getMonth();
  const day = now.getDate();
  return (month === 9 && day >= 15) || (month === 10 && day <= 2);
}
