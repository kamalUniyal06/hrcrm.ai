import { http } from "../services/api";
import { getMetadataEndpoint } from "../utils/sidebarLayout";
import { loadTableViewRegistry } from "../utils/tableViewRegistry";

export const fetchTableViewRegistry = () => {
  const endpoint = getMetadataEndpoint();
  return loadTableViewRegistry((body) => http({ endpoint, method: "POST", body }));
};
