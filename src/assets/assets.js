import loginImg from "./loginPage.jpg";
import duplicateImg from "./duplicate.png";
import headingLogoImg from "./headingLogo.webp";
import send from "./send.png";
import preview from "./preview.png";
import onlyupdate from "./onlyupdate.png";
import update_With_send from "./update_With_send.jpg";
export const  logo="https://app.hrcrm.ai/headingShortLogo.png";
export const  headingLogo="https://app.hrcrm.ai/headingLogo.png";
export const logingImg = loginImg;
export const images = { duplicateImg };
import DOMPurify from "dompurify";

export const getDomain = (url) => {
  if (!url) return "";
  if (url.includes("/index.php")) {
    return url.split("/index.php")[0];
  }
  return url;
}

export const periodOptions = [
  { period: null, title: "All" },
  { period: "today", title: "Today" },
  { period: "yesterday", title: "Yesterday" },
  { period: "this_week", title: "This week" },
  { period: "last_7_days", title: "Last 7 days" },
  { period: "last_30_days", title: "Last 30 days" },
  { period: "this_month", title: "This month" },
  { period: "last_month", title: "Last month" },
  { period: "last_3_months", title: "Last 3 months" },

];



export function excludeName(str) {
  if (str?.includes("<")) {
    return str.split("<")[0].trim();
  }
  return str;
}

export const showConsole = localStorage.getItem("showConsole") === "true";


// Helper: decode Base64 → UTF-8 string
export function base64ToUtf8(base64) {
  try {
    // atob gives binary string; decodeURIComponent + escape handle UTF-8 chars
    return decodeURIComponent(
      Array.prototype.map
        .call(
          atob(base64),
          (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
        )
        .join("")
    );
  } catch (e) {
    // fallback to plain atob (may break for multi-byte chars)
    try {
      return atob(base64);
    } catch {
      return "";
    }
  }
}


export const extractEmail = (str) => {
  if (str?.includes("<")) {
    return str.split("<")[1].split(">")[0].trim();
  }
  return str.trim();

}

export const getSafeHTML = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "span", "div"
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    FORBID_TAGS: ["style", "script"],
    FORBID_ATTR: ["style", "onerror", "onclick"],
  });
};


export const sendEmailBtn = send;
export const previewBtn = preview;
export const updatesentBtn = onlyupdate;
export const updateBtn = update_With_send;
