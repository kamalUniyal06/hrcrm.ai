export const FIRST_SYNC_EVENT = "guestpostcrm:first-sync";
export const ALLOWED_SITES_MODULE = "outr_allowed_sites";

export const TINY_INIT = {
  license_key: 'gpl',

  height: "100%",
  menubar: "file edit view insert format tools table help",
  branding: false,
  statusbar: true,
  plugins: `
    advlist autolink directionality visualblocks visualchars wordcount
    fullscreen preview searchreplace insertdatetime lists link image media
    table charmap pagebreak nonbreaking anchor code codesample help
    emoticons quickbars
  `,
  toolbar: `
    undo redo | blocks fontfamily fontsize |
    bold italic underline strikethrough forecolor backcolor |
    alignleft aligncenter alignright alignjustify |
    bullist numlist outdent indent |
    link image media table | preview fullscreen | code help
  `,
  toolbar_mode: "sliding",
  quickbars_selection_toolbar:
    "bold italic underline | quicklink h2 h3 blockquote",
  quickbars_insert_toolbar: "image media table",
  image_advtab: true,
  image_caption: true,
  image_title: true,
  automatic_uploads: true,
  table_advtab: true,
  table_cell_advtab: true,
  table_row_advtab: true,
  table_resize_bars: true,
  link_assume_external_targets: true,
  link_context_toolbar: true,
  contextmenu: "link image table",
  resize: true,
  content_style: `
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 15px;
      line-height: 1.6;
      color: #333;
    }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    table, th, td { border: 1px solid #ccc; }
    th, td { padding: 8px; }
  `,
};

export const createEmptyWebsiteForm = () => ({
  name: "",
  minimum_price: "",
  amount: "",
});

export const getOnboardingTemplateValue = (template) =>
  template?.onboarding ??
  template?.on_boarding ??
  template?.is_onboarding ??
  template?.onboarding_template;

export const isOnboardingTemplate = (template) => {
  const value = getOnboardingTemplateValue(template);
  if (value === true) return true;
  return String(value ?? "").trim().toLowerCase() === "1";
};

export const normalizeTemplateRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.templates)) return data.templates;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.emailTemplates)) return data.emailTemplates;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.templates)) return data.data.templates;
  if (Array.isArray(data?.data?.records)) return data.data.records;
  if (Array.isArray(data?.data?.emailTemplates)) return data.data.emailTemplates;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.result?.templates)) return data.result.templates;
  return [];
};

export const getTemplateHtml = (template) =>
  template?.body_html || template?.html || template?.body || "";

export const getTemplateKey = (template) =>
  String(template?.id || template?.name || template?.stage || "");

export const getUserName = (user) =>
  user?.name || user?.full_name || user?.first_name || user?.user_name || "User";

export const decodeHtmlEntities = (str) => {
  if (!str) return str;
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
};

export const broadcastSyncState = (detail) => {
  window.dispatchEvent(new CustomEvent(FIRST_SYNC_EVENT, { detail }));
};

export const getMappableWebsiteFields = (availableFields = {}) => {
  const skipFields = new Set([
    "id",
    "date_entered",
    "date_modified",
    "modified_user_id",
    "modified_by_name",
    "created_by",
    "created_by_name",
    "deleted",
    "created_by_link",
    "modified_user_link",
    "assigned_user_id",
    "assigned_user_name",
    "assigned_user_link",
    "description",
    "li_count",
    "gp_count",
  ]);

  return Object.entries(availableFields)
    .filter(([key]) => !skipFields.has(key))
    .map(([key, meta]) => ({
      key,
      label: meta.label
        .replace(/^LBL_/, "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      required: meta.required,
    }));
};
