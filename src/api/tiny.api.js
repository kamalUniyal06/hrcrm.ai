import { apiRequest } from "../services/api";


export const getTinyKey = async () => {
    const existingKey = localStorage.getItem("tinyKey");

    if (existingKey) { return existingKey }
    const data = await apiRequest({
        endpoint: "https://crm.outrightsystems.org/index.php",
        params: { entryPoint: "get_tiny" },
        headers: { "X-Api-Key": import.meta.env.VITE_TINY_MCE_KEY_X_API_KEY },
    });



    return data?.token;
};
