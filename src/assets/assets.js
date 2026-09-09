import loginImg from "./loginPage.jpg";
export const logo = "https://app.hrcrm.ai/headingShortLogo.png";
export const headingLogo = "https://app.hrcrm.ai/headingLogo.png";
export const logingImg = loginImg;




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






