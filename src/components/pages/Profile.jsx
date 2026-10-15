import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./profile/onboardingStyles";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { resetPageScroll } from "../../utils/resetPageScroll";
import { candidateSources, validatePersonalDetails } from "./profile/onboardingValidation";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
  ChevronRight,
  CircleCheck,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { FETCH_GPC_X_API_KEY } from "../../store/constants";
import { crmFetch } from "../../services/crmClient";
import CandidatePhotoUpload from "./profile/CandidatePhotoUpload";
import CandidateWelcome from "./profile/CandidateWelcome";
import OnboardingWelcome from "./profile/OnboardingWelcome";
import CandidateResumeBuilder from "./profile/CandidateResumeBuilder";
import {
  candidateProfileStartPhase,
  hasParsedResume,
  rememberOnboardingComplete,
  rememberResumeParsed,
} from "./profile/onboardingState";
import {
  candidateRelatedModules,
  fetchCandidateRelated,
  saveCandidateRelated,
  findCandidate,
  normalizeCandidate,
  saveCandidate,
} from "./profile/candidateApi";

import ProfileSectionContent from "./profile/ProfileSectionContent";
import { profileCompletion } from "./profile/profileDisplay";
import LoadingPage from "./LoadingPage";
import ResumeLoading from "./profile/ResumeLoading";
import ResumeUpload from "./profile/ResumeUpload";
import { useQueryClient } from "@tanstack/react-query";
import { candidateKey } from "../../queries/candidate.queries";
import EmployeeOptions from "../employement/components/employee-actions/EmployeeOptions";

const metaChip =
  "inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground";
const sectionNavButton =
  "inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-accent disabled:opacity-40 motion-reduce:transition-none";

export default function Profile({ standalone = false, onComplete }) {
  const email = useSelector((state) => state.user.user?.email)?.trim() || "";
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("job_id")?.trim() || "";
  return (
    <CandidateProfile
      key={`${email}:${jobId}`}
      email={email}
      jobId={jobId}
      standalone={standalone}
      onComplete={onComplete}
    />
  );
}

function CandidateProfile({ email, jobId, standalone, onComplete }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cachedCandidate = queryClient.getQueryData(candidateKey(email));
  const userPhase = useSelector((state) => state.user.userInfo?.phase);
  const [section, setSection] = useState("personal");
  const [candidateFlowStarted, setCandidateFlowStarted] = useState(false);
  const [record, setRecord] = useState(cachedCandidate ?? null);
  const [draft, setDraft] = useState(
    cachedCandidate ? normalizeCandidate(cachedCandidate, email) : null,
  );
  const [phase, setPhase] = useState(() => cachedCandidate
    ? candidateProfileStartPhase(cachedCandidate, jobId)
    : "loading");
  const [resumeReview, setResumeReview] = useState(() => hasParsedResume(cachedCandidate));
  const [busy, setBusy] = useState(false);
  const [parsingPhase, setParsingPhase] = useState("processing");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [savedPhotoFile, setSavedPhotoFile] = useState(null);
  const [localPhoto, setLocalPhoto] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Own this preview here so closing the uploader after saving cannot revoke it.
  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setLocalPhoto({ file: photoFile, url });
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);
  const [error, setErrorState] = useState("");
  const setError = (message) => {
    setErrorState(message);
    if (message) toast.error(message);
  };
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState("");
  const pageRef = useRef(null);
  const uploadProcessing = phase === "upload" && busy;
  useLayoutEffect(() => { resetPageScroll(pageRef.current); }, [phase, section, uploadProcessing, candidateFlowStarted]);
  const [related, setRelated] = useState({});
  const [relatedRetry, setRelatedRetry] = useState(0);
  const relatedCache = useRef({});
  const [retry, setRetry] = useState(0);
  const requestRef = useRef(null);
  const alive = useRef(true);
  const saveLock = useRef(false);
  const selectResume = (selected) => {
    setFile(null);
    setError("");
    if (!selected) return;
    if (
      !/\.(pdf|doc|docx)$/i.test(selected.name) ||
      !selected.size ||
      selected.size > 10 * 1024 * 1024
    ) {
      setError("Choose a non-empty PDF, DOC or DOCX resume up to 10 MB.");
      return;
    }
    setFile(selected);
  };

  // Resume parsing can create the CRM candidate before the profile is saved.
  // Publish that confirmed record so navigation becomes available immediately.
  useEffect(() => {
    if (!record?.id) return;
    void queryClient.cancelQueries({
      queryKey: candidateKey(email),
      exact: true,
    });
    queryClient.setQueryData(candidateKey(email), record);
  }, [record, email, queryClient]);

  useEffect(() => {
    let active = true;
    alive.current = true;
    const cached = queryClient.getQueryData(candidateKey(email));
    if (cached !== undefined) {
      setRecord(cached);
      setDraft(cached ? normalizeCandidate(cached, email) : null);
      setResumeReview(hasParsedResume(cached));
      setPhase(candidateProfileStartPhase(cached, jobId));
      setError("");
      return () => {
        active = false;
        alive.current = false;
        requestRef.current?.abort();
      };
    }
    setPhase("loading");
    setError("");
    findCandidate(email)
      .then((candidate) => {
        if (!active) return;
        setRecord(candidate);
        setDraft(candidate ? normalizeCandidate(candidate, email) : null);
        setResumeReview(hasParsedResume(candidate));
        setPhase(candidateProfileStartPhase(candidate, jobId));
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
          setPhase("error");
        }
      });
    return () => {
      active = false;
      alive.current = false;
      requestRef.current?.abort();
    };
  }, [email, jobId, retry, queryClient]);

  useEffect(() => {
    if (!candidateRelatedModules[section] || !record?.id) return;
    if (relatedCache.current[section]?.items) return;
    let active = true;
    setRelated((prev) => ({ ...prev, [section]: { loading: true } }));
    fetchCandidateRelated(record.id, section)
      .then((items) => {
        if (active) {
          relatedCache.current[section] = { items, original: items };
          setRelated((prev) => ({
            ...prev,
            [section]: relatedCache.current[section],
          }));
        }
      })
      .catch((err) => {
        if (active)
          setRelated((prev) => ({
            ...prev,
            [section]: { error: err.message },
          }));
      });
    return () => {
      active = false;
    };
  }, [record?.id, section, relatedRetry]);

  const parseResume = async (event) => {
    event.preventDefault();
    if (!file || !email || requestRef.current) return;
    setError("");
    if (!candidateSources.some(source => source.value === stage)) {
      setError("Select how you found us.");
      return;
    }
    setBusy(true);
    setParsingPhase("processing");
    const controller = new AbortController();
    requestRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      if (!FETCH_GPC_X_API_KEY)
        throw new Error(
          "Resume upload is not configured. Please contact your administrator.",
        );
      const body = new FormData();
      body.append("file", file, file.name);
      body.append("primary_email", email);
      body.append("stage", stage);
      if (jobId) body.append("job_record_id", jobId);
      const response = await crmFetch(
        "https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=resume_parsing",
        {
          method: "POST",
          headers: { "x-api-key": FETCH_GPC_X_API_KEY },
          body,
          signal: controller.signal,
        },
      );
      const json = await response.json();
      if (!response.ok || json?.success !== true)
        throw new Error(
          json?.message ||
          "Unable to parse this resume. Please try another file.",
        );
      if (!controller.signal.aborted && alive.current) setParsingPhase("fetching");
      const candidate = await findCandidate(email);
      if (!candidate)
        throw new Error(
          "Resume parsed, but your candidate profile is not available yet. Reload your profile to retry the lookup.",
        );
      if (!alive.current) return;
      if (controller.signal.aborted) return;
      const parsed = normalizeCandidate(candidate, email);
      rememberResumeParsed(candidate);
      setResumeReview(true);
      setRecord(candidate);
      relatedCache.current = {};
      setRelated({});
      setSection("personal");
      setDraft(parsed);
      setPhase("builder");
      toast.success(
        "Resume parsed. Review and edit your details, then save your profile.",
      );
    } catch (err) {
      if (alive.current)
        setError(
          err.name === "AbortError"
            ? "Resume parsing timed out. Please try again."
            : err.message,
        );
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      if (alive.current) setBusy(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (saveLock.current || photoBusy) return;
    const personalErrors = validatePersonalDetails(draft);
    setFieldErrors(personalErrors);
    if (Object.keys(personalErrors).length) {
      setSection("personal");
      setError(Object.values(personalErrors)[0]);
      requestAnimationFrame(() => document.getElementById(`candidate-${Object.keys(personalErrors)[0]}`)?.focus());
      return;
    }
    saveLock.current = true;
    setBusy(true);
    setError("");
    try {
      // Recheck before creating, including after an uncertain previous save response.
      const existing = record || (await findCandidate(email));
      const saved = await saveCandidate(
        existing?.id,
        { ...draft, candidate_source: existing?.candidate_source },
        email,
      );
      if (!alive.current) return;
      if (!saved.id) {
        const confirmed = await findCandidate(email);
        if (!confirmed)
          throw new Error(
            "Save was accepted, but the profile could not be confirmed. Retry saving to check again.",
          );
        saved.id = confirmed.id;
      }
      for (const [key, entry] of Object.entries(relatedCache.current)) {
        for (const item of entry.items || []) {
          const original = entry.original.find((value) => value.id === item.id);
          await saveCandidateRelated(key, item, original);
          entry.original = entry.original.map((value) =>
            value.id === item.id ? { ...item } : value,
          );
        }
      }
      if (!alive.current) return;
      setSavedPhotoFile(photoFile);
      setRecord({ ...existing, ...saved });
      setDraft(normalizeCandidate(saved, email));
      setPhase("view");
      toast.success("Your candidate profile has been saved.");
      rememberOnboardingComplete(saved);
      queryClient.setQueryData(candidateKey(email), { ...existing, ...saved });
      onComplete?.({ ...existing, ...saved });
      if (!standalone) navigate("/profile", { replace: true });
    } catch (err) {
      if (alive.current)
        setError(err.message || "Unable to save your profile.");
    } finally {
      saveLock.current = false;
      if (alive.current) setBusy(false);
    }
  };

  const photoSrc = photoFile
    ? localPhoto?.file === photoFile
      ? localPhoto.url
      : ""
    : draft?.profile_image || "";
  const editing = phase === "edit";
  const name =
    [draft?.first_name, draft?.last_name].filter(Boolean).join(" ") ||
    "Candidate profile";
  const strength = profileCompletion(draft);
  const tabs = [
    {
      id: "personal",
      label: "Personal info",
      icon: UserRound,
      subtitle: "Personal details",
      description: "Your introduction, contact details and professional links.",
    },
    {
      id: "education",
      label: "Education",
      icon: GraduationCap,
      subtitle: "Education details",
      description:
        "Your qualifications, institutions and academic achievements.",
    },
    {
      id: "experiences",
      label: "Experience",
      icon: BriefcaseBusiness,
      subtitle: "Work experience",
      description: "Your roles, responsibilities and career milestones.",
    },
    {
      id: "skills",
      label: "Skills",
      icon: Sparkles,
      subtitle: "Professional skills",
      description: "Highlight your strengths and the tools you know best.",
    },
    ...(record?.id
      ? [
        {
          id: "photo",
          label: "Profile photo",
          icon: Camera,
          subtitle: "Profile photograph",
          description: "Personalize your saved profile with a photo.",
        },
      ]
      : []),
  ];
  const activeTab = tabs.find((tab) => tab.id === section) || tabs[0];
  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab.id);
  const goTo = (next) => {
    if (busy || photoBusy) return;
    setSection(next);
  };
  const startEditing = (next = section) => {
    if (busy || photoBusy) return;
    setFieldErrors({});
    setSection(next);
    setPhase("edit");
  };
  const previousTab = tabs[activeIndex - 1];
  const nextTab = tabs[activeIndex + 1];
  const cancelEditing = () => {
    relatedCache.current = Object.fromEntries(
      Object.entries(relatedCache.current).map(([key, entry]) => [
        key,
        { ...entry, items: entry.original },
      ]),
    );
    setRelated({ ...relatedCache.current });
    setPhotoFile(savedPhotoFile);
    setDraft(record ? normalizeCandidate(record, email) : null);
    setPhase(record ? "view" : "upload");
    setSection("personal");
    setFieldErrors({});
    setError("");
  };
  const showWelcomeChooser = phase === "welcome" && !candidateFlowStarted;
  const showOnboardingBackdrop = phase === "welcome" || phase === "upload" || phase === "builder";
  return (
    <main
      ref={pageRef}
      className={cn(
        "relative",
        standalone
          ? "text-foreground [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-primary [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-4 [&_summary:focus-visible]:outline-primary  min-h-dvh bg-background px-4 pb-8 sm:px-8 sm:pb-12 [&_button]:cursor-pointer [&_button:disabled]:cursor-default"
          : "text-foreground [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-primary [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-4 [&_summary:focus-visible]:outline-primary min-h-full bg-background px-4 py-6 sm:px-8 sm:py-8",
        // OnboardingBackdrop fills <main> behind the onboarding welcome and upload screens.
        showOnboardingBackdrop && "isolate",
        showOnboardingBackdrop && standalone && phase !== "builder" && "lg:pb-0",
      )}
    >

      <div
        className={
          standalone ? `mx-auto max-w-[1400px] space-y-6 ${phase === "builder" || phase === "upload" ? "pt-[22px] sm:pt-0" : ""}` : "w-full space-y-6 mt-4"
        }
      >
        {!standalone && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={styles.eyebrow}>
                <UserRound size={15} aria-hidden="true" />
                Candidate profile
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight lg:text-3xl">
                My profile
              </h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Keep your details current so recruiters see the real you.
              </p>
            </div>
            {!editing && (
              <span className={cn(styles.status, "px-3 py-1.5 text-xs", record?.id && "border-primary/20 bg-accent text-primary")}>
                <ShieldCheck size={14} aria-hidden="true" />
                {record?.id
                  ? "Profile saved"
                  : "Complete your profile"}
              </span>
            )}
          </div>
        )}
        {phase === "error" && error && <div className={cn(styles.surface, `p-6 text-center`)}><p className="text-muted-foreground text-sm">Your profile could not be loaded.</p><button onClick={() => setRetry(value => value + 1)} className={cn(styles.primary, `mt-4`)}>Retry lookup</button></div>}
        {phase === "loading" && (
          <LoadingPage />
        )}
        {showWelcomeChooser && (
          <OnboardingWelcome fillViewport={standalone} onCandidate={() => setCandidateFlowStarted(true)} />
        )}
        {phase === "welcome" && candidateFlowStarted && (
          <CandidateWelcome
            fillViewport={standalone}
            onBack={() => setCandidateFlowStarted(false)}
            onUpload={() => {
              setError("");
              setPhase("upload");
            }}
            onCreate={() => {
              setError("");
              setPhase("builder");
            }}
          />
        )}
        {phase === "builder" && (
          <CandidateResumeBuilder
            email={email}
            candidate={record}
            onBack={resumeReview ? undefined : () => setPhase("welcome")}
            onComplete={(saved) => {
              rememberOnboardingComplete(saved);
              queryClient.setQueryData(candidateKey(email), saved);
              setRecord(saved);
              setDraft(normalizeCandidate(saved, email));
              relatedCache.current = {};
              setRelated({});
              setSection("personal");
              setPhase("view");
              toast.success(
                "Your profile is ready. You can update your details anytime.",
              );
              onComplete?.(saved);
              if (!standalone) window.location.replace("/");
            }}
          />
        )}
        {phase === "upload" &&
          (busy ? (
            <ResumeLoading
              fillViewport={standalone}
              filename={file?.name}
              phase={parsingPhase}
            />
          ) : (
            <ResumeUpload
              fillViewport={standalone}
              email={email}
              file={file}
              stage={stage}
              onStageChange={setStage}
              onFileChange={selectResume}
              onBack={() => { setError(""); setPhase("welcome"); }}
              onSubmit={parseResume}
            />
          ))}
        {draft && (phase === "view" || phase === "edit") && (
          <>
            <header className={cn(styles.surface, "relative overflow-hidden rounded-3xl")}>
              <div aria-hidden="true" className="relative h-24 overflow-hidden bg-gradient-to-r from-sidebar-primary to-sidebar-secondary sm:h-28">
                <div className="absolute -right-10 -top-44 size-96 rounded-full border-[48px] border-white/5" />
                <div className="absolute right-52 top-8 size-56 rounded-full border border-white/10" />
                <div className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-highlight/15 blur-3xl" />
              </div>
              <div className="relative px-5 pb-5 sm:px-8 sm:pb-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="-mt-12 flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-end">
                    <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-card bg-accent text-3xl font-semibold text-primary shadow-sm sm:size-28">
                      {photoSrc ? (
                        <img
                          key={photoSrc}
                          src={photoSrc}
                          alt={`Profile photo of ${name}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        [draft.first_name, draft.last_name]
                          .filter(Boolean)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase() || <UserRound size={34} aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0 sm:pb-1">
                      <h2 className="break-words text-2xl font-semibold tracking-tight">
                        {name}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <BriefcaseBusiness size={15} className="shrink-0" aria-hidden="true" />
                        {draft.current_designation || "Professional title not added"}
                      </p>
                    </div>
                  </div>
                  {!editing ? (
                    <button
                      type="button"
                      className={cn(styles.secondary, "w-full sm:w-auto")}
                      onClick={() => startEditing()}
                    >
                      <Pencil size={16} aria-hidden="true" />
                      Edit profile
                    </button>
                  ) : (
                    <span className={cn(styles.status, "w-fit border-primary/20 bg-accent px-3 py-1.5 text-xs text-primary")}>
                      <Pencil size={13} aria-hidden="true" />
                      {record?.id
                        ? "Editing your profile"
                        : "Draft, review before saving"}
                    </span>
                  )}
                </div>
                <ul aria-label="Contact details" className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <li className={metaChip}>
                    <Mail size={14} className="shrink-0" aria-hidden="true" />
                    <span className="break-all">{email}</span>
                  </li>
                  {draft.phone_mobile && (
                    <li className={metaChip}>
                      <Phone size={14} className="shrink-0" aria-hidden="true" />
                      {draft.phone_mobile}
                    </li>
                  )}
                  {draft.primary_address_city && (
                    <li className={metaChip}>
                      <MapPin size={14} className="shrink-0" aria-hidden="true" />
                      {[
                        draft.primary_address_city,
                        draft.primary_address_country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </li>
                  )}
                  {record?.status && (
                    <li className={cn(metaChip, "relative border-primary/20 bg-accent font-medium text-primary")}>
                      <BadgeCheck size={14} className="shrink-0" aria-hidden="true" />
                      <span className="sr-only left-0 top-0">Status: </span>
                      {record.status}
                    </li>
                  )}
                </ul>
              </div>
            </header>
            <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
              <aside className="min-w-0 space-y-5 lg:sticky lg:top-5">
                <nav
                  aria-label="Profile sections"
                  className="overflow-x-auto rounded-2xl border border-border bg-card p-1.5 shadow-sm"
                >
                  <ul className="flex gap-1 lg:flex-col">
                    {tabs.map((tab) => {
                      const active = section === tab.id;
                      return (
                        <li key={tab.id} className="shrink-0">
                          <button
                            type="button"
                            aria-current={active ? "step" : undefined}
                            aria-controls="profile-section"
                            disabled={busy || photoBusy}
                            onClick={() => goTo(tab.id)}
                            className={cn(
                              "flex min-h-11 w-full items-center gap-3 rounded-xl px-2.5 py-1.5 text-left text-sm font-medium transition-colors disabled:opacity-50 motion-reduce:transition-none",
                              active
                                ? "bg-accent text-primary"
                                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-lg transition-colors motion-reduce:transition-none",
                                active ? "bg-primary text-primary-foreground" : "bg-muted",
                              )}
                            >
                              <tab.icon size={16} aria-hidden="true" />
                            </span>
                            <span className="flex-1 whitespace-nowrap pr-1">
                              {tab.label}
                            </span>
                            {active && (
                              <ChevronRight size={16} className="hidden shrink-0 lg:block" aria-hidden="true" />
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className={cn(styles.surface, "hidden p-5 lg:block")}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold">Profile strength</h2>
                    <span className="text-sm font-semibold tabular-nums text-primary">
                      {strength.percent}%
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Profile completeness"
                    aria-valuenow={strength.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                      style={{ width: `${strength.percent}%` }}
                    />
                  </div>
                  {strength.missing.length ? (
                    <>
                      <p className="mt-4 text-xs leading-5 text-muted-foreground">
                        Add these to make your profile stand out:
                      </p>
                      <ul className="mt-2 space-y-1">
                        {strength.missing.map((item) => (
                          <li key={item.key}>
                            <button
                              type="button"
                              disabled={busy || photoBusy}
                              onClick={() =>
                                startEditing(item.key === "profile_image" && record?.id ? "photo" : "personal")
                              }
                              className="flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-left text-sm transition-colors hover:bg-accent hover:text-primary disabled:opacity-50 motion-reduce:transition-none"
                            >
                              <Plus size={15} className="shrink-0 text-primary" aria-hidden="true" />
                              {item.label}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
                      <CircleCheck size={15} className="mt-px shrink-0 text-primary" aria-hidden="true" />
                      Your profile is complete. Keep it current as your experience grows.
                    </p>
                  )}
                </div>
                {userPhase === "Employment" && <EmployeeOptions />}
              </aside>
              <section
                id="profile-section"
                aria-labelledby="profile-section-title"
                className={cn(styles.surface, "min-w-0 overflow-clip")}
              >
                <div className="flex items-start gap-4 border-b border-border px-5 py-5 sm:px-8 sm:py-6">
                  <span className={cn(styles.icon, "hidden sm:inline-flex")}>
                    <activeTab.icon size={23} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">
                      {editing ? "Editing" : "Section"} {activeIndex + 1} of {tabs.length}
                    </p>
                    <h2 id="profile-section-title" className="mt-1 text-lg font-semibold tracking-tight">
                      {activeTab.subtitle}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {activeTab.description}
                    </p>
                  </div>
                </div>
                {section === "photo" && record?.id ? (
                  <div className="p-5 sm:p-8">
                    {editing ? (
                      <CandidatePhotoUpload
                        initialEmail={email}
                        lockedEmail
                        disabled={busy}
                        existingUrl={draft.profile_image}
                        onBusyChange={setPhotoBusy}
                        onUploaded={(url, uploadedFile) => {
                          setPhotoFile(uploadedFile);
                          setDraft((prev) => ({ ...prev, profile_image: url }));
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-6 py-4 text-center sm:flex-row sm:text-left">
                        <div className="grid size-32 shrink-0 place-items-center overflow-hidden rounded-3xl border border-border bg-accent text-primary">
                          {photoSrc ? (
                            <img
                              src={photoSrc}
                              alt={`Profile photo of ${name}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Camera size={32} aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {photoSrc ? "Your profile photo" : "No photo yet"}
                          </h3>
                          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                            {photoSrc
                              ? "This is the photo recruiters see. Want a fresh look?"
                              : "A clear, friendly photo helps recruiters put a face to your name."}
                          </p>
                          <button
                            type="button"
                            onClick={() => startEditing("photo")}
                            className={cn(styles.secondary, "mt-4")}
                          >
                            <Camera size={16} aria-hidden="true" />
                            {draft.profile_image ? "Change photo" : "Add photo"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <form
                    id="candidate-details"
                    onSubmit={save}
                    className="p-5 sm:p-8"
                    aria-busy={busy}
                  >
                    <fieldset disabled={busy || photoBusy} className="min-w-0">
                      {candidateRelatedModules[activeTab.id] ? (
                        related[activeTab.id]?.loading ? (
                          <div role="status" className="relative space-y-3">
                            <span className="sr-only left-0 top-0">Loading {activeTab.label.toLowerCase()}</span>
                            {[0, 1].map((key) => (
                              <div key={key} className="h-24 animate-pulse rounded-2xl bg-muted motion-reduce:animate-none" />
                            ))}
                          </div>
                        ) : related[activeTab.id]?.error ? (
                          <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm">
                            <p className="text-destructive">{related[activeTab.id].error}</p>
                            <button
                              type="button"
                              onClick={() =>
                                setRelatedRetry((value) => value + 1)
                              }
                              className={cn(styles.secondary, "mt-3")}
                            >
                              Retry
                            </button>
                          </div>
                        ) : (
                          <ProfileSectionContent
                            section={activeTab.id}
                            draft={{
                              ...draft,
                              resumeSections: {
                                [activeTab.id]:
                                  related[activeTab.id]?.items || [],
                              },
                            }}
                            setDraft={(updater) => {
                              const key = activeTab.id;
                              const entry = relatedCache.current[key];
                              if (!entry) return;
                              const updated = updater({
                                ...draft,
                                resumeSections: { [key]: entry.items },
                              });
                              relatedCache.current[key] = {
                                ...entry,
                                items: updated.resumeSections[key],
                              };
                              setRelated((prev) => ({
                                ...prev,
                                [key]: relatedCache.current[key],
                              }));
                            }}
                            editing={editing}
                          />
                        )
                      ) : (
                        <ProfileSectionContent
                          section={activeTab.id}
                          draft={draft}
                          setDraft={setDraft}
                          editing={editing}
                          email={email}
                          fieldErrors={fieldErrors}
                          setFieldErrors={setFieldErrors}
                        />
                      )}
                    </fieldset>
                  </form>
                )}
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-4 sm:px-8",
                    editing && "sticky bottom-0 z-10 bg-card/95 backdrop-blur-sm",
                  )}
                >
                  <div className="flex items-center gap-1">
                    {previousTab && (
                      <button
                        type="button"
                        disabled={busy || photoBusy}
                        onClick={() => goTo(previousTab.id)}
                        className={cn(sectionNavButton, "text-muted-foreground hover:text-foreground")}
                        aria-label={`Previous section: ${previousTab.label}`}
                      >
                        <ArrowLeft size={16} aria-hidden="true" />
                        <span className="hidden sm:inline">{previousTab.label}</span>
                      </button>
                    )}
                    {nextTab && (
                      <button
                        type="button"
                        disabled={busy || photoBusy}
                        onClick={() => goTo(nextTab.id)}
                        className={cn(sectionNavButton, "text-primary")}
                        aria-label={`Next section: ${nextTab.label}`}
                      >
                        <span>{nextTab.label}</span>
                        <ArrowRight size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {editing && (
                    <div className="flex w-full gap-2 sm:w-auto">
                      <button
                        type="button"
                        disabled={busy || photoBusy}
                        onClick={cancelEditing}
                        className={cn(styles.secondary, "flex-1 sm:flex-none")}
                      >
                        Cancel
                      </button>
                      <button
                        type={section === "photo" ? "button" : "submit"}
                        form={
                          section === "photo" ? undefined : "candidate-details"
                        }
                        onClick={section === "photo" ? save : undefined}
                        disabled={busy || photoBusy}
                        className={cn(styles.primary, "flex-1 sm:flex-none")}
                      >
                        {busy ? (
                          <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                        ) : (
                          <Save size={16} aria-hidden="true" />
                        )}
                        {busy ? "Saving..." : "Save profile"}
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
