import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./profile/onboardingStyles";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { resetPageScroll } from "../../utils/resetPageScroll";
import { candidateSources, validatePersonalDetails } from "./profile/onboardingValidation";
import { useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Camera,
  CircleCheck,
  ExternalLink,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Quote,
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
import { displayUrl, isWebUrl, profileCompletion } from "./profile/profileDisplay";
import LoadingPage from "./LoadingPage";
import ResumeLoading from "./profile/ResumeLoading";
import ResumeUpload from "./profile/ResumeUpload";
import { useQueryClient } from "@tanstack/react-query";
import { candidateKey } from "../../queries/candidate.queries";
import EmployeeOptions from "../employement/components/employee-actions/EmployeeOptions";
import { CandidateChip, CandidatePageHeader } from "./candidate/candidateUi";
import { candidateStyles } from "./candidate/candidateStyles";

const metaItem = "inline-flex min-w-0 max-w-full items-center gap-1.5 text-[13px] text-foreground/80 [&>svg]:shrink-0 [&>svg]:text-muted-foreground";
const tocLink = "flex min-h-10 items-center justify-between gap-2 rounded-lg px-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none";

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

/** One section of the saved profile: title, count, and its own Edit button. */
function ProfileSection({ id, icon, title, count, onEdit, editLabel = "Edit", busy, children }) {
  const Icon = icon;
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn(candidateStyles.card, "scroll-mt-6 overflow-clip")}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-5">
        <span className={cn(candidateStyles.tile, "size-9 rounded-[10px]")}>
          <Icon size={17} aria-hidden="true" />
        </span>
        <h2 id={`${id}-title`} className="min-w-0 flex-1 truncate text-base font-semibold">
          {title}
          {count !== undefined && <span className="ml-1.5 text-[13px] font-medium text-muted-foreground">· {count}</span>}
        </h2>
        {onEdit && (
          <button type="button" onClick={onEdit} disabled={busy} className={cn(candidateStyles.ghost, "-mr-1")} aria-label={`${editLabel} ${title.toLowerCase()}`}>
            <Pencil size={15} aria-hidden="true" />
            {editLabel}
          </button>
        )}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
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

  // The profile reads as one page, so every related section loads together.
  useEffect(() => {
    if (!record?.id) return;
    const missing = Object.keys(candidateRelatedModules).filter((key) => !relatedCache.current[key]?.items);
    if (!missing.length) return;
    let active = true;
    setRelated((prev) => ({ ...prev, ...Object.fromEntries(missing.map((key) => [key, { loading: true }])) }));
    for (const key of missing) {
      fetchCandidateRelated(record.id, key)
        .then((items) => {
          if (active) {
            relatedCache.current[key] = { items, original: items };
            setRelated((prev) => ({ ...prev, [key]: relatedCache.current[key] }));
          }
        })
        .catch((err) => {
          if (active) setRelated((prev) => ({ ...prev, [key]: { error: err.message } }));
        });
    }
    return () => {
      active = false;
    };
  }, [record?.id, relatedRetry]);

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
      setRelatedRetry((value) => value + 1);
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
  const initials = [draft?.first_name, draft?.last_name].filter(Boolean).map((part) => part[0]).join("").toUpperCase();
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
  const locked = busy || photoBusy;
  const startEditing = (next = section) => {
    if (locked) return;
    setFieldErrors({});
    setSection(next);
    setPhase("edit");
  };
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
  const relatedCount = (key) => related[key]?.items?.length;
  const sectionNav = [
    ["section-about", "About"],
    ["section-details", "Personal details"],
    ["section-experiences", "Experience", relatedCount("experiences")],
    ["section-education", "Education", relatedCount("education")],
    ["section-skills", "Skills", relatedCount("skills")],
    ...(record?.id ? [["section-photo", "Profile photo"]] : []),
  ];

  // Related sections (experience, education, skills) share one view and one editor.
  const renderRelated = (key, editable) => {
    const tab = tabs.find((item) => item.id === key);
    return related[key]?.loading ? (
      <div role="status" className="space-y-3">
        <span className="sr-only">Loading {tab.label.toLowerCase()}</span>
        {[0, 1].map((item) => (
          <div key={item} className="h-20 rounded-xl bg-muted motion-safe:animate-pulse" />
        ))}
      </div>
    ) : related[key]?.error ? (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
        <p className="text-destructive">{related[key].error}</p>
        <button type="button" onClick={() => setRelatedRetry((value) => value + 1)} className={cn(styles.secondary, "mt-3")}>
          Retry
        </button>
      </div>
    ) : (
      <ProfileSectionContent
        section={key}
        draft={{ ...draft, resumeSections: { [key]: related[key]?.items || [] } }}
        setDraft={(updater) => {
          const entry = relatedCache.current[key];
          if (!entry) return;
          const updated = updater({ ...draft, resumeSections: { [key]: entry.items } });
          relatedCache.current[key] = { ...entry, items: updated.resumeSections[key] };
          setRelated((prev) => ({ ...prev, [key]: relatedCache.current[key] }));
        }}
        editing={editable}
      />
    );
  };

  return (
    <main
      ref={pageRef}
      className={cn(
        "relative",
        standalone
          ? "text-foreground [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-primary [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-4 [&_summary:focus-visible]:outline-primary  min-h-dvh bg-background px-4 pb-8 sm:px-8 sm:pb-12 [&_button]:cursor-pointer [&_button:disabled]:cursor-default"
          : "text-foreground [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-primary [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-4 [&_summary:focus-visible]:outline-primary min-h-full bg-background",
        // OnboardingBackdrop fills <main> behind the onboarding welcome and upload screens.
        showOnboardingBackdrop && "isolate",
        showOnboardingBackdrop && standalone && phase !== "builder" && "lg:pb-0",
      )}
    >

      <div
        className={
          standalone ? `mx-auto max-w-[1400px] space-y-6 ${phase === "builder" || phase === "upload" ? "pt-[22px] sm:pt-0" : ""}` : candidateStyles.page
        }
      >
        {!standalone && (
          <CandidatePageHeader
            icon={UserRound}
            title="My profile"
            description="This is what recruiters see when you apply. Keep it current."
          >
            {!editing && (
              <span className={cn(styles.status, "px-3 py-1.5 text-xs", record?.id && "border-primary/20 bg-primary/5 text-primary")}>
                <ShieldCheck size={14} aria-hidden="true" />
                {record?.id ? "Profile saved" : "Complete your profile"}
              </span>
            )}
          </CandidatePageHeader>
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
              setRelatedRetry((value) => value + 1);
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
            <section aria-label="Who you are" className={cn(candidateStyles.card, "flex flex-wrap items-center gap-5 p-5 sm:p-6")}>
              <div className="flex size-[88px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-border bg-accent text-[28px] font-semibold text-primary">
                {photoSrc ? (
                  <img
                    key={photoSrc}
                    src={photoSrc}
                    alt={`Profile photo of ${name}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initials || <UserRound size={34} aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1 basis-72 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <h2 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{name}</h2>
                  {record?.status && (
                    <CandidateChip tone="progress" icon={BadgeCheck}>
                      <span className="sr-only">Status: </span>
                      {record.status}
                    </CandidateChip>
                  )}
                </div>
                <p className="text-[15px] text-foreground/80">
                  {draft.current_designation || <span className="text-muted-foreground">Professional title not added</span>}
                </p>
                <ul aria-label="Contact details" className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {draft.primary_address_city && (
                    <li className={metaItem}>
                      <MapPin size={14} aria-hidden="true" />
                      {[draft.primary_address_city, draft.primary_address_country].filter(Boolean).join(", ")}
                    </li>
                  )}
                  <li className={metaItem}>
                    <Mail size={14} aria-hidden="true" />
                    <span className="break-all">{email}</span>
                  </li>
                  {draft.phone_mobile && (
                    <li className={metaItem}>
                      <Phone size={14} aria-hidden="true" />
                      {draft.phone_mobile}
                    </li>
                  )}
                  {isWebUrl(draft.linkedin_url) && (
                    <li className={metaItem}>
                      <ExternalLink size={14} aria-hidden="true" />
                      <a href={draft.linkedin_url} target="_blank" rel="noopener noreferrer" className="truncate text-primary underline-offset-4 hover:underline">
                        {displayUrl(draft.linkedin_url)}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  )}
                </ul>
              </div>
              {!editing ? (
                <button
                  type="button"
                  className={cn(styles.secondary, "w-full sm:w-auto")}
                  onClick={() => startEditing("personal")}
                >
                  <Pencil size={16} aria-hidden="true" />
                  Edit details
                </button>
              ) : (
                <CandidateChip tone="attention" icon={Pencil} className="px-3 py-1.5 text-xs">
                  {record?.id ? `Editing ${activeTab.label.toLowerCase()}` : "Draft, review before saving"}
                </CandidateChip>
              )}
            </section>

            {editing ? (
              <section
                id="profile-section"
                aria-labelledby="profile-section-title"
                className={cn(candidateStyles.card, "min-w-0 overflow-clip")}
              >
                <div className="flex items-start gap-4 border-b border-border px-5 py-5 sm:px-6">
                  <span className={cn(styles.icon, "hidden sm:inline-flex")}>
                    <activeTab.icon size={23} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className={candidateStyles.eyebrow}>Editing</p>
                    <h2 id="profile-section-title" className="mt-0.5 text-lg font-semibold tracking-tight">
                      {activeTab.subtitle}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {activeTab.description}
                    </p>
                  </div>
                </div>
                {section === "photo" && record?.id ? (
                  <div className="p-5 sm:p-6">
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
                  </div>
                ) : (
                  <form
                    id="candidate-details"
                    onSubmit={save}
                    className="p-5 sm:p-6"
                    aria-busy={busy}
                  >
                    <fieldset disabled={locked} className="min-w-0">
                      {candidateRelatedModules[activeTab.id] ? (
                        renderRelated(activeTab.id, true)
                      ) : (
                        <ProfileSectionContent
                          section={activeTab.id}
                          draft={draft}
                          setDraft={setDraft}
                          editing
                          email={email}
                          fieldErrors={fieldErrors}
                          setFieldErrors={setFieldErrors}
                        />
                      )}
                    </fieldset>
                  </form>
                )}
                <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/95 px-5 py-4 backdrop-blur-sm sm:px-6">
                  <p className="text-[13px] text-muted-foreground">Changes apply to applications you send from now on.</p>
                  <div className="flex w-full gap-2 sm:w-auto">
                    <button
                      type="button"
                      disabled={locked}
                      onClick={cancelEditing}
                      className={cn(styles.secondary, "flex-1 sm:flex-none")}
                    >
                      Cancel
                    </button>
                    <button
                      type={section === "photo" ? "button" : "submit"}
                      form={section === "photo" ? undefined : "candidate-details"}
                      onClick={section === "photo" ? save : undefined}
                      disabled={locked}
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
                </div>
              </section>
            ) : (
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-4">
                  <ProfileSection id="section-about" icon={Quote} title="About" onEdit={() => startEditing("personal")} busy={locked}>
                    {draft.description ? (
                      <p className="break-words whitespace-pre-wrap text-[15px] leading-7 text-foreground/85">{draft.description}</p>
                    ) : (
                      <p className="text-sm leading-6 text-muted-foreground">
                        A short introduction in your own words: what you build, the tools you like, and the kind of team you want to join next.
                      </p>
                    )}
                  </ProfileSection>
                  <ProfileSection id="section-details" icon={UserRound} title="Personal details" onEdit={() => startEditing("personal")} busy={locked}>
                    <ProfileSectionContent section="personal" draft={draft} setDraft={setDraft} editing={false} hideAbout />
                  </ProfileSection>
                  <ProfileSection id="section-experiences" icon={BriefcaseBusiness} title="Experience" count={relatedCount("experiences")} onEdit={() => startEditing("experiences")} busy={locked}>
                    {renderRelated("experiences", false)}
                  </ProfileSection>
                  <ProfileSection id="section-education" icon={GraduationCap} title="Education" count={relatedCount("education")} onEdit={() => startEditing("education")} busy={locked}>
                    {renderRelated("education", false)}
                  </ProfileSection>
                  <ProfileSection id="section-skills" icon={Sparkles} title="Skills" count={relatedCount("skills")} onEdit={() => startEditing("skills")} busy={locked}>
                    {renderRelated("skills", false)}
                  </ProfileSection>
                  {record?.id && (
                    <ProfileSection id="section-photo" icon={Camera} title="Profile photo" onEdit={() => startEditing("photo")} editLabel={draft.profile_image ? "Change" : "Add"} busy={locked}>
                      <div className="flex items-center gap-4">
                        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-border bg-accent text-primary">
                          {photoSrc ? (
                            <img src={photoSrc} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <Camera size={22} aria-hidden="true" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{photoSrc ? "Shown to recruiters next to your name" : "No photo yet"}</p>
                          <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
                            {photoSrc ? "Want a fresh look? Change it any time." : "A clear, friendly photo helps recruiters put a face to your name."}
                          </p>
                        </div>
                      </div>
                    </ProfileSection>
                  )}
                </div>

                <aside className="min-w-0 space-y-4 lg:sticky lg:top-4">
                  <div className={cn(candidateStyles.card, "p-5")}>
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="text-[15px] font-semibold">Profile strength</h2>
                      <span className="text-[22px] font-semibold tabular-nums text-primary">
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
                                disabled={locked}
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
                      <p className="mt-4 flex items-start gap-2 text-[13px] leading-5 text-muted-foreground">
                        <CircleCheck size={15} className="mt-px shrink-0 text-primary" aria-hidden="true" />
                        Your profile is complete. You're ready to apply to any open role.
                      </p>
                    )}
                  </div>
                  <nav aria-label="On this page" className={cn(candidateStyles.card, "hidden p-3 lg:block")}>
                    <p className="px-2.5 pt-1 pb-2 text-xs font-semibold text-muted-foreground">On this page</p>
                    <ul>
                      {sectionNav.map(([id, label, count]) => (
                        <li key={id}>
                          <a href={`#${id}`} className={tocLink}>
                            {label}
                            {count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{count}</span>}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                  {record?.id && !standalone && (
                    <div className={cn(candidateStyles.card, "p-5")}>
                      <h2 className="text-[15px] font-semibold">Where this profile is used</h2>
                      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">You apply to roles with these details. Changes apply to applications you send from now on.</p>
                      <Link to="/job-application" className={cn(candidateStyles.ghost, "mt-2 -ml-2.5")}>View my applications</Link>
                    </div>
                  )}
                  {userPhase === "Employment" && <EmployeeOptions />}
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
