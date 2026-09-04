function addOneWeek(dateStr) {
  // 👉 If dateStr is null/undefined/invalid, use current date & time
  let date = dateStr ? new Date(dateStr) : new Date();

  // Extra safety: handle invalid date strings
  if (isNaN(date.getTime())) {
    date = new Date();
  }

  date.setDate(date.getDate() + 7);

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = String(date.getFullYear()).slice(-2);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
}

function addOneMonth(dateStr) {
  let date = dateStr ? new Date(dateStr) : new Date();

  // Extra safety: handle invalid date strings
  if (isNaN(date.getTime())) {
    date = new Date();
  }
  date.setMonth(date.getMonth() + 1);

  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = String(date.getFullYear()).slice(-2);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
}

export function buildTable(data, type, webKey, amtKey) {
  if (!Array.isArray(data) || data.length === 0) {
    return `<p style="font-size:14px;color:#999;">No data available</p>`;
  }

  const rows = data
    .map(
      (deal) => `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;">
            ${deal[webKey]}
          </td>
          <td style="padding:12px;text-align:right;border-bottom:1px solid #eee;">
            $${deal[amtKey]}
          </td>
        </tr>
      `,
    )
    .join("");

  return `
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <thead>
        <tr style="background:#FFF4D4;border-bottom:2px solid #FFD166;">
          <th style="padding:12px;text-align:left;">Website</th>
          <th style="padding:12px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export default function Preview({
  templateData,
  data,
  type,
  userEmail,
  websiteKey,
  amountKey,
}) {
  let html = templateData?.[0]?.body_html || "";
  const tableHtml = buildTable(data, type, websiteKey, amountKey);

  html = html
    .replace("{{USER_EMAIL}}", userEmail)
    .replace("{{TABLE}}", tableHtml);
  return html;
}
