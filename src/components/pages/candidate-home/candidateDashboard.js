import { candidateInterviewStatus } from "../interviews/candidateInterviewData.js";
import { interviewDate } from "../interviews/interviewUtils.js";

const lower = (value) => String(value ?? "").trim().toLowerCase();

export const personalFields = [
  "first_name", "last_name", "email1", "phone_mobile",
  "current_designation", "primary_address_city", "description", "profile_image",
];

/** Derive the candidate-facing hiring stepper from CRM status, applications and interviews. */
export function hiringProgress({ candidate, applications = [], interviews = [] }) {
  const candidateStates = [lower(candidate?.status), lower(candidate?.hrc_stages_id_c_name)];
  const applicationStates = applications.map((record) => lower(record.status));
  const interviewStates = interviews.map((record) =>
    candidateInterviewStatus({ interview_status: record.status, interview_datetime: record.scheduledAt }).key);
  const hired = applicationStates.includes("accepted") ||
    candidateStates.some((state) => ["hired", "selected", "joined", "accepted"].includes(state));
  const declined = !hired && (
    candidateStates.includes("rejected") ||
    (applicationStates.length > 0 && applicationStates.every((state) => state.startsWith("rejected"))) ||
    interviewStates.at(-1) === "failed"
  );
  const interviewed = interviews.length > 0;
  const shortlisted = interviewed || candidateStates.includes("shortlisted");
  const applied = applications.length > 0 || shortlisted;
  // A saved profile is already with HR, so the first step is active even before applying to a role.
  const reached = hired || declined ? 3 : interviewed ? 2 : shortlisted ? 1 : applied || candidate?.id ? 0 : -1;
  const labels = ["Application received", "Shortlisted", "Interview", hired ? "Hired" : declined ? "Not selected" : "Final decision"];
  const steps = labels.map((label, index) => ({
    label,
    state: index > reached ? "upcoming"
      : index === 3 ? (declined ? "declined" : "done")
      : index === reached ? "current" : "done",
  }));
  const message = hired ? "Congratulations! You have been selected. HR will reach out with the next steps."
    : declined ? "This process has closed. Keep your profile updated and explore other open roles."
    : interviewed ? "You are in the interview stage. Check your schedule for upcoming rounds."
    : shortlisted ? "You have been shortlisted. HR will schedule your interview soon."
    : applied ? "Your application is with the hiring team for review."
    : candidate?.id ? "Your profile has been received. Apply to an open role to move forward."
    : "Apply to an open role to start your hiring journey.";
  return { steps, message };
}

/** Score how complete the candidate profile is, out of 100. */
export function profileStrength(draft, counts = {}) {
  const items = [
    { key: "personal", label: "Personal details", value: personalFields.filter((key) => draft?.[key]).length, max: personalFields.length },
    { key: "experiences", label: "Work experience", value: Math.min(counts.experiences ?? 0, 2), max: 2 },
    { key: "education", label: "Education", value: Math.min(counts.education ?? 0, 1), max: 1 },
    { key: "skills", label: "Skills", value: Math.min(counts.skills ?? 0, 5), max: 5 },
  ];
  const score = Math.round(items.reduce((total, item) => total + item.value / item.max, 0) / items.length * 100);
  return { score, items };
}

/** The earliest scheduled round that has not happened yet. */
export function nextInterview(interviews = [], now = Date.now()) {
  return interviews
    .map((record) => ({ record, date: interviewDate(record.scheduledAt) }))
    .filter(({ record, date }) => date &&
      candidateInterviewStatus({ interview_status: record.status, interview_datetime: record.scheduledAt }, now).key === "scheduled")
    .sort((left, right) => left.date - right.date)[0] || null;
}
