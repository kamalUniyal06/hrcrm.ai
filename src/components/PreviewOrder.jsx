export const createPreviewOrder = ({ templateData, order, userEmail }) => {
  let html = templateData?.[0]?.body_html || "";
  const dofollowLink = order?.seo_backlinks?.find(l => l?.link_type == "dofollow")
  html = html
    .replace("{{ORDER_ID}}", order?.order_id ?? "_")
    .replace("{{NAME}}", userEmail)
    .replace("{{DATE}}", order?.date_modified_formatted ?? "_")
    .replace("{{STATUS}}", order?.order_status ?? "_")
    .replace("{{ORDER_TYPE}}", order?.order_type)
    .replace("{{AMOUNT}}", order?.total_amount_c ?? "_")
    .replace("{{LINK_backlink_url}}", dofollowLink?.backlink_url ?? "")
    .replace("{{LINK_NAME}}", dofollowLink?.name ?? "")
    .replace("{{LINK_gp_doc_url_c}}", dofollowLink?.gp_doc_url_c ?? "")
    .replace("{{LINK_target_url_c}}", dofollowLink?.target_url_c ?? "")
    .replace("{{Live Link}}", dofollowLink?.target_url_c ?? "")
    .replace("{{LINK_anchor_text_c}}", dofollowLink?.anchor_text_c ?? "")
    .replace("{{Invoice_link}}", order?.invoice_link_c ?? "");
  return html;
};

