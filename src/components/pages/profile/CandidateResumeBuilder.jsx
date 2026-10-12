import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  Check,
  ChevronDown,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
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
import { rememberOnboardingStarted } from "./onboardingState";
import {
  ABOUT_MIN_LENGTH,
  localToday,
  normalizeProfileUrl,
  requiredPersonalFields,
  validatePersonalDetails,
  validateProfilePhoto,
  validateRelatedEntries,
} from "./onboardingValidation.js";
import { resetPageScroll } from "../../../utils/resetPageScroll";
import { educationForOnboarding } from "./educationEntries.js";

const steps = ["Personal details", "Skills", "Experience", "Education", "Photo"];
const stepIcons = [
  UserRound,
  Sparkles,
  BriefcaseBusiness,
  GraduationCap,
  Camera,
];
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
    subtitle: "Your primary identity and contact details",
    icon: UserRound,
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
    subtitle: "Your current residential location",
    icon: MapPin,
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
    subtitle: "Your career summary and social profile links",
    icon: FileText,
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
  const StepIcon = stepIcons[step] || UserRound;

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
      field?.focus();
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
    const charCount =
      key === "description" ? (draft.description || "").trim().length : 0;
    const charProgress =
      key === "description"
        ? Math.min(100, Math.round((charCount / ABOUT_MIN_LENGTH) * 100))
        : 0;
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
            rows={3}
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
          <div className="mt-1.5 space-y-1">
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--ob-line)]">
              <div
                className="h-full rounded-full bg-[var(--ob-accent)] transition-all duration-150"
                style={{ width: `${charProgress}%` }}
              />
            </div>
            <p
              id="candidate-about-hint"
              className="ob-help !mt-0 flex flex-wrap justify-between gap-2"
            >
              <span>Minimum {ABOUT_MIN_LENGTH} characters.</span>
              <span
                className={`tabular-nums ${
                  charCount >= ABOUT_MIN_LENGTH
                    ? "font-medium text-[var(--ob-accent)]"
                    : ""
                }`}
              >
                {charCount} characters
              </span>
            </p>
          </div>
        )}
        {error && (
          <p
            id={`candidate-${key}-error`}
            className="mt-1 text-xs leading-4 text-red-700"
          >
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <section ref={page} className="mx-auto max-w-3xl pb-4 pt-3 sm:pt-5">
      {/* Top Bar */}
      <div className="mb-3 flex items-center justify-between gap-4">
        {onBack && (
          <button
            type="button"
            disabled={busy || photoBusy}
            onClick={onBack}
            className="ob-muted flex min-h-9 items-center gap-2 rounded-lg text-sm font-medium transition-colors hover:text-[var(--ob-text)]"
          >
            <ArrowLeft size={16} /> Back to options
          </button>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3 py-1 text-xs font-medium text-[var(--ob-muted)]">
          Step {step + 1} of {steps.length}
        </span>
      </div>

      {/* Animated 5-Step Progress Indicator */}
      <ol
        aria-label="Profile setup steps"
        className="mb-4 grid grid-cols-5 gap-2 sm:gap-3"
      >
        {steps.map((label, index) => {
          const Icon = stepIcons[index] || UserRound;
          const isCurrent = step === index;
          const isCompleted = index < step;
          return (
            <li key={label} aria-current={isCurrent ? "step" : undefined}>
              <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--ob-line)]">
                <Motion.div
                  initial={false}
                  animate={{ width: index <= step ? "100%" : "0%" }}
                  transition={{
                    duration: reducedMotion ? 0 : 0.25,
                    ease: "easeOut",
                  }}
                  className="h-full rounded-full bg-[var(--ob-accent)]"
                />
              </div>
              <span
                className={`flex items-center gap-1.5 text-[10px] leading-4 sm:text-xs sm:leading-5 ${
                  isCurrent
                    ? "font-semibold text-[var(--ob-accent)]"
                    : "ob-muted"
                }`}
              >
                {isCompleted ? (
                  <Check
                    size={13}
                    className="hidden shrink-0 text-[var(--ob-accent)] sm:block"
                    aria-label="Completed"
                  />
                ) : (
                  <Icon
                    size={13}
                    className="hidden shrink-0 sm:block"
                    aria-hidden="true"
                  />
                )}
                <span className="truncate">{label}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {/* Main Card Surface */}
      <div className="ob-surface p-4 sm:p-6">
        <header className="mb-4 flex items-start gap-3.5 border-b border-[var(--ob-line)] pb-3.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--ob-line)] bg-[var(--ob-soft)] text-[var(--ob-accent)]">
            <StepIcon size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1
                ref={heading}
                tabIndex={-1}
                className="text-xl font-semibold tracking-tight outline-none sm:text-2xl"
              >
                {titles[step]}
              </h1>
              <p className="ob-muted text-xs">
                Fields marked <span className="ob-required">*</span> are
                required.
              </p>
            </div>
            <p className="ob-muted mt-1 text-sm leading-5">{hints[step]}</p>
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <Motion.div
            key={step}
            initial={reducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            {step === photoStep && (
              <>
                <CandidatePhotoUpload
                  embedded
                  initialEmail={email}
                  initialPhotoUrl={draft.profile_image}
                  lockedEmail
                  disabled={busy}
                  onBusyChange={setPhotoBusy}
                  onUploaded={(url) => {
                    setDraft((prev) => ({ ...prev, profile_image: url }));
                    setFieldErrors((prev) => ({
                      ...prev,
                      profile_image: undefined,
                    }));
                  }}
                />
                {fieldErrors.profile_image && (
                  <p
                    id="candidate-profile_image-error"
                    className="mt-2 text-xs leading-4 text-red-700"
                  >
                    {fieldErrors.profile_image}
                  </p>
                )}
              </>
            )}

            <form id="candidate-step-form" onSubmit={saveStep} noValidate>
              <fieldset disabled={busy || photoBusy} className="min-w-0">
                {/* STEP 0: PERSONAL DETAILS */}
                {step === 0 && (
                  <>
                    <div className="mb-4 rounded-xl border border-[var(--ob-line)] bg-[var(--ob-page)] p-3.5">
                      <div className="flex items-center gap-2">
                        <Mail
                          size={14}
                          className="text-[var(--ob-accent)]"
                          aria-hidden="true"
                        />
                        <label htmlFor="candidate-email1" className="ob-label">
                          Account email <span className="ob-required">*</span>
                        </label>
                      </div>
                      <input
                        id="candidate-email1"
                        value={email}
                        type="email"
                        readOnly
                        className="ob-input !bg-[var(--ob-surface)]"
                      />
                      <p className="ob-help">
                        This is the email address you use to sign in.
                      </p>
                    </div>

                    {personalGroups.map((group, index) => {
                      const GroupIcon = group.icon;
                      return (
                        <section
                          key={group.title}
                          className={
                            index
                              ? "mt-4 border-t border-[var(--ob-line)] pt-4"
                              : ""
                          }
                        >
                          <div className="mb-3 flex items-center gap-2.5">
                            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--ob-soft)] text-[var(--ob-accent)]">
                              <GroupIcon size={15} aria-hidden="true" />
                            </span>
                            <div>
                              <h2 className="text-sm font-semibold sm:text-base">
                                {group.title}
                              </h2>
                              <p className="ob-muted text-xs">
                                {group.subtitle}
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                            {group.keys.map(personalInput)}
                          </div>
                        </section>
                      );
                    })}
                  </>
                )}

                {/* STEPS 1, 2, 3: SKILLS, EXPERIENCE, EDUCATION */}
                {section && (
                  <div className="space-y-3">
                    {!items[section].length && (
                      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--ob-line)] bg-[var(--ob-page)] px-5 py-6 text-center">
                        <Motion.div
                          animate={
                            reducedMotion ? undefined : { y: [0, -4, 0] }
                          }
                          transition={{
                            duration: 3.4,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                          className="mb-2.5 grid size-11 place-items-center rounded-xl border border-[var(--ob-line)] bg-[var(--ob-surface)] text-[var(--ob-accent)]"
                        >
                          <StepIcon size={20} aria-hidden="true" />
                        </Motion.div>
                        <h2 className="text-sm font-semibold">
                          {emptyTitles[section]}
                        </h2>
                        <p className="ob-help max-w-md">
                          {emptyHints[section]}
                        </p>
                      </div>
                    )}

                    {step === 2 && !items.experiences.length && (
                      <label className="ob-choice flex min-h-10 cursor-pointer items-center gap-3 rounded-xl border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3.5 py-2.5 text-sm font-medium">
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
                        open={
                          !row.id || entryError?.index === index || undefined
                        }
                        className="group overflow-hidden rounded-xl border border-[var(--ob-line)] bg-[var(--ob-surface)] transition-colors open:border-[var(--ob-accent)]"
                      >
                        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-[var(--ob-soft)]/50 [&::-webkit-details-marker]:hidden">
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--ob-soft)] text-xs font-semibold tabular-nums text-[var(--ob-accent)]">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-semibold">
                              {row.name || `New ${entryLabels[section]}`}
                            </span>
                            <span className="ob-muted block text-xs">
                              {section === "education"
                                ? [
                                    row.qualification,
                                    row.institution ||
                                      row.university ||
                                      row.school,
                                    [row.from_time, row.to_time]
                                      .filter(Boolean)
                                      .join(" to "),
                                  ]
                                    .filter(Boolean)
                                    .join(" / ") ||
                                  "Add your qualification and institution"
                                : step === 1
                                  ? row.total_years_total_months ||
                                    "Duration not provided"
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
                          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--ob-page)] text-[var(--ob-muted)]">
                            <ChevronDown
                              size={16}
                              className="transition-transform duration-150 group-open:rotate-180"
                              aria-hidden="true"
                            />
                          </span>
                        </summary>

                        <div className="border-t border-[var(--ob-line)] bg-[var(--ob-page)]/45 p-3.5 sm:p-4">
                          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                            {Object.entries(relatedFields[section]).map(
                              ([key, label]) => {
                                const required =
                                  key === "name" ||
                                  key === "joining_date" ||
                                  (key === "leaving_date" &&
                                    !row.currentlyWorking);
                                const invalid =
                                  entryError?.index === index &&
                                  entryError.field === key;
                                const id = `candidate-${section}-${index}-${key}`;
                                return (
                                  <div
                                    key={key}
                                    className={
                                      key === "description"
                                        ? "sm:col-span-2"
                                        : ""
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
                                        rows={2}
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
                                          key.endsWith("_date")
                                            ? "date"
                                            : "text"
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
                                        Include years or months if you want to
                                        add your experience duration.
                                      </p>
                                    )}
                                    {invalid && (
                                      <p
                                        id={`${id}-error`}
                                        className="mt-1 text-xs leading-4 text-red-700"
                                      >
                                        {entryError.message}
                                      </p>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>

                          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                            {step === 2 && (
                              <label className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3 py-1.5 text-sm font-medium">
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
                                className="ob-muted ml-auto flex min-h-9 items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1 text-xs font-medium transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
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
                                <Trash2 size={14} /> Remove entry
                              </button>
                            )}
                          </div>
                        </div>
                      </details>
                    ))}

                    <button
                      type="button"
                      className="ob-choice flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--ob-line)] bg-[var(--ob-page)]/60 px-4 py-2.5 text-sm font-semibold text-[var(--ob-accent)]"
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
          </Motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky Footer Bar */}
      <div className="sticky bottom-0 z-10 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3.5 py-2.5 shadow-xs">
        <button
          type="button"
          disabled={!step || busy || photoBusy}
          onClick={() => {
            setEntryError(null);
            setStep(step - 1);
          }}
          className="ob-muted flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors hover:bg-[var(--ob-page)] hover:text-[var(--ob-text)] disabled:opacity-40"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className="ob-muted hidden text-xs sm:block">
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
            className="ob-primary"
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

