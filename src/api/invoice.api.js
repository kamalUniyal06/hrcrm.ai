import { http } from "../services/api";
import { buildTableRequestBody } from "../utils/preferenceStorage";

export const getAllInvoice = ({ preferences, page = 1, email }) => {
  const params = email ? { email } : {};
  return http({
    method: "POST",
    params: { ...params },
    body: {
      action: "fetch",
      module: "outr_paypal_invoice_links",
      page: page,
      per_page: 20,
      ...buildTableRequestBody(preferences),
    },
  });
};

export const getInvoiceStats = ({ filters, email }) => {
  const params = email ? { email } : {};

  return http({
    method: "POST",
    params: { ...params },
    body: {
      action: "get_stats",
      ...buildTableRequestBody(filters),
      queries: [
        {
          key: "SENT",
          module: "outr_paypal_invoice_links",
          sum_of: ["amount_c"],
          filters: {
            status_c: "SENT",
          },
        },
        {
          key: "PAID",
          module: "outr_paypal_invoice_links",
          sum_of: ["amount_c"],

          filters: {
            status_c: "PAID",
          },
        },
        {
          key: "DRAFT",
          module: "outr_paypal_invoice_links",
          sum_of: ["amount_c"],

          filters: {
            status_c: "DRAFT",
          },
        },
        {
          key: "all",
          module: "outr_paypal_invoice_links",
        },
      ],
    },
  });
};

export const getInvoiceById = (id) =>
  http({
    method: "POST",
    body: {
      action: "fetch",
      module: "outr_paypal_invoice_links",
      filters: { id },
    },
  });
export const updateInvoice = async (payload) => {
  const response = await http({
    method: "POST",
    body: {
      action: "update",
      module: "outr_paypal_invoice_links",
      id: payload.id, // required
      data: {
        ...payload,
      },
    },
  });

  return response;
};
