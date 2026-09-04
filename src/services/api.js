import axios from "axios";
import { FETCH_GPC_X_API_KEY } from "../store/constants";
import CryptoJS from "crypto-js";
const SECRET = import.meta.env.VITE_SMARTGATEWAY_SECRET_KEY;
import { store } from "../store/store";
import { getCRM, getCurrentUser } from "./utils";

let CRMENDPOINT = "";
let DB_NAME = "";
let USER_EMAIL = "";
const getCurrentUserId = () => getCurrentUser()?.id;


export function setConfig(endpoint, db_name, dash_user_email) {
  CRMENDPOINT = endpoint;
  DB_NAME = db_name;
  USER_EMAIL = dash_user_email;
}

const apiClient = axios.create({
  baseURL: "",
});

export const apiRequest = async ({
  endpoint,
  method = "GET",
  body = null,
  headers = {},
  params = {},
  withCredentials = false,
}) => {
  const params1 = {
    ...params,
    ...(DB_NAME ? { db_name: DB_NAME } : {}),
    ...(USER_EMAIL ? { dash_user_email: USER_EMAIL } : {}),
  }
  const response = await apiClient({
    url: endpoint,
    method,
    data: body,
    headers,
    params: {
      ...params1
    },
    withCredentials,
  });
  return response.data;
};




const generateToken = () => {
  const payload = {
    ts: Math.floor(Date.now() / 1000),
    source: "claude-mcp",
  };

  const json = JSON.stringify(payload);

  const signature = CryptoJS.HmacSHA256(json, SECRET).toString(
    CryptoJS.enc.Hex
  );

  return btoa(`${json}||${signature}`);
};

export const http = async ({
  endpoint = '',
  method = "GET",
  rightee = false,
  body = null,
  params = {},
  headers = {},
}) => {
  const params1 = DB_NAME ? { ...params, db_name: DB_NAME } : params;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  // Generate token
  const token = generateToken();

  const requestHeaders = {
    "X-Api-Token": token,
    ...headers,
  };

  if (!isFormData && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await apiClient({
    url: `${rightee ? 'https://crm.outrightsystems.org/index.php' : endpoint || getCRM()}?entryPoint=smart_gateway`,
    method,
    data: body,
    params: params1,
    headers: requestHeaders,
  });

  return response.data;
};
export const smartGateway = async ({
  method = "GET",
  rightee = false,
  body = null,
  params = {},
  headers = {},
}) => {
  const params1 = DB_NAME ? { ...params, db_name: DB_NAME } : params;

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  // Generate token
  const token = generateToken();

  const requestHeaders = {
    "X-Api-Token": token,
    ...headers,
  };

  if (!isFormData && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await apiClient({
    url: `${rightee ? 'https://crm.outrightsystems.org/index.php' : getCRM()}?entryPoint=smart_gateway`,
    method,
    data: body,
    params: params1,
    headers: requestHeaders,
  });

  return response.data;
};
export const fetchGpc = async ({
  method = "GET",
  body = null,
  params = {},
  headers = {},
}) => {
  // console.log(`Current User ID: ${getCurrentUserId()}`);
  const params1 = {
    ...params,
    ...(DB_NAME ? { db_name: DB_NAME } : {}),
    ...(USER_EMAIL ? { dash_user_email: USER_EMAIL } : {}),
  };
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const requestHeaders = {
    "X-Api-Key": FETCH_GPC_X_API_KEY,
    ...headers,
  };

  if (!isFormData && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await apiClient({
    url: CRMENDPOINT,
    method,
    data: body,
    params: params1,
    headers: requestHeaders,
  });

  return response.data;
};
