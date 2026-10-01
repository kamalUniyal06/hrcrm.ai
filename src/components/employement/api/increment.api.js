import { http } from "@/services/api";

const INCREMENT_MODULE = "hrc_increment";
const QUESTION_MODULE = "hrc_increment_questions";
const REPLY_MODULE = "hrc_increment_replies";
const SALARY_MODULE = "hrc_salaries";
const PAGE_SIZE = 100;
const FALLBACK_SALARY = 15000;
const MONTHS_IN_YEAR = 12;

const assertSuccess = (response, fallbackMessage) => {
  if (response?.success !== true) {
    throw new Error(response?.message || response?.error || fallbackMessage);
  }
  return response;
};

const activeRecords = (response) =>
  (Array.isArray(response?.records) ? response.records : []).filter(
    (record) => String(record.deleted) !== "1",
  );

export const incrementStorageKey = (email) =>
  `hrcrm:pending-increment:${String(email || "anonymous").trim().toLowerCase()}`;

export const getRememberedIncrementId = (email) => {
  try {
    return localStorage.getItem(incrementStorageKey(email)) || "";
  } catch {
    return "";
  }
};

export const rememberIncrementId = (email, id) => {
  try {
    if (id) localStorage.setItem(incrementStorageKey(email), id);
  } catch {
    // The request still works when browser storage is unavailable.
  }
};

export const clearRememberedIncrement = (email) => {
  try {
    localStorage.removeItem(incrementStorageKey(email));
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
};

const fetchLatestSalaryFor = async (filters) => {
  const response = assertSuccess(
    await http({
      method: "POST",
      body: {
        action: "fetch",
        module: SALARY_MODULE,
        filters,
        page: 1,
        per_page: 1,
        order_by: "date_entered",
        order_dir: "DESC",
      },
    }),
    "Could not load the current salary.",
  );
  return activeRecords(response)[0] || null;
};

export const fetchCurrentSalary = async (employeeId) => {
  const normalizedId = String(employeeId || "").trim();
  if (!normalizedId) {
    return {
      amount: FALLBACK_SALARY * MONTHS_IN_YEAR,
      monthlyAmount: FALLBACK_SALARY,
      isFallback: true,
    };
  }

  const filterKeys = [
    "hrc_employees_hrc_salaries_1hrc_employees_ida",
    "employee_id",
  ];

  for (const key of filterKeys) {
    try {
      const record = await fetchLatestSalaryFor({ [key]: normalizedId });
      const amount = Number(record?.offered_salary);
      if (Number.isFinite(amount) && amount > 0) {
        return {
          amount: amount * MONTHS_IN_YEAR,
          monthlyAmount: amount,
          isFallback: false,
          record,
        };
      }
    } catch {
      // Try the next supported employee relationship field.
    }
  }

  return {
    amount: FALLBACK_SALARY * MONTHS_IN_YEAR,
    monthlyAmount: FALLBACK_SALARY,
    isFallback: true,
  };
};

export const createIncrement = async ({ currentSalary, expectedSalary }) => {
  const response = assertSuccess(
    await http({
      method: "POST",
      body: {
        action: "create",
        module: INCREMENT_MODULE,
        data: {
          name: String(currentSalary),
          description: String(expectedSalary),
        },
      },
    }),
    "Could not create your increment request.",
  );

  const id =
    response?.record?.id ||
    response?.data?.id ||
    response?.id ||
    response?.record_id;
  if (!id) throw new Error("The request was created but its ID was not returned.");
  return { ...response, id };
};

export const fetchIncrementQuestions = async () => {
  const response = assertSuccess(
    await http({
      method: "POST",
      body: {
        action: "fetch",
        module: QUESTION_MODULE,
        page: 1,
        per_page: PAGE_SIZE,
        order_by: "date_entered",
        order_dir: "ASC",
      },
    }),
    "Could not load the increment questions.",
  );
  return activeRecords(response);
};

export const fetchIncrementReplies = async (incrementId) => {
  if (!incrementId) return [];
  const response = assertSuccess(
    await http({
      method: "POST",
      body: {
        action: "fetch",
        module: REPLY_MODULE,
        filters: { increment_id: incrementId },
        page: 1,
        per_page: PAGE_SIZE,
      },
    }),
    "Could not load your saved answers.",
  );
  return activeRecords(response);
};

export const getPendingIncrement = async (incrementId) => {
  if (!incrementId) return null;
  const [questions, replies] = await Promise.all([
    fetchIncrementQuestions(),
    fetchIncrementReplies(incrementId),
  ]);
  const answeredIds = new Set(replies.map((reply) => String(reply.question_id)));
  const pendingQuestions = questions.filter(
    (question) => !answeredIds.has(String(question.id)),
  );
  return { incrementId, questions, replies, pendingQuestions };
};

export const createIncrementReply = async ({ incrementId, questionId, answer }) => {
  if (!incrementId || !questionId || !String(answer || "").trim()) {
    throw new Error("An increment, question, and answer are required.");
  }
  return assertSuccess(
    await http({
      method: "POST",
      body: {
        action: "create",
        module: REPLY_MODULE,
        data: {
          increment_id: incrementId,
          question_id: questionId,
          description: String(answer).trim(),
        },
      },
    }),
    "Could not save your answer.",
  );
};
