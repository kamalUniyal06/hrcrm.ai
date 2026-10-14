import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
  ChevronDown,
  FileText,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  createCandidateRelated,
  fetchCandidateRelated,
  findCandidate,
  normalizeCandidate,
  saveCandidate,
  saveCandidateRelated,
} from "./candidateApi";
import CandidatePhotoUpload from "./CandidatePhotoUpload";
import CandidatePersonalDetails from "./CandidatePersonalDetails";
import ProfileSetupProgress from "./ProfileSetupProgress";
import { fieldIcons } from "./candidateFormOptions";
import { rememberOnboardingStarted } from "./onboardingState";
import {
  localToday,
  validatePersonalDetails,
  validateProfilePhoto,
  validateRelatedEntries,
} from "./onboardingValidation.js";
import { resetPageScroll } from "../../../utils/resetPageScroll";
import { educationForOnboarding } from "./educationEntries.js";

const steps = ["Personal details", "Skills", "Experience", "Education", "Photo"];
const stepSections = [null, "skills", "experiences", "education", null];
const photoStep = steps.length - 1;
const titles = [
  "Personal details",
  "Skills and proficiency",
  "Work experience",
  "Education",
  "Profile photograph",
];
const hints = [
  "Review your information and complete all required fields.",
  "Add your skills. You can include how long you have used each one.",
  "Add employment dates for each role, or confirm that you have no work experience yet.",
  "Review education from your resume, or add your qualifications manually.",
  "Upload a photograph or take one with your camera to complete registration.",
];
const personalGroups = [
  {
    title: "Contact and personal information",
    keys: [
      "first_name",
      "last_name",
      "phone_mobile",
      "dob",
      "gender",
      "current_designation",
    ],
  },
  {
    title: "Address",
    keys: [
      "primary_address_street",
      "primary_address_city",
      "primary_address_state",
      "primary_address_postalcode",
      "primary_address_country",
    ],
  },
  {
    title: "Professional introduction",
    keys: ["description", "linkedin_url", "github_url"],
  },
];
const autoComplete = {
  first_name: "given-name",
  last_name: "family-name",
  phone_mobile: "tel",
  dob: "bday",
  primary_address_street: "street-address",
  primary_address_city: "address-level2",
  primary_address_state: "address-level1",
  primary_address_postalcode: "postal-code",
  primary_address_country: "country-name",
  current_designation: "organization-title",
};
const relatedFields = {
  skills: {
    name: "Skill",
    version: "Version",
    total_years_total_months: "Experience duration",
  },
  experiences: {
    name: "Role / job title",
    company_name: "Company",
    company_location: "Location",
    joining_date: "Start date",
    leaving_date: "End date",
    description: "Responsibilities and achievements",
  },
  education: {
    name: "Education title",
    qualification: "Degree / qualification",
    institution: "Institution",
    university: "University",
    school: "School / college",
    board: "Board",
    specialization: "Field of study / specialization",
    percentage: "Percentage / grade",
    from_time: "Start year / date",
    to_time: "End year / date",
    status: "Completion status",
    description: "Academic achievements and details",
  },
};
const entryLabels = {
  skills: "skill",
  experiences: "experience",
  education: "education",
};
const emptyTitles = {
  skills: "No skills added",
  experiences: "No work experience added",
  education: "No education added",
};
const emptyHints = {
  skills: "Add a skill below, or continue if you have none to add.",
  experiences:
    "Add a role below, or confirm that you have no work experience yet.",
  education: "Add your education below, or continue if you have none to add.",
};

export default function CandidateResumeBuilder({
  email,
  candidate,
  onBack,
  onComplete,
}) {
  const reducedMotion = useReducedMotion();
  const [record, setRecord] = useState(candidate);
  const [draft, setDraft] = useState(() =>
    normalizeCandidate(candidate || {}, email),
  );
  const [step, setStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [items, setItems] = useState({
    skills: [],
    experiences: [],
    education: [],
  });
  const resumeDescription = useRef(candidate?.description || "");
  const [noExperience, setNoExperience] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [entryError, setEntryError] = useState(null);
  const originals = useRef({});
  const loaded = useRef({});
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const heading = useRef(null);
  const page = useRef(null);
  useLayoutEffect(() => {
    resetPageScroll(page.current);
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  const section = stepSections[step];
  const updateEntry = (index, key, value) => {
    setEntryError(null);
    setItems((prev) => ({
      ...prev,
      [section]: prev[section].map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    }));
  };
  const loadStep = async (next, id) => {
    const key = stepSections[next];
    if (key && !loaded.current[key]) {
      const rows = await fetchCandidateRelated(id, key);
      rows.forEach((row) => {
        originals.current[row.id] = { ...row };
      });
      setItems((prev) => ({
        ...prev,
        [key]:
          key === "education"
            ? educationForOnboarding(rows, resumeDescription.current)
            : rows,
      }));
      loaded.current[key] = true;
    }
    setFieldErrors({});
    setEntryError(null);
    setStep(next);
  };
  const focusField = (id) =>
    requestAnimationFrame(() => {
      const field = document.getElementById(id);
      const disclosure = field?.closest("details");
      if (disclosure) disclosure.open = true;
      field?.scrollIntoView({ block: "center", behavior: "instant" });
      field?.focus({ preventScroll: true });
    });
  const saveStep = async (event) => {
    event.preventDefault();
    if (lock.current || photoBusy) return;
    if (step === 0 || step === photoStep) {
      const errors = validatePersonalDetails(draft);
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        setStep(0);
        toast.error(
          "Complete the highlighted personal details before continuing.",
        );
        focusField(`candidate-${Object.keys(errors)[0]}`);
        return;
      }
      if (step === photoStep) {
        const photoError = validateProfilePhoto(draft);
        if (photoError) {
          setFieldErrors({ profile_image: photoError });
          toast.error(photoError);
          focusField("candidate-photo");
          return;
        }
      }
    } else {
      const invalid = validateRelatedEntries(
        section,
        items[section],
        noExperience,
      );
      if (invalid) {
        setEntryError(invalid);
        toast.error(invalid.message);
        focusField(
          invalid.index < 0
            ? "candidate-no-experience"
            : `candidate-${section}-${invalid.index}-${invalid.field}`,
        );
        return;
      }
    }
    lock.current = true;
    setBusy(true);
    try {
      let current = record;
      if (step === 0 || step === photoStep) {
        current ||= await findCandidate(email);
        const saved = await saveCandidate(
          current?.id,
          { ...draft, candidate_source: current?.candidate_source },
          email,
        );
        current = { ...current, ...saved };
        if (!current.id) current = await findCandidate(email);
        if (!current?.id)
          throw new Error(
            "Could not confirm your saved profile. Please retry.",
          );
        setRecord(current);
        rememberOnboardingStarted(current);
      } else {
        for (let index = 0; index < items[section].length; index++) {
          const row = items[section][index];
          const value =
            section === "experiences" && row.currentlyWorking
              ? { ...row, leaving_date: "" }
              : row;
          if (row.id)
            await saveCandidateRelated(
              section,
              value,
              originals.current[row.id],
            );
          const saved = row.id
            ? value
            : await createCandidateRelated(section, current.id, value);
          originals.current[saved.id] = { ...saved };
          setItems((prev) => ({
            ...prev,
            [section]: prev[section].map((entry, i) =>
              i === index ? saved : entry,
            ),
          }));
        }
      }
      setCompletedSteps(prev => prev.includes(step) ? prev : [...prev, step]);
      if (step === photoStep) onComplete(current);
      else {
        await loadStep(step + 1, current.id);
        toast.success(`${steps[step]} saved.`);
      }
    } catch (err) {
      toast.error(err.message || "Could not save this step. Please retry.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const personalInput = (key) => {
    const required = Object.hasOwn(requiredPersonalFields, key);
    const label =
      requiredPersonalFields[key] ||
      (key === "linkedin_url" ? "LinkedIn URL" : "GitHub URL");
    const error = fieldErrors[key];
    const attributes = {
      id: `candidate-${key}`,
      required,
      value: draft[key] || "",
      className: "ob-input",
      "aria-invalid": !!error,
      "aria-describedby":
        `${key === "description" ? "candidate-about-hint " : ""}${error ? `candidate-${key}-error` : ""}`.trim() ||
        undefined,
      onChange: (event) => {
        setDraft((prev) => ({ ...prev, [key]: event.target.value }));
        setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
      },
      onBlur: (event) => {
        const value = key.endsWith("_url")
          ? normalizeProfileUrl(event.target.value)
          : event.target.value;
        const nextDraft = { ...draft, [key]: value };
        if (key.endsWith("_url")) setDraft(nextDraft);
        setFieldErrors((prev) => ({
          ...prev,
          [key]: validatePersonalDetails(nextDraft)[key],
        }));
      },
    };
    return (
      <div
        key={key}
        className={
          key === "description" || key === "primary_address_street"
            ? "sm:col-span-2"
            : ""
        }
      >
        <label htmlFor={attributes.id} className="ob-label">
          {label}{" "}
          {required ? (
            <span className="ob-required">*</span>
          ) : (
            <span className="ob-muted text-xs font-normal">(optional)</span>
          )}
        </label>
        {key === "description" ? (
          <textarea
            {...attributes}
            rows={4}
            minLength={ABOUT_MIN_LENGTH}
            placeholder="Describe your professional background, key skills, and career interests."
          />
        ) : (
          <input
            {...attributes}
            type={
              key === "dob" ? "date" : key === "phone_mobile" ? "tel" : "text"
            }
            inputMode={key.endsWith("_url") ? "url" : undefined}
            autoComplete={autoComplete[key]}
            max={key === "dob" ? localToday() : undefined}
            placeholder={
              key === "linkedin_url"
                ? "linkedin.com/in/your-name"
                : key === "github_url"
                  ? "github.com/your-name"
                  : undefined
            }
          />
        )}
        {key === "description" && (
          <p
            id="candidate-about-hint"
            className="ob-help flex flex-wrap justify-between gap-2"
          >
            <span>Minimum {ABOUT_MIN_LENGTH} characters.</span>
            <span className="tabular-nums">
              {draft.description.trim().length} characters
            </span>
          </p>
        )}
        {error && (
          <p
            id={`candidate-${key}-error`}
            className="mt-2 text-xs leading-5 text-red-700"
          >
            {error}
          </p>
        )}
      </div>
    );
  };
  return (
    <section ref={page} className="mx-auto max-w-3xl pb-6 pt-5 sm:pt-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        {onBack && (
          <button
            type="button"
            disabled={busy || photoBusy}
            onClick={onBack}
            className="ob-muted flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to options
          </button>
        )}
        <span className="ob-muted ml-auto text-sm">
          Step {step + 1} of {steps.length}
        </span>
      </div>
      <ol
        aria-label="Profile setup steps"
        className="mb-7 grid grid-cols-5 gap-2 sm:gap-4"
      >
        {steps.map((label, index) => (
          <li key={label} aria-current={step === index ? "step" : undefined}>
            <div
              className={`mb-2 h-1 rounded-full ${index <= step ? "bg-[var(--ob-accent)]" : "bg-[var(--ob-line)]"}`}
            />
            <span
              className={`flex items-center gap-1 text-[10px] leading-4 sm:text-xs sm:leading-5 ${step === index ? "font-semibold text-[var(--ob-accent)]" : "ob-muted"}`}
            >
              {index < step && (
                <Check size={13} className="hidden shrink-0 sm:block" aria-label="Completed" />
              )}
              {label}
            </span>
          </li>
        ))}
      </ol>
      <div className="ob-surface p-5 sm:p-8">
        <header className="mb-7">
          <h1
            ref={heading}
            tabIndex={-1}
            className="text-2xl font-semibold tracking-tight outline-none"
          >
            {titles[step]}
          </h1>
          <p className="ob-muted mt-2 text-sm leading-6">{hints[step]}</p>
          {step !== photoStep && (
            <p className="ob-muted mt-3 text-xs">
              Fields marked <span className="ob-required">*</span> are required.
            </p>
          )}
        </header>
        {step === photoStep && (
          <CandidatePhotoUpload
            embedded
            initialEmail={email}
            lockedEmail
            disabled={busy}
            onBusyChange={setPhotoBusy}
            onUploaded={(url) =>
              setDraft((prev) => ({ ...prev, profile_image: url }))
            }
          />
        )}
        <form id="candidate-step-form" onSubmit={saveStep} noValidate>
          <fieldset disabled={busy || photoBusy} className="min-w-0">
            {step === 0 && (
              <>
                <div className="mb-7">
                  <label htmlFor="candidate-email1" className="ob-label">
                    Account email <span className="ob-required">*</span>
                  </label>
                  <input
                    id="candidate-email1"
                    value={email}
                    type="email"
                    readOnly
                    className="ob-input"
                  />
                  <p className="ob-help">
                    This is the email address you use to sign in.
                  </p>
                </div>
                {personalGroups.map((group, index) => (
                  <section
                    key={group.title}
                    className={
                      index ? "mt-7 border-t border-[var(--ob-line)] pt-6" : ""
                    }
                  >
                    <h2 className="mb-5 text-base font-semibold">
                      {group.title}
                    </h2>
                    <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
                      {group.keys.map(personalInput)}
                    </div>
                  </section>
                ))}
              </>
            )}
            {section && (
              <div className="space-y-4">
                {!items[section].length && (
                  <div className="rounded-xl bg-[var(--ob-page)] p-5">
                    <h2 className="text-sm font-semibold">
                      {emptyTitles[section]}
                    </h2>
                    <p className="ob-help">
                      {emptyHints[section]}
                    </p>
                  </div>
                )}
                {step === 2 && !items.experiences.length && (
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-[var(--ob-line)] p-3 text-sm">
                    <input
                      id="candidate-no-experience"
                      type="checkbox"
                      checked={noExperience}
                      onChange={(event) => {
                        setNoExperience(event.target.checked);
                        setEntryError(null);
                      }}
                      className="size-4 accent-[var(--ob-accent)]"
                    />{" "}
                    I have no work experience yet
                  </label>
                )}
                {items[section].map((row, index) => (
                  <details
                    key={row.id || index}
                    open={!row.id || entryError?.index === index || undefined}
                    className="group rounded-xl border border-[var(--ob-line)]"
                  >
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                      <span className="ob-muted text-xs tabular-nums">
                        {index + 1}.
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block break-words text-sm font-semibold">
                          {row.name ||
                            `New ${entryLabels[section]}`}
                        </span>
                        <span className="ob-muted mt-1 block text-xs">
                          {section === "education"
                            ? [
                                row.qualification,
                                row.institution || row.university || row.school,
                                [row.from_time, row.to_time].filter(Boolean).join(" to "),
                              ].filter(Boolean).join(" / ") || "Add your qualification and institution"
                            : step === 1
                              ? row.total_years_total_months || "Duration not provided"
                              : [
                                  row.company_name,
                                  row.joining_date &&
                                    `${row.joining_date} to ${row.currentlyWorking ? "present" : row.leaving_date || "end date required"}`,
                                ]
                                  .filter(Boolean)
                                  .join(" / ") ||
                                "Add role details and employment dates"}
                        </span>
                      </span>
                      <ChevronDown
                        size={18}
                        className="ob-muted shrink-0 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="border-t border-[var(--ob-line)] p-4 sm:p-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        {Object.entries(relatedFields[section]).map(
                          ([key, label]) => {
                            const required =
                              key === "name" ||
                              key === "joining_date" ||
                              (key === "leaving_date" && !row.currentlyWorking);
                            const invalid =
                              entryError?.index === index &&
                              entryError.field === key;
                            const id = `candidate-${section}-${index}-${key}`;
                            return (
                              <div
                                key={key}
                                className={
                                  key === "description" ? "sm:col-span-2" : ""
                                }
                              >
                                <label htmlFor={id} className="ob-label">
                                  {label}{" "}
                                  {required ? (
                                    <span className="ob-required">*</span>
                                  ) : (
                                    <span className="ob-muted text-xs font-normal">
                                      {key === "leaving_date"
                                        ? "(current role)"
                                        : "(optional)"}
                                    </span>
                                  )}
                                </label>
                                {key === "description" ? (
                                  <textarea
                                    id={id}
                                    rows={3}
                                    value={row[key] || ""}
                                    className="ob-input"
                                    onChange={(event) =>
                                      updateEntry(
                                        index,
                                        key,
                                        event.target.value,
                                      )
                                    }
                                  />
                                ) : (
                                  <input
                                    id={id}
                                    required={required}
                                    disabled={
                                      key === "leaving_date" &&
                                      !!row.currentlyWorking
                                    }
                                    type={
                                      key.endsWith("_date") ? "date" : "text"
                                    }
                                    value={
                                      key === "leaving_date" &&
                                      row.currentlyWorking
                                        ? ""
                                        : row[key] || ""
                                    }
                                    min={
                                      key === "leaving_date"
                                        ? row.joining_date || undefined
                                            : undefined
                                    }
                                    max={
                                      key.endsWith("_date")
                                        ? localToday()
                                        : undefined
                                    }
                                    placeholder={
                                      key === "total_years_total_months"
                                        ? "For example, 2 years 6 months"
                                        : key === "from_time"
                                          ? "For example, 2018"
                                          : key === "to_time"
                                            ? "For example, 2022 or Present"
                                        : undefined
                                    }
                                    className="ob-input disabled:opacity-50"
                                    aria-invalid={invalid}
                                    aria-describedby={
                                      invalid
                                        ? `${id}-error`
                                        : key === "total_years_total_months"
                                          ? `${id}-hint`
                                          : undefined
                                    }
                                    onChange={(event) =>
                                      updateEntry(
                                        index,
                                        key,
                                        event.target.value,
                                      )
                                    }
                                  />
                                )}
                                {key === "total_years_total_months" && (
                                  <p id={`${id}-hint`} className="ob-help">
                                    Include years or months if you want to add
                                    your experience duration.
                                  </p>
                                )}
                                {invalid && (
                                  <p
                                    id={`${id}-error`}
                                    className="mt-2 text-xs leading-5 text-red-700"
                                  >
                                    {entryError.message}
                                  </p>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                      {step === 2 && (
                        <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                          <input
                            type="checkbox"
                            checked={!!row.currentlyWorking}
                            onChange={(event) =>
                              updateEntry(
                                index,
                                "currentlyWorking",
                                event.target.checked,
                              )
                            }
                            className="size-4 accent-[var(--ob-accent)]"
                          />
                          Currently working here
                        </label>
                      )}
                      {!row.id && (
                        <button
                          type="button"
                          className="ob-muted mt-3 flex min-h-11 items-center gap-2 rounded-lg text-sm hover:text-red-700"
                          onClick={() => {
                            setEntryError(null);
                            setItems((prev) => ({
                              ...prev,
                              [section]: prev[section].filter(
                                (_, i) => i !== index,
                              ),
                            }));
                          }}
                        >
                          <Trash2 size={15} /> Remove entry
                        </button>
                      )}
                    </div>
                  </details>
                ))}
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--ob-line)] px-4 py-3 text-sm font-semibold text-[var(--ob-accent)] hover:bg-[var(--ob-soft)]"
                  onClick={() => {
                    setNoExperience(false);
                    setEntryError(null);
                    setItems((prev) => ({
                      ...prev,
                      [section]: [...prev[section], { name: "" }],
                    }));
                  }}
                >
                  <Plus size={16} /> Add {entryLabels[section]}
                </button>
              </div>
            )}
          </fieldset>
        </form>
      </div>
      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ob-line)] bg-[var(--ob-surface)] p-3 sm:px-4">
        <button
          type="button"
          disabled={!step || busy || photoBusy}
          onClick={() => {
            setEntryError(null);
            setStep(step - 1);
          }}
          className="ob-muted flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium disabled:opacity-40"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-muted-foreground hidden text-xs sm:block">
            {step === photoStep
              ? draft.profile_image
                ? "Photo uploaded"
                : "Photo is required"
              : "Changes save when you continue"}
          </span>
          <button
            type="submit"
            form="candidate-step-form"
            disabled={busy || photoBusy}
            className={styles.primary}
          >
            {busy ? (
              <>
                <Loader2
                  size={16}
                  className="animate-spin motion-reduce:animate-none"
                />{" "}
                Saving...
              </>
            ) : (
              <>
                {step === photoStep
                  ? "Complete registration"
                  : "Save and continue"}
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

