// CRM backend domain, e.g. https://flight.hrcrm.ai or https://kartikey.hrcrm.ai.
// Set VITE_CRM_URL in .env to switch every CRM request to another domain.
export const CRM_BASE_URL = (import.meta.env?.VITE_CRM_URL || "https://flight.hrcrm.ai").replace(/\/+$/, "");

/** The CRM's index.php, which every entry point (smart_gateway, hrc, flexibility, ...) goes through. */
export const CRM_ENDPOINT = `${CRM_BASE_URL}/index.php`;
