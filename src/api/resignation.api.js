const STORAGE_KEY = "hrcrm_dummy_resignations";

// Temporary tokens copied from the sample resignation record.
export const DUMMY_RESIGNATION_TOKENS = {
  tl: "2721119326",
  manager: "7927226335",
  hr: "4788669821",
};

const wait = (milliseconds = 450) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

const readRecords = () => {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
};

const writeRecords = (records) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
};

const createDummyRecord = (email) => ({
  id: globalThis.crypto?.randomUUID?.() ?? `dummy-${Date.now()}`,
  name: email,
  lbl_tl_token: DUMMY_RESIGNATION_TOKENS.tl,
  lbl_manager_token: DUMMY_RESIGNATION_TOKENS.manager,
  lbl_hr_token: DUMMY_RESIGNATION_TOKENS.hr,
  lbl_notify_tl: "0",
  lbl_notify_manager: "0",
  lbl_notify_hr: "0",
  status: "Draft",
  date_entered: new Date().toISOString(),
  date_modified: new Date().toISOString(),
});

export const getResignationByEmail = async (email) => {
  await wait(250);

  const normalizedEmail = String(email || "").trim().toLowerCase();
  return readRecords().find(
    (record) => String(record.name || "").trim().toLowerCase() === normalizedEmail,
  ) ?? null;
};

export const ensureResignationRecord = async (email) => {
  const existing = await getResignationByEmail(email);
  if (existing) return existing;

  await wait();

  const records = readRecords();
  const record = createDummyRecord(email);
  writeRecords([...records, record]);
  return record;
};

export const updateResignationRecord = async (id, data) => {
  await wait();

  const records = readRecords();
  const recordIndex = records.findIndex((record) => record.id === id);

  if (recordIndex === -1) {
    throw new Error("Dummy resignation record was not found.");
  }

  const updatedRecord = {
    ...records[recordIndex],
    ...data,
    date_modified: new Date().toISOString(),
  };

  records[recordIndex] = updatedRecord;
  writeRecords(records);

  return {
    success: true,
    record: updatedRecord,
  };
};
