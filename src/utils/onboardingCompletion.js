import { apiRequest, fetchGpc } from "../services/api";
import { CREATE_DEAL_API_KEY } from "../store/constants";

export const ONBOARDING_STEP = {
  PROFILE_STARTED: 0,
  WEBSITE_ADDED: 1,
  TEMPLATE_READY: 2,
  FIRST_SYNC_DONE: 3,
};

export const ONBOARDING_MODULE = "outr_onboarding";
export const ONBOARDING_STATUS_ENDPOINT =
  "https://crm.outrightsystems.org/index.php?entryPoint=trynow";

const getPostAllEndpoint = (crmEndpoint) =>
  `https://crm.outrightsystems.org/index.php?entryPoint=get_post_all`;

const getPostAllHeaders = () => ({
  "x-api-key": CREATE_DEAL_API_KEY,
  "Content-Type": "application/json",
});

const getRows = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.data)) return data.data.data;
  if (data?.data && typeof data.data === "object") return [data.data];
  return [];
};

export const getOnboardingRecordName = ({ user, businessEmail } = {}) =>
  businessEmail

export const getStepFromUiManage = (uiManage) => {
  const step = Number.parseInt(String(uiManage ?? "").trim(), 10);
  return Number.isFinite(step) ? step : 0;
};

const getRecordUiManage = (record) =>
  record?.ui_manage ?? record?.ui_mange ?? record?.manage_ui;

export const isSignupIncompleteRecord = (record) => {
  const onboardingStage = Number.parseInt(
    String(record?.onboarding_stage ?? "").trim(),
    10,
  );
  const uiManage = getRecordUiManage(record);

  return (
    Number.isFinite(onboardingStage) &&
    onboardingStage <= 2 &&
    (uiManage === null || uiManage === undefined || uiManage === "")
  );
};

export const fetchOnboardingStatus = async (email) => {
  if (!email) return { record: null, step: 0, signupIncomplete: false };

  const data = await apiRequest({
    endpoint: ONBOARDING_STATUS_ENDPOINT,
    params: {
      email,
      check_status: 1,
    },
  });

  const record = getRows(data)[0] ?? null;

  return {
    record,
    step: getStepFromUiManage(getRecordUiManage(record)),
    signupIncomplete: isSignupIncompleteRecord(record),
  };
};

export const fetchOnboardingProgress = async ({ name }) => {
  return fetchOnboardingStatus(name);
};

export const upsertOnboardingProgress = async ({
  crmEndpoint,
  name,
  step,
}) => {
  if (!crmEndpoint || !name || !step) return { record: null, step: 0 };

  const current = await fetchOnboardingStatus(name);
  if (current.record && current.step >= step) return current;
  if (!current.record?.id) {
    throw new Error("Unable to find onboarding record for this email");
  }

  const data = await apiRequest({
    endpoint: getPostAllEndpoint(crmEndpoint),
    method: "POST",
    params: { action_type: "post_data" },
    body: {
      parent_bean: {
        module: ONBOARDING_MODULE,
        id: current.record.id,
        name,
        ui_manage: String(step),
      },
    },
    headers: getPostAllHeaders(),
  });

  if (data?.success === false) {
    throw new Error(data.message || "Unable to update onboarding step");
  }

  return {
    record: { ...current.record, ui_manage: String(step) },
    step,
  };
};

export const hasContactInfoRecord = async () => {
  const data = await fetchGpc({
    params: { type: "contacts", page: 1, page_size: 1 },
  });

  const records = Array.isArray(data?.data) ? data.data : [];
  const count = Number(data?.data_count ?? data?.count ?? records.length ?? 0);

  return count > 0 || records.length > 0;
};
