import { candidateInterviewStatus } from "../interviews/candidateInterviewData.js";
import { experienceDateForInput } from "../profile/experienceDates.js";

const lower = (value) => String(value ?? "").trim().toLowerCase();

function experienceDateLabel(value) {
  const text = experienceDateForInput(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(`${text}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== text) return text;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
  });
}

/** Show the saved calendar days without losing precision or shifting timezones. */
export function experienceDateRange(item) {
  const start = experienceDateLabel(item.joining_date);
  const end = experienceDateLabel(item.leaving_date);
  if (!start) return end ? `Until ${end}` : "";
  return `${start} – ${end || "Present"}`;
}

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

export { nextInterview } from "../interviews/candidateInterviewData.js";
