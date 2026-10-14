import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./profile/onboardingStyles";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { resetPageScroll } from "../../utils/resetPageScroll";
import { candidateSources, governmentIdError, normalizeGovernmentId, validatePersonalDetails } from "./profile/onboardingValidation";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getUser } from "../../store/Slices/userSlice";
import {
  AlignLeft,
  ArrowLeft,
  ArrowRight,
  Bell,
  Briefcase,
  BriefcaseBusiness,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  ExternalLink,
  FileBadge,
  FileSpreadsheet,
  FileText,
  Globe,
  GraduationCap,
  Home,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Receipt,
  Save,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  UserCheck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { FETCH_GPC_X_API_KEY } from "../../store/constants";
import { crmFetch } from "../../services/crmClient";
import CandidateWelcome from "./profile/CandidateWelcome";
import OnboardingWelcome from "./profile/OnboardingWelcome";
import { governmentDocumentFileError, governmentDocumentNumbersMatch, scanGovernmentDocument } from "./profile/governmentDocument.js";
import CandidateResumeBuilder from "./profile/CandidateResumeBuilder";
import {
  candidateProfileStartPhase,
  hasParsedResume,
  rememberOnboardingComplete,
  rememberResumeParsed,
} from "./profile/onboardingState";
import {
  candidateRelatedModules,
  createCandidateRelated,
  fetchCandidateRelated,
  saveCandidateRelated,
  deleteCandidateRelated,
  isCandidateRelatedRecordEmpty,
  findCandidate,
  normalizeCandidate,
  saveCandidate,
} from "./profile/candidateApi";

import ProfileSectionContent from "./profile/ProfileSectionContent";
import LoadingPage from "./LoadingPage";
import ResumeLoading from "./profile/ResumeLoading";
import ResumeUpload from "./profile/ResumeUpload";
import { useQueryClient } from "@tanstack/react-query";
import { candidateKey } from "../../queries/candidate.queries";
import EmployeeOptions from "../employement/components/employee-actions/EmployeeOptions";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sidebar-primary to-sidebar-secondary px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50";
const secondaryButton =
  "rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export default function Profile({ standalone = false, onComplete }) {
  const loggedInUser = useSelector((state) => state.user.user);
  const businessEmail = useSelector((state) => state.user.businessEmail);
  const email = (
    loggedInUser?.email ||
    loggedInUser?.email1 ||
    loggedInUser?.email_address ||
    businessEmail ||
    ""
  )?.trim();
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
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const cachedCandidate = queryClient.getQueryData(candidateKey(email));
  const user = useSelector((state) => state.user.user);
  const userInfo = useSelector((state) => state.user.userInfo);
  const userPhase = userInfo?.phase;
  const [section, setSection] = useState("personal");
  const [candidateFlowStarted, setCandidateFlowStarted] = useState(false);
  const [record, setRecord] = useState(cachedCandidate ?? null);
  const [draft, setDraft] = useState(() => {
    const base = cachedCandidate
      ? normalizeCandidate(cachedCandidate, email)
      : (email ? normalizeCandidate({}, email) : null);
    if (!base) return null;
    if (!base.first_name && user?.first_name) base.first_name = user.first_name;
    if (!base.last_name && user?.last_name) base.last_name = user.last_name;
    if (!base.phone_mobile && (user?.phone_mobile || user?.phone || user?.mobile))
      base.phone_mobile = user.phone_mobile || user.phone || user.mobile;
    return base;
  });
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
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

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
    if (message) toast.error(message, { id: "profile-error" });
  };
  const [file, setFile] = useState(null);
  const [governmentIdType, setGovernmentIdType] = useState("pan");
  const [governmentIdNumber, setGovernmentIdNumber] = useState("");
  const [governmentDocumentFile, setGovernmentDocumentFile] = useState(null);
  const [documentScan, setDocumentScan] = useState(null);
  const [documentScanBusy, setDocumentScanBusy] = useState(false);
  const [documentScanError, setDocumentScanError] = useState("");
  const documentRequestRef = useRef(null);
  const documentMatches = Boolean(
    documentScan?.file === governmentDocumentFile &&
    documentScan?.type === governmentIdType &&
    governmentDocumentNumbersMatch(governmentIdType, governmentIdNumber, documentScan?.number),
  );
  useEffect(() => () => {
    documentRequestRef.current?.abort();
    documentRequestRef.current = null;
  }, []);
  const resetDocumentScan = () => {
    documentRequestRef.current?.abort();
    documentRequestRef.current = null;
    setDocumentScanBusy(false);
    setDocumentScan(null);
    setDocumentScanError("");
  };
  const selectGovernmentDocument = (selected) => {
    resetDocumentScan();
    setGovernmentDocumentFile(null);
    if (!selected) return;
    const fileError = governmentDocumentFileError(selected);
    if (fileError) { setDocumentScanError(fileError); return; }
    setGovernmentDocumentFile(selected);
  };
  const scanDocument = async () => {
    if (documentRequestRef.current) return;
    const idError = governmentIdError(governmentIdType, governmentIdNumber);
    if (idError) {
      setDocumentScanError(idError);
      document.getElementById("resume-id-number")?.focus();
      return;
    }
    const controller = new AbortController();
    documentRequestRef.current = controller;
    setDocumentScanBusy(true);
    setDocumentScan(null);
    setDocumentScanError("");
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const number = await scanGovernmentDocument({
        file: governmentDocumentFile, type: governmentIdType,
        request: crmFetch, signal: controller.signal, apiKey: FETCH_GPC_X_API_KEY,
      });
      if (documentRequestRef.current === controller && !controller.signal.aborted)
        setDocumentScan({ file: governmentDocumentFile, type: governmentIdType, number });
    } catch (err) {
      if (documentRequestRef.current === controller)
        setDocumentScanError(err.name === "AbortError" ? "Document scanning timed out. Please try again." : err.message);
    } finally {
      clearTimeout(timeout);
      if (documentRequestRef.current === controller) {
        documentRequestRef.current = null;
        setDocumentScanBusy(false);
      }
    }
  };
  const [stage, setStage] = useState("");
  const pageRef = useRef(null);
  const uploadProcessing = phase === "upload" && busy;
  useLayoutEffect(() => { resetPageScroll(pageRef.current); }, [phase, section, uploadProcessing, candidateFlowStarted]);
  const [related, setRelated] = useState({});
  const [relatedRetry, setRelatedRetry] = useState(0);
  const relatedCache = useRef({});
  const deletedRelatedIdsRef = useRef({ education: [], experiences: [], skills: [] });
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
      const base = cached ? normalizeCandidate(cached, email) : (email ? normalizeCandidate({}, email) : null);
      if (base) {
        if (!base.first_name && user?.first_name) base.first_name = user.first_name;
        if (!base.last_name && user?.last_name) base.last_name = user.last_name;
        if (!base.phone_mobile && (user?.phone_mobile || user?.phone || user?.mobile))
          base.phone_mobile = user.phone_mobile || user.phone || user.mobile;
      }
      setDraft(base);
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
        const base = candidate ? normalizeCandidate(candidate, email) : (email ? normalizeCandidate({}, email) : null);
        if (base) {
          if (!base.first_name && user?.first_name) base.first_name = user.first_name;
          if (!base.last_name && user?.last_name) base.last_name = user.last_name;
          if (!base.phone_mobile && (user?.phone_mobile || user?.phone || user?.mobile))
            base.phone_mobile = user.phone_mobile || user.phone || user.mobile;
        }
        setDraft(base);
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
    if (!record?.id) return;
    const modules = ["education", "experiences", "skills"];
    for (const mod of modules) {
      if (relatedCache.current[mod]?.items) continue;
      setRelated((prev) => ({ ...prev, [mod]: { loading: true } }));
      fetchCandidateRelated(record.id, mod)
        .then((items) => {
          const validItems = (items || []).filter((item) => !isCandidateRelatedRecordEmpty(mod, item));
          relatedCache.current[mod] = { items: validItems, original: validItems };
          setRelated((prev) => ({
            ...prev,
            [mod]: relatedCache.current[mod],
          }));
        })
        .catch((err) => {
          setRelated((prev) => ({
            ...prev,
            [mod]: { error: err.message, items: [] },
          }));
        });
    }
  }, [record?.id, relatedRetry]);

  const parseResume = async (event) => {
    event.preventDefault();
    if (!file || !email || requestRef.current) return;
    setError("");
    const idError = governmentIdError(governmentIdType, governmentIdNumber);
    if (idError) {
      setError(idError);
      document.getElementById("resume-id-number")?.focus();
      return;
    }
    if (documentScanBusy || !documentMatches) {
      setError("Verify your government ID before uploading your resume.");
      document.getElementById("government-document-file")?.focus();
      return;
    }
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
      const idNumber = normalizeGovernmentId(governmentIdType, governmentIdNumber);
      body.append("government_id_type", governmentIdType);
      body.append("government_id_number", idNumber);
      if (governmentIdType === "pan") body.append("pan_card_number", idNumber);
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

  const save = async (event, scope) => {
    if (event?.preventDefault) event.preventDefault();
    if (saveLock.current || photoBusy) return;

    // Central error reporter that surfaces exactly one deduplicated toast notification
    const reportError = (msg) => {
      setError(msg);
    };

    // Helper: Validate Basic / Personal information
    const validateBasicInfo = () => {
      const firstName = String(draft?.first_name || "").trim();
      if (!firstName) {
        reportError("First name is required.");
        return false;
      }

      const lastName = String(draft?.last_name || "").trim();
      if (!lastName) {
        reportError("Last name is required.");
        return false;
      }

      const rawMobile = String(draft?.phone_mobile || "").trim();
      const digitsMobile = rawMobile.replace(/\D/g, "");
      if (!digitsMobile) {
        reportError("Mobile phone number is required.");
        return false;
      }
      if (digitsMobile.length !== 10) {
        reportError("Mobile phone number must be exactly 10 digits without country code or letters.");
        return false;
      }
      if (draft) {
        draft.phone_mobile = digitsMobile;
      }

      const dob = String(draft?.dob || "").trim();
      if (!dob) {
        reportError("Date of birth is required.");
        return false;
      }
      const today = new Date().toISOString().slice(0, 10);
      if (dob > today) {
        reportError("Enter a valid date of birth that is not in the future.");
        return false;
      }

      const gender = String(draft?.gender || "").trim();
      if (!gender) {
        reportError("Gender is required. Please select your gender.");
        return false;
      }

      const country = String(draft?.primary_address_country || "").trim();
      if (!country) {
        reportError("Country is required.");
        return false;
      }

      return true;
    };

    // Helper: Validate Address information
    const validateAddress = () => {
      const street = String(draft?.primary_address_street || "").trim();
      if (!street) {
        reportError("Street address is required.");
        return false;
      }

      const city = String(draft?.primary_address_city || "").trim();
      if (!city) {
        reportError("City is required.");
        return false;
      }

      const state = String(draft?.primary_address_state || "").trim();
      if (!state) {
        reportError("State / Region / Province is required.");
        return false;
      }

      const country = String(draft?.primary_address_country || "").trim();
      if (!country) {
        reportError("Country is required.");
        return false;
      }

      const postal = String(draft?.primary_address_postalcode || "").trim();
      if (!postal) {
        reportError("Postal code is required.");
        return false;
      }
      if (/\D/.test(postal)) {
        reportError("Postal code must contain numbers only.");
        return false;
      }

      return true;
    };

    // Helper: Validate Professional details
    const validateProfessional = () => {
      const aboutYou = String(draft?.description || "").trim();
      if (!aboutYou) {
        reportError("About you section is required with at least 50 characters.");
        return false;
      }
      if (aboutYou.length < 50) {
        reportError(`About you must be at least 50 characters long (currently ${aboutYou.length} characters).`);
        return false;
      }

      for (const key of ["linkedin_url", "github_url"]) {
        if (!draft[key]?.trim()) continue;
        try {
          const url = new URL(normalizeProfileUrl(draft[key]));
          if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
            throw new Error();
          }
        } catch {
          reportError(`Please enter a valid URL for ${key === "linkedin_url" ? "LinkedIn" : "GitHub"}.`);
          return false;
        }
      }
      return true;
    };

    // Helper: Validate Education entries
    const validateEducation = () => {
      const items =
        relatedCache.current?.education?.items ||
        related?.education?.items ||
        draft?.resumeSections?.education ||
        [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id && isCandidateRelatedRecordEmpty("education", item)) continue;
        const num = items.length > 1 ? ` for education record #${i + 1}` : "";
        const qual = String(item.qualification || item.name || "").trim();
        const inst = String(item.institution || item.university || item.school || "").trim();
        const percentage = String(item.percentage || "").trim();
        const startDate = String(item.from_time || "").trim();
        const endDate = String(item.to_time || "").trim();

        if (!qual) {
          reportError(`Degree / Qualification is required${num}.`);
          return false;
        }
        if (!inst) {
          reportError(`Institution / University is required${num}.`);
          return false;
        }
        if (!percentage) {
          reportError(`Percentage / Grade / GPA is required${num}.`);
          return false;
        }
        if (!startDate) {
          reportError(`Start Year / Date is required${num}.`);
          return false;
        }
        if (!endDate) {
          reportError(`End Year / Date is required${num}.`);
          return false;
        }
        if (startDate && endDate) {
          const s = parseInt(startDate, 10);
          const e = parseInt(endDate, 10);
          if (!isNaN(s) && !isNaN(e) && s > e) {
            reportError(`End Year / Date cannot be earlier than Start Year / Date${num}.`);
            return false;
          }
        }
      }
      return true;
    };

    // Helper: Validate Experience entries
    const validateExperience = () => {
      const items =
        relatedCache.current?.experiences?.items ||
        related?.experiences?.items ||
        draft?.resumeSections?.experiences ||
        [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id && isCandidateRelatedRecordEmpty("experiences", item)) continue;
        const num = items.length > 1 ? ` for work experience record #${i + 1}` : "";
        const pos = String(item.name || item.designation || item.position || "").trim();
        const comp = String(item.company_name || item.company || "").trim();
        const loc = String(item.company_location || "").trim();
        const startDate = String(item.joining_date || "").trim();
        const endDate = String(item.leaving_date || "").trim();

        if (!pos) {
          reportError(`Role / Job Title is required${num}.`);
          return false;
        }
        if (!comp) {
          reportError(`Company name is required${num}.`);
          return false;
        }
        if (!loc) {
          reportError(`Location is required${num}.`);
          return false;
        }
        if (!startDate) {
          reportError(`Start Date is required${num}.`);
          return false;
        }
        if (!endDate) {
          reportError(`End Date is required${num}.`);
          return false;
        }
        if (startDate && endDate && startDate > endDate) {
          reportError(`End Date cannot be earlier than Start Date${num}.`);
          return false;
        }
      }
      return true;
    };

    // Helper: Validate Skills entries
    const validateSkills = () => {
      const items =
        relatedCache.current?.skills?.items ||
        related?.skills?.items ||
        draft?.resumeSections?.skills ||
        [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.id && isCandidateRelatedRecordEmpty("skills", item)) continue;
        const num = items.length > 1 ? ` for skill record #${i + 1}` : "";
        const sk = String(item.skill_name || item.name || "").trim();
        const duration = String(item.total_years_total_months || "").trim();

        if (!sk) {
          reportError(`Skill name is required${num}.`);
          return false;
        }
        if (!duration) {
          reportError(`Experience duration is required${num}.`);
          return false;
        }
      }
      return true;
    };

    // Section-specific validation based on scope
    if (scope === "basic_info" || scope === "sidebar") {
      // ONLY validate the Basic Information section fields!
      if (!validateBasicInfo()) return;
    } else if (scope === "personal") {
      if (!validateBasicInfo()) return;
    } else if (scope === "address") {
      if (!validateAddress()) return;
    } else if (scope === "professional") {
      if (!validateProfessional()) return;
    } else if (scope === "education") {
      if (!validateEducation()) return;
    } else if (scope === "experiences") {
      if (!validateExperience()) return;
    } else if (scope === "skills") {
      if (!validateSkills()) return;
    } else {
      if (phase === "builder") {
        const personalErrors = validatePersonalDetails(draft);
        if (Object.keys(personalErrors).length) {
          setSection("personal");
          reportError(Object.values(personalErrors)[0]);
          requestAnimationFrame(() => document.getElementById(`profile-${Object.keys(personalErrors)[0]}`)?.focus());
          return;
        }
      } else {
        if (!validateBasicInfo()) return;
        if (
          draft?.primary_address_street ||
          draft?.primary_address_city ||
          draft?.primary_address_state ||
          draft?.primary_address_postalcode
        ) {
          if (!validateAddress()) return;
        }
        if (draft?.description) {
          if (!validateProfessional()) return;
        }
        if (!validateEducation()) return;
        if (!validateExperience()) return;
        if (!validateSkills()) return;
      }
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

      const relatedKeysToSave =
        scope === "education"
          ? ["education"]
          : scope === "experiences"
          ? ["experiences"]
          : scope === "skills"
          ? ["skills"]
          : scope === "basic_info" ||
            scope === "sidebar" ||
            scope === "personal" ||
            scope === "address" ||
            scope === "professional"
          ? []
          : Object.keys(relatedCache.current || {});

      for (const key of relatedKeysToSave) {
        const entry =
          relatedCache.current?.[key] || related?.[key] || { items: [], original: [] };
        if (!entry) continue;

        // 1. Permanently delete from SuiteCRM any items removed by user or ghost records
        const currentIds = new Set((entry.items || []).map((it) => it.id).filter(Boolean));
        const deletedIds = new Set(deletedRelatedIdsRef.current?.[key] || []);
        for (const orig of entry.original || []) {
          if (orig.id && (!currentIds.has(orig.id) || isCandidateRelatedRecordEmpty(key, orig))) {
            deletedIds.add(orig.id);
          }
        }
        for (const delId of deletedIds) {
          await deleteCandidateRelated(key, delId);
        }
        if (deletedRelatedIdsRef.current?.[key]) {
          deletedRelatedIdsRef.current[key] = [];
        }

        // 2. Save or create valid items
        for (const item of entry.items || []) {
          if (isCandidateRelatedRecordEmpty(key, item)) continue;

          const original = entry.original?.find((value) => value.id === item.id);
          if (item.id && original) {
            await saveCandidateRelated(key, item, original);
          } else if (saved.id && !item.id) {
            const created = await createCandidateRelated(key, saved.id, item);
            item.id = created.id;
          }
        }
        entry.original = (entry.items || [])
          .filter((value) => !isCandidateRelatedRecordEmpty(key, value))
          .map((value) => ({ ...value }));
        entry.items = [...entry.original];
        if (relatedCache.current) {
          relatedCache.current[key] = entry;
        }
        setRelated((prev) => ({
          ...prev,
          [key]: entry,
        }));
      }
      if (!alive.current) return;
      setSavedPhotoFile(photoFile);
      const updatedRecord = { ...existing, ...saved };
      setRecord(updatedRecord);
      setDraft(normalizeCandidate(updatedRecord, email));
      setPhase("view");
      toast.success("Profile updated successfully.");
      rememberOnboardingComplete(saved);
      queryClient.setQueryData(candidateKey(email), updatedRecord);
      onComplete?.(updatedRecord);
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
    : draft?.profile_image || record?.profile_image || "";
  const editing = phase === "edit";
  const name =
    [draft?.first_name, draft?.last_name].filter(Boolean).join(" ") ||
    draft?.name ||
    record?.name ||
    record?.full_name ||
    user?.name ||
    "Employee Profile";
  const initials =
    [draft?.first_name?.[0], draft?.last_name?.[0]]
      .filter(Boolean)
      .join("")
      .toUpperCase() ||
    (user?.name ? user.name[0]?.toUpperCase() : "") ||
    "EP";

  const handlePhotoUpload = async (fileToUpload) => {
    if (!fileToUpload) return;
    const targetEmail = (
      email ||
      draft?.email1 ||
      record?.email1 ||
      user?.email ||
      user?.email1 ||
      userInfo?.email ||
      ""
    ).trim();

    if (!targetEmail) {
      toast.error("Employee email not found. Please ensure your profile email is saved.");
      return;
    }

    if (!FETCH_GPC_X_API_KEY) {
      toast.error("Photo upload service is not configured. Please contact support.");
      return;
    }

    setPhotoBusy(true);
    try {
      const body = new FormData();
      body.append("email", targetEmail);
      body.append("image", fileToUpload, fileToUpload.name || "profile.jpg");

      const response = await crmFetch(
        "https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=upload_candidate_image",
        {
          method: "POST",
          headers: { "x-api-key": FETCH_GPC_X_API_KEY },
          body,
        }
      );

      const json = await response.json().catch(() => {
        throw new Error("Could not parse server response.");
      });

      if (!response.ok || json?.success !== true) {
        throw new Error(
          json?.message || json?.error || "Could not upload photo. Please try again."
        );
      }

      const imageUrl = json.image_url;
      if (!imageUrl || typeof imageUrl !== "string") {
        throw new Error("Invalid image URL returned by the server.");
      }

      const candidateId = record?.id || draft?.id;
      if (candidateId) {
        await saveCandidate(
          candidateId,
          { ...(record || {}), ...(draft || {}), profile_image: imageUrl },
          targetEmail
        );
      }

      setRecord((prev) => ({ ...(prev || {}), profile_image: imageUrl }));
      setDraft((prev) => ({ ...(prev || {}), profile_image: imageUrl }));
      setPhotoFile(null);
      setSavedPhotoFile(null);
      setLocalPhoto(null);

      queryClient.setQueryData(candidateKey(targetEmail), (old) =>
        old ? { ...old, profile_image: imageUrl } : old
      );

      toast.success("Profile photo updated successfully!");
      setPhotoModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to update profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    const targetEmail = (
      email ||
      draft?.email1 ||
      record?.email1 ||
      user?.email ||
      user?.email1 ||
      userInfo?.email ||
      ""
    ).trim();

    setPhotoBusy(true);
    try {
      const candidateId = record?.id || draft?.id;
      if (candidateId) {
        await saveCandidate(
          candidateId,
          { ...(record || {}), ...(draft || {}), profile_image: "" },
          targetEmail
        );
      }

      setRecord((prev) => ({ ...(prev || {}), profile_image: "" }));
      setDraft((prev) => ({ ...(prev || {}), profile_image: "" }));
      setPhotoFile(null);
      setSavedPhotoFile(null);
      setLocalPhoto(null);

      queryClient.setQueryData(candidateKey(targetEmail), (old) =>
        old ? { ...old, profile_image: "" } : old
      );

      toast.success("Profile photo removed.");
      setPhotoModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to remove profile photo.");
    } finally {
      setPhotoBusy(false);
    }
  };
  const completed = draft
    ? [
      "first_name",
      "last_name",
      "email1",
      "phone_mobile",
      "dob",
      "gender",
      "current_designation",
      "description",
      "primary_address_street",
      "primary_address_city",
      "primary_address_state",
      "primary_address_country",
      "primary_address_postalcode",
      "profile_image",
    ].filter((key) => draft[key]).length
    : 0;
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
  const cancelEditing = () => {
    relatedCache.current = Object.fromEntries(
      Object.entries(relatedCache.current).map(([key, entry]) => [
        key,
        { ...entry, items: entry.original ? [...entry.original] : [] },
      ]),
    );
    deletedRelatedIdsRef.current = { education: [], experiences: [], skills: [] };
    setRelated({ ...relatedCache.current });
    setPhotoFile(savedPhotoFile);
    setDraft(record ? normalizeCandidate(record, email) : null);
    setPhase(record ? "view" : "upload");
    setError("");
  };
  return (
    <main
      ref={pageRef}
      className={
        standalone
          ? "text-foreground [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-primary [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-4 [&_summary:focus-visible]:outline-primary  min-h-dvh bg-background px-4 pb-8 sm:px-8 sm:pb-12 [&_button]:cursor-pointer [&_button:disabled]:cursor-default"
          : "text-foreground [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-primary [&_summary:focus-visible]:outline-2 [&_summary:focus-visible]:outline-offset-4 [&_summary:focus-visible]:outline-primary min-h-full bg-background px-4 py-6 sm:px-8 sm:py-8"
      }
    >

      <div
        className={
          standalone ? `mx-auto max-w-[1400px] space-y-6 ${phase === "builder" || phase === "upload" ? "pt-[22px] sm:pt-0" : ""}` : "w-full space-y-6 mt-4"
        }
      >
        {!standalone && phase !== "view" && phase !== "edit" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-indigo-500">
                Candidate profile
              </p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                My profile
              </h1>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">
              <ShieldCheck size={14} className="text-emerald-500" />
              {record?.id
                ? "Profile saved"
                : "Complete your profile"}
            </span>
          </div>
        )}
        {phase === "error" && error && <div className={cn(styles.surface, `p-6 text-center`)}><p className="text-muted-foreground text-sm">Your profile could not be loaded.</p><button onClick={() => setRetry(value => value + 1)} className={cn(styles.primary, `mt-4`)}>Retry lookup</button></div>}
        {phase === "loading" && (
          <LoadingPage />
        )}
        {phase === "welcome" && !candidateFlowStarted && (
          <OnboardingWelcome onCandidate={() => setCandidateFlowStarted(true)} />
        )}
        {phase === "welcome" && candidateFlowStarted && (
          <CandidateWelcome
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
              if (!standalone) navigate("/profile", { replace: true });
            }}
          />
        )}
        {phase === "upload" &&
          (busy ? (
            <ResumeLoading
              filename={file?.name}
              phase={parsingPhase}
            />
          ) : (
            <ResumeUpload
              email={email}
              file={file}
              governmentIdType={governmentIdType}
              governmentIdNumber={governmentIdNumber}
              governmentDocumentFile={governmentDocumentFile}
              documentScanBusy={documentScanBusy}
              documentScanned={Boolean(documentScan)}
              documentMatches={documentMatches}
              documentScanError={documentScanError}
              onDocumentFileChange={selectGovernmentDocument}
              onDocumentScan={scanDocument}
              stage={stage}
              onIdTypeChange={type => { resetDocumentScan(); setGovernmentDocumentFile(null); setGovernmentIdType(type); setGovernmentIdNumber(""); }}
              onIdNumberChange={number => { setGovernmentIdNumber(number); setDocumentScanError(""); }}
              onStageChange={setStage}
              onFileChange={selectResume}
              onBack={() => { resetDocumentScan(); setError(""); setPhase("welcome"); }}
              onSubmit={parseResume}
            />
          ))}
        {draft && (phase === "view" || phase === "edit") && (
          <div className="space-y-6">
            {/* Top Navigation Bar with Tabs */}
            <ProfileHeaderNav
              activeTab={["personal", "education", "experiences", "skills"].includes(section) ? section : "personal"}
              setActiveTab={(tab) => {
                if (busy || photoBusy) return;
                setSection(tab);
              }}
            />

            {/* Main Content Layout: Left Sidebar + Right Cards */}
            <div className="flex flex-col lg:flex-row items-start gap-6">
              {/* Left Column Profile Sidebar Card */}
              <EmployeeProfileSidebar
                record={record}
                draft={draft}
                setDraft={setDraft}
                email={email}
                photoSrc={photoSrc}
                editing={editing}
                onEditToggle={() => {
                  if (editing) {
                    cancelEditing();
                  } else {
                    setPhase("edit");
                  }
                }}
                onSave={save}
                onCancel={cancelEditing}
                saving={busy}
                onPhotoUploadClick={() => setPhotoModalOpen(true)}
                photoBusy={photoBusy}
                user={user}
                userInfo={userInfo}
                userPhase={userInfo?.phase || userPhase}
                completedFieldsCount={completed}
                totalFieldsCount={14}
              />

              {/* Right Column Stack of Cards */}
              <EmployeeProfileCards
                activeTab={["personal", "education", "experiences", "skills"].includes(section) ? section : "personal"}
                setActiveTab={setSection}
                draft={draft}
                setDraft={setDraft}
                record={record}
                email={email}
                editing={editing}
                setEditing={(val) => setPhase(val ? "edit" : "view")}
                onSave={save}
                onCancel={cancelEditing}
                saving={busy}
                related={related}
                setRelated={setRelated}
                relatedCache={relatedCache}
                deletedRelatedIdsRef={deletedRelatedIdsRef}
              />
            </div>

            {/* Profile Photo Upload Modal */}
            <AnimatePresence>
              {photoModalOpen && (
                <ProfilePhotoModal
                  isOpen={photoModalOpen}
                  onClose={() => setPhotoModalOpen(false)}
                  currentPhoto={photoSrc}
                  initials={initials}
                  name={name}
                  onUpload={handlePhotoUpload}
                  onRemove={handlePhotoRemove}
                  isBusy={photoBusy}
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================================================================
   EMPLOYEE PROFILE SUBCOMPONENTS (MATCHING REFERENCE DESIGN)
   ========================================================================= */

function calculateAge(dob) {
  if (!dob) return "Not added";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "Not added";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? `${age} yrs` : "Not added";
}

export const PROFILE_BANNER_THEMES = [
  {
    id: "waves",
    name: "Architectural Waves",
    subtitle: "Minimalist silver ribbon flow",
    tag: "Default",
  },
  {
    id: "navy_tech",
    name: "Executive Slate & Navy",
    subtitle: "Deep corporate grid & ambient glow",
    tag: "Corporate",
  },
  {
    id: "ocean_blue",
    name: "Ocean & Sky Flow",
    subtitle: "High-tech vibrant blue layered waves",
    tag: "Vibrant",
  },
  {
    id: "aurora_mesh",
    name: "Aurora Indigo Mesh",
    subtitle: "Modern HR CRM organic mesh gradient",
    tag: "Modern",
  },
];

function ProfileCoverBanner({ theme = "waves", isThumbnail = false }) {
  const heightClass = isThumbnail ? "h-full w-full" : "h-36 w-full";

  if (theme === "navy_tech") {
    return (
      <div className={`relative ${heightClass} overflow-hidden bg-gradient-to-br from-[#0b0f19] via-[#111827] to-[#1e293b]`}>
        <svg
          className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          viewBox="0 0 420 160"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient id="navyLineGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="navyLineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
            <pattern id="navyGridDots" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="#94a3b8" fillOpacity="0.2" />
            </pattern>
          </defs>
          <rect width="420" height="160" fill="url(#navyGridDots)" />
          <path d="M-20,130 C80,60 180,150 300,85 C370,45 400,75 440,55 L440,160 L-20,160 Z" fill="url(#navyLineGrad1)" />
          <path d="M-20,150 C120,85 220,135 340,70 C390,45 420,60 440,45 L440,160 L-20,160 Z" fill="url(#navyLineGrad2)" />
          <path d="M-10,115 C100,50 200,120 320,65 C380,35 410,55 435,40" stroke="#38bdf8" strokeWidth="1.2" strokeOpacity="0.4" />
          <path d="M10,135 C120,70 220,130 340,75 C390,50 420,65 440,55" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.35" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  if (theme === "ocean_blue") {
    return (
      <div className={`relative ${heightClass} overflow-hidden bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700`}>
        <svg
          className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          viewBox="0 0 420 160"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <defs>
            <linearGradient id="oceanCurve1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="oceanCurve2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <circle cx="360" cy="25" r="95" fill="white" fillOpacity="0.08" />
          <circle cx="70" cy="140" r="75" fill="white" fillOpacity="0.05" />
          <path d="M-20,110 C90,55 190,120 310,65 C370,40 400,60 440,50 L440,160 L-20,160 Z" fill="url(#oceanCurve1)" />
          <path d="M-20,135 C110,85 230,135 340,80 C390,60 415,70 440,65 L440,160 L-20,160 Z" fill="url(#oceanCurve2)" />
          <path d="M0,95 C110,45 210,110 330,55 C380,30 410,48 435,38" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.35" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  if (theme === "aurora_mesh") {
    return (
      <div className={`relative ${heightClass} overflow-hidden bg-gradient-to-br from-indigo-800 via-purple-800 to-slate-950`}>
        <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-cyan-400/25 blur-2xl" />
        <div className="absolute top-2 right-2 h-36 w-36 rounded-full bg-pink-500/25 blur-2xl" />
        <div className="absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-indigo-400/35 blur-2xl" />
        <svg
          className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
          viewBox="0 0 420 160"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
        >
          <path d="M-10,115 C130,65 240,140 430,75 L430,160 L-10,160 Z" fill="white" fillOpacity="0.07" />
          <path d="M-10,135 C140,85 260,150 430,95 L430,160 L-10,160 Z" fill="white" fillOpacity="0.08" />
          <path d="M0,100 C140,55 250,125 430,65" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.25" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  // Default: "waves" (Architectural Wave)
  return (
    <div className={`relative ${heightClass} overflow-hidden bg-gradient-to-br from-[#f8f9fb] via-[#f1f3f6] to-[#e6eaee]`}>
      <svg
        className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
        viewBox="0 0 420 160"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="ribbonGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#f4f6f8" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#d8dde4" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="ribbonGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#e9edf2" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#cbd2dc" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="ribbonGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#e2e7ee" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#bcc5d2" stopOpacity="0.95" />
          </linearGradient>

          <linearGradient id="ribbonGrad4" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#cad1db" stopOpacity="0.6" />
          </linearGradient>

          <filter id="softRibbonShadow1" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-3" dy="5" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.09" />
          </filter>

          <filter id="softRibbonShadow2" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="-2" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.07" />
          </filter>
        </defs>

        <path
          d="M110 -30 C190 40, 260 85, 430 115 L450 -30 Z"
          fill="url(#ribbonGrad1)"
          filter="url(#softRibbonShadow1)"
        />

        <path
          d="M145 -30 C220 45, 290 85, 435 85 L450 -30 Z"
          fill="url(#ribbonGrad2)"
          filter="url(#softRibbonShadow2)"
        />

        <path
          d="M180 -30 C250 45, 320 80, 440 60 L450 -30 Z"
          fill="url(#ribbonGrad4)"
          opacity="0.85"
        />

        <path
          d="M75 -20 C175 45, 235 110, 410 170 L430 190 L-10 190 Z"
          fill="url(#ribbonGrad3)"
          filter="url(#softRibbonShadow1)"
        />

        <path
          d="M130 -15 C205 55, 255 115, 395 175"
          stroke="#ffffff"
          strokeWidth="1.6"
          strokeOpacity="0.85"
        />

        <path
          d="M160 -15 C230 55, 275 115, 415 175"
          stroke="#ffffff"
          strokeWidth="1.4"
          strokeOpacity="0.7"
        />

        <path
          d="M190 -15 C255 55, 295 115, 435 175"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeOpacity="0.55"
        />

        <path
          d="M220 -15 C280 50, 315 105, 445 165"
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity="0.4"
        />

        <path
          d="M250 -15 C305 45, 335 95, 455 155"
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.3"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/[0.03] via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

function ProfileBannerThemeModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Change Cover Background
            </h3>
            <p className="text-xs text-slate-500">
              Select one of the 4 professional themes saved in your local storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {PROFILE_BANNER_THEMES.map((themeOption) => {
            const isSelected = currentTheme === themeOption.id;
            return (
              <button
                key={themeOption.id}
                type="button"
                onClick={() => onSelectTheme(themeOption.id)}
                className={cn(
                  "group relative flex flex-col text-left rounded-2xl border p-2.5 transition-all cursor-pointer overflow-hidden",
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                )}
              >
                {/* Mini Preview */}
                <div className="relative h-16 w-full rounded-xl overflow-hidden border border-slate-200/60 shadow-inner">
                  <ProfileCoverBanner theme={themeOption.id} isThumbnail />
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow">
                      <Check size={11} strokeWidth={3} />
                    </div>
                  )}
                </div>

                <div className="mt-2.5 px-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {themeOption.name}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      {themeOption.tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                    {themeOption.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ProfilePhotoModal({
  isOpen,
  onClose,
  currentPhoto,
  initials,
  name,
  onUpload,
  onRemove,
  isBusy = false,
}) {
  const [activeTab, setActiveTab] = useState("file");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl("");
    }
  }, [selectedFile]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported by your browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Unable to access camera. Please allow camera permissions or upload a file.");
      stopCamera();
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setSelectedFile(file);
        stopCamera();
        setActiveTab("file");
      },
      "image/jpeg",
      0.92
    );
  };

  const validateAndSelectFile = (file) => {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      toast.error("Please select a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB.");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSelectFile(file);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSelectFile(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <Motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Update Profile Photo
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Personalize your employee profile
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            disabled={isBusy}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mt-4 flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              setActiveTab("file");
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "file"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Upload size={13} />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("camera");
              startCamera();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition cursor-pointer ${
              activeTab === "camera"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Camera size={13} />
            Take Selfie
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-4">
          {activeTab === "camera" ? (
            <div className="space-y-3">
              <div className="relative aspect-square w-full max-w-[270px] mx-auto overflow-hidden rounded-2xl bg-slate-900 shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-cover -scale-x-100"
                />
                {/* Circular Framing Overlay Guide */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-44 w-44 rounded-full border-2 border-dashed border-white/60 shadow-lg" />
                </div>
              </div>
              {cameraError && (
                <p className="text-center text-xs text-rose-500">{cameraError}</p>
              )}
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={!cameraActive}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                >
                  <Camera size={14} />
                  Capture Photo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setActiveTab("file");
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {selectedFile && previewUrl ? (
                /* Circular Preview */
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full border-4 border-white shadow-xl ring-2 ring-indigo-500/20">
                    <img
                      src={previewUrl}
                      alt="Avatar preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-800 max-w-[240px] truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(selectedFile.size / 1024).toFixed(0)} KB • Ready to save
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700 underline cursor-pointer"
                  >
                    Choose a different photo
                  </button>
                </div>
              ) : (
                /* Dropzone */
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-200 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/20"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm transition-transform duration-200 group-hover:scale-105">
                    <Upload size={22} />
                  </div>

                  <p className="mt-3 text-xs font-semibold text-slate-800">
                    Click to browse or drag & drop photo
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Supports JPG, PNG, or WebP up to 5MB
                  </p>
                </div>
              )}

              {/* Current photo display if present */}
              {currentPhoto && !selectedFile && (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={currentPhoto}
                      alt={name}
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-700">Current photo</p>
                      <p className="text-[10px] text-slate-400">Displayed on your profile</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 cursor-pointer transition disabled:opacity-50"
                  >
                    <Trash2 size={13} />
                    Remove
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            disabled={isBusy}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onUpload(selectedFile)}
            disabled={!selectedFile || isBusy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isBusy ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Saving photo...
              </>
            ) : (
              <>
                <Check size={14} />
                Save Photo
              </>
            )}
          </button>
        </div>
      </Motion.div>
    </div>
  );
}

function ProfileHeaderNav({ activeTab, setActiveTab }) {
  const tabsList = [
    { id: "personal", label: "Personal info" },
    { id: "education", label: "Education" },
    { id: "experiences", label: "Experience" },
    { id: "skills", label: "Skills" },
  ];

  return (
    <div className="space-y-4">
      {/* Top Bar with Title */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => toast("Profile navigation", { icon: "📋" })}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
          aria-label="Navigation menu"
        >
          <AlignLeft size={18} />
        </button>
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900">
          Employee Profile
        </h1>
      </div>

      {/* Horizontal Tabs Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 hide-scrollbar">
        {tabsList.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 rounded-full px-5 py-2 text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? "text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              {isActive && (
                <Motion.div
                  layoutId="activeProfileTabPill"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-0 rounded-full bg-[#0f172a] shadow-sm ring-1 ring-white/10"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EmployeeProfileSidebar({
  record,
  draft,
  setDraft,
  email,
  photoSrc,
  editing,
  onEditToggle,
  onSave,
  onCancel,
  saving = false,
  onPhotoUploadClick,
  photoBusy = false,
  user,
  userInfo,
  userPhase,
  completedFieldsCount = 0,
  totalFieldsCount = 8,
}) {
  const name =
    [draft?.first_name, draft?.last_name].filter(Boolean).join(" ") ||
    draft?.name ||
    record?.name ||
    record?.full_name ||
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "Not added";

  const designation =
    draft?.current_designation ||
    draft?.title ||
    record?.designation ||
    record?.current_designation ||
    user?.designation ||
    user?.title ||
    user?.role ||
    "Not added";

  const emailVal =
    draft?.email1 ||
    email ||
    record?.email1 ||
    user?.email ||
    user?.email1 ||
    user?.email_address ||
    "Not added";

  const phoneVal =
    draft?.phone_mobile ||
    record?.phone_mobile ||
    record?.phone ||
    record?.mobile ||
    user?.phone_mobile ||
    user?.phone ||
    user?.mobile ||
    "Not added";

  const countryVal =
    draft?.primary_address_country ||
    record?.primary_address_country ||
    user?.primary_address_country ||
    user?.country ||
    "Not added";

  const rawGender =
    draft?.gender ||
    record?.gender ||
    user?.gender ||
    "";
  const genderVal = rawGender
    ? rawGender.charAt(0).toUpperCase() + rawGender.slice(1)
    : "Not added";

  const rawDob = draft?.dob || record?.dob || user?.dob || "";
  const ageVal = rawDob ? calculateAge(rawDob) : "Not added";

  const rawStatus =
    record?.status ||
    userInfo?.status ||
    user?.status ||
    "";
  const statusVal = rawStatus || "Not added";

  const basicInfoItems = [
    {
      icon: Mail,
      label: "Email",
      value: emailVal,
      field: "email1",
      readOnly: true,
    },
    {
      icon: Smartphone,
      label: "Mobile phone",
      required: true,
      value: phoneVal,
      field: "phone_mobile",
      fallbackValue: phoneVal !== "Not added" ? phoneVal : "",
      placeholder: "+91 9876543210",
      type: "tel",
    },
    {
      icon: Globe,
      label: "Country",
      required: true,
      value: countryVal,
      field: "primary_address_country",
      fallbackValue: countryVal !== "Not added" ? countryVal : "",
      placeholder: "e.g. India",
    },
    {
      icon: KeyRound,
      label: "Gender",
      required: true,
      value: genderVal,
      field: "gender",
      isSelect: true,
    },
    {
      icon: Calendar,
      label: "Date of birth",
      required: true,
      value: rawDob || "Not added",
      field: "dob",
      isDate: true,
    },
    {
      icon: ShieldCheck,
      label: "Status",
      value: statusVal,
      isStatus: statusVal !== "Not added",
      readOnly: true,
    },
  ];

  const completionPercent = Math.min(
    100,
    Math.round((completedFieldsCount / totalFieldsCount) * 100),
  );

  const initials =
    [draft?.first_name || user?.first_name, draft?.last_name || user?.last_name]
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase() ||
    (user?.name ? user.name[0]?.toUpperCase() : "") ||
    "EP";

  const [bannerTheme, setBannerTheme] = useState(() => {
    try {
      return localStorage.getItem("hrcrm_profile_banner_theme") || "waves";
    } catch {
      return "waves";
    }
  });
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  const handleSelectBannerTheme = (themeId) => {
    setBannerTheme(themeId);
    try {
      localStorage.setItem("hrcrm_profile_banner_theme", themeId);
      toast.success("Cover background updated!");
    } catch {}
    setIsBannerModalOpen(false);
  };

  return (
    <aside className="w-full lg:w-[350px] shrink-0 space-y-5">
      <Motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
      >
        {/* Banner with selectable background theme */}
        <div className="relative">
          <ProfileCoverBanner theme={bannerTheme} />

          {/* Pencil button to change background cover */}
          <button
            type="button"
            onClick={() => setIsBannerModalOpen(true)}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-slate-900 hover:scale-105 active:scale-95 cursor-pointer ring-1 ring-slate-900/10 z-10"
            title="Change cover background"
            aria-label="Change cover background"
          >
            <Pencil size={13} />
          </button>
        </div>

        {/* Avatar overlapping the banner */}
        <div className="relative px-6">
          <div className="relative -mt-12 flex items-end justify-between">
            <div className="relative">
              {/* Avatar circle (non-clickable, photo/initials display only) */}
              <div
                className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md select-none"
              >
                {photoSrc ? (
                  <img
                    src={photoSrc}
                    alt={name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 to-slate-200 text-2xl font-bold text-slate-700">
                    {initials}
                  </div>
                )}

                {/* Loading indicator on avatar during upload */}
                {photoBusy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 text-white backdrop-blur-[2px]">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                )}
              </div>

              {/* Camera Badge at bottom-right - ONLY way to update profile photo */}
              <button
                type="button"
                onClick={onPhotoUploadClick}
                disabled={photoBusy}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-md ring-2 ring-white transition-all duration-200 hover:scale-110 hover:bg-indigo-600 active:scale-95 cursor-pointer"
                title="Update profile photo"
                aria-label="Update profile photo"
              >
                <Camera size={13} />
              </button>
            </div>
          </div>

          {/* Employee Name */}
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-2">
              {editing ? (
                <div className="flex w-full gap-2">
                  <input
                    type="text"
                    value={
                      draft?.first_name !== undefined
                        ? draft.first_name
                        : (user?.first_name || record?.first_name || "")
                    }
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
                      setDraft?.((prev) => ({ ...prev, first_name: val }));
                    }}
                    placeholder="First name"
                    className="w-1/2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <input
                    type="text"
                    value={
                      draft?.last_name !== undefined
                        ? draft.last_name
                        : (user?.last_name || record?.last_name || "")
                    }
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
                      setDraft?.((prev) => ({ ...prev, last_name: val }));
                    }}
                    placeholder="Last name"
                    className="w-1/2 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              ) : (
                <h2
                  className={cn(
                    "text-xl font-bold tracking-tight",
                    name !== "Not added" ? "text-slate-900" : "text-slate-400 font-normal"
                  )}
                >
                  {name}
                </h2>
              )}
            </div>

            {/* Designation Pill (Read-only) */}
            <div className="mt-1.5">
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-semibold",
                  designation !== "Not added"
                    ? "border border-sky-100/90 bg-sky-50 text-sky-600"
                    : "border border-slate-200 bg-slate-100 text-slate-400"
                )}
              >
                {designation}
              </span>
            </div>
          </div>

          {/* Basic Information Section */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">
                Basic Information
              </h3>
              <button
                type="button"
                onClick={onEditToggle}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer",
                  editing
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                )}
                title={editing ? "Cancel editing" : "Edit mobile, gender, DOB & details"}
                aria-label="Edit basic information"
              >
                <Pencil size={15} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 pb-2">
              {basicInfoItems.map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-100/90 bg-slate-50 text-slate-500 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                    <item.icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium leading-none text-slate-400">
                        {item.label}
                        {item.required && <span className="text-rose-500 font-bold ml-0.5">*</span>}
                      </p>
                      {item.readOnly && editing && (
                        <span className="text-[10px] text-slate-400 font-medium">Locked</span>
                      )}
                    </div>
                    {editing && !item.readOnly ? (
                      item.isSelect ? (
                        <select
                          value={
                            (draft?.gender !== undefined
                              ? draft.gender
                              : (rawGender || "")
                            ).toLowerCase()
                          }
                          onChange={(e) =>
                            setDraft?.((prev) => ({ ...prev, gender: e.target.value }))
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      ) : item.isDate ? (
                        <input
                          type="date"
                          value={draft?.dob !== undefined ? draft.dob : (rawDob || "")}
                          onChange={(e) =>
                            setDraft?.((prev) => ({ ...prev, dob: e.target.value }))
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      ) : (
                        <input
                          type={item.type || "text"}
                          value={
                            draft?.[item.field] !== undefined
                              ? draft[item.field]
                              : (item.fallbackValue || "")
                          }
                          onChange={(e) => {
                            let val = e.target.value;
                            if (item.field === "phone_mobile") {
                              val = val.replace(/\D/g, "").slice(0, 10);
                            }
                            setDraft?.((prev) => ({ ...prev, [item.field]: val }));
                          }}
                          maxLength={item.field === "phone_mobile" ? 10 : undefined}
                          inputMode={item.field === "phone_mobile" ? "numeric" : undefined}
                          pattern={item.field === "phone_mobile" ? "[0-9]*" : undefined}
                          placeholder={item.placeholder || item.label}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      )
                    ) : (
                      <p className="mt-1 truncate text-xs font-semibold text-slate-800 md:text-[13px]">
                        {item.isStatus ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                            {item.value}
                          </span>
                        ) : item.value === "Not added" ? (
                          <span className="text-slate-400 font-normal">Not added</span>
                        ) : (
                          item.value
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* In-sidebar Save & Cancel Bar */}
            <AnimatePresence>
              {editing && (
                <Motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end gap-2 pb-2"
                >
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onSave?.(e, "basic_info")}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={13} />
                        Save changes
                      </>
                    )}
                  </button>
                </Motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Profile Strength Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 p-5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-500">Profile completeness</span>
            <span className="text-indigo-600">{completionPercent}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
            <Motion.div
              initial={{ width: 0 }}
              animate={{ width: `${completionPercent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-sky-500"
            />
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
            Complete all profile sections for smooth onboarding & verification.
          </p>
        </div>
      </Motion.div>

      {/* Employee Actions (Workplace requests, resignation, etc.) */}
      {userPhase === "Employment" && (
        <Motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        >
          <EmployeeOptions />
        </Motion.div>
      )}

      {/* Profile Cover Selection Modal */}
      <ProfileBannerThemeModal
        isOpen={isBannerModalOpen}
        onClose={() => setIsBannerModalOpen(false)}
        currentTheme={bannerTheme}
        onSelectTheme={handleSelectBannerTheme}
      />
    </aside>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-800 transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-50/70";

function EmployeeProfileCards({
  activeTab,
  setActiveTab,
  draft,
  setDraft,
  record,
  email,
  editing,
  setEditing,
  onSave,
  onCancel,
  saving = false,
  related = {},
  setRelated,
  relatedCache,
  onPhotoUploaded,
  deletedRelatedIdsRef,
}) {
  const [activeEditCard, setActiveEditCard] = useState(null);
  const isEditing = editing || Boolean(activeEditCard);

  useEffect(() => {
    if (!editing) {
      setActiveEditCard(null);
    }
  }, [editing]);

  useEffect(() => {
    setActiveEditCard(null);
  }, [activeTab]);

  const effectiveScope = activeTab === "personal" ? (activeEditCard || "personal") : activeTab;

  const toggleCardEdit = (cardName) => {
    if (editing) {
      setEditing(false);
      setActiveEditCard(null);
    } else {
      setActiveEditCard((curr) => (curr === cardName ? null : cardName));
    }
  };

  const updateRelatedItem = (module, index, field, value) => {
    const currentEntry =
      relatedCache?.current?.[module] || related[module] || { items: [], original: [] };
    const items = [...(currentEntry.items || [])];
    items[index] = { ...items[index], [field]: value };
    if (relatedCache?.current) {
      relatedCache.current[module] = { ...currentEntry, items };
    }
    setRelated?.((prev) => ({
      ...prev,
      [module]: { ...currentEntry, items },
    }));
  };

  const addRelatedItem = (module, defaultValues) => {
    const currentEntry =
      relatedCache?.current?.[module] || related[module] || { items: [], original: [] };
    const items = [...(currentEntry.items || []), defaultValues];
    if (relatedCache?.current) {
      relatedCache.current[module] = { ...currentEntry, items };
    }
    setRelated?.((prev) => ({
      ...prev,
      [module]: { ...currentEntry, items },
    }));
    setEditing?.(true);
  };

  const removeRelatedItem = (module, index) => {
    const currentEntry =
      relatedCache?.current?.[module] || related[module] || { items: [], original: [] };
    const targetItem = (currentEntry.items || [])[index];
    if (targetItem?.id && deletedRelatedIdsRef?.current?.[module]) {
      deletedRelatedIdsRef.current[module].push(targetItem.id);
    }
    const items = (currentEntry.items || []).filter((_, i) => i !== index);
    if (relatedCache?.current) {
      relatedCache.current[module] = { ...currentEntry, items };
    }
    setRelated?.((prev) => ({
      ...prev,
      [module]: { ...currentEntry, items },
    }));
    setEditing?.(true);
  };

  const educationItems =
    relatedCache?.current?.education?.items ||
    related.education?.items ||
    draft?.resumeSections?.education ||
    [];
  const experienceItems =
    relatedCache?.current?.experiences?.items ||
    related.experiences?.items ||
    draft?.resumeSections?.experiences ||
    [];
  const skillItems =
    relatedCache?.current?.skills?.items ||
    related.skills?.items ||
    draft?.resumeSections?.skills ||
    [];

  const isEduLoading = Boolean(related?.education?.loading);
  const isExpLoading = Boolean(related?.experiences?.loading);
  const isSkillLoading = Boolean(related?.skills?.loading);

  return (
    <div className="min-w-0 flex-1 space-y-6">
      {/* Edit Mode Alert Banner */}
      <AnimatePresence>
        {isEditing && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 px-5 py-3 text-sm text-amber-900 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-800">
                <Pencil size={13} />
              </span>
              <span>
                You are editing profile information. Remember to save your changes.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveEditCard(null);
                  onCancel?.();
                }}
                disabled={saving}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => onSave?.(e, effectiveScope)}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Tab 1: Personal info */}
      {activeTab === "personal" && (
        <Motion.div
          key="tab-personal"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Card 1: Personal Information */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 shadow-sm">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">
                    Personal Information
                  </h3>
                  <p className="text-xs text-slate-400">
                    Primary employee identity and contact records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleCardEdit("personal")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                title="Edit personal information"
              >
                <Pencil size={15} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  First name <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "personal" || editing ? (
                  <input
                    type="text"
                    value={draft.first_name || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
                      setDraft((prev) => ({
                        ...prev,
                        first_name: val,
                      }));
                    }}
                    placeholder="First name"
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.first_name || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  Last name <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "personal" || editing ? (
                  <input
                    type="text"
                    value={draft.last_name || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\s'-]/g, "");
                      setDraft((prev) => ({
                        ...prev,
                        last_name: val,
                      }));
                    }}
                    placeholder="Last name"
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.last_name || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-500">Email</span>
                  {editing && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      Locked
                    </span>
                  )}
                </div>
                {activeEditCard === "personal" || editing ? (
                  <input
                    type="email"
                    readOnly
                    value={draft.email1 || email || ""}
                    className={`${inputClass} sm:max-w-xs bg-slate-100 text-slate-500 cursor-not-allowed`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.email1 || email || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  Mobile phone <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "personal" || editing ? (
                  <input
                    type="tel"
                    value={draft.phone_mobile || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setDraft((prev) => ({
                        ...prev,
                        phone_mobile: val,
                      }));
                    }}
                    maxLength={10}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="10-digit mobile number"
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.phone_mobile || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  Date of birth <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "personal" || editing ? (
                  <input
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={draft.dob || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        dob: e.target.value,
                      }))
                    }
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.dob || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  Gender <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "personal" || editing ? (
                  <select
                    value={(draft.gender || "").toLowerCase()}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        gender: e.target.value,
                      }))
                    }
                    className={`${inputClass} sm:max-w-xs`}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.gender
                      ? draft.gender.charAt(0).toUpperCase() + draft.gender.slice(1)
                      : "Not added"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Address */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 shadow-sm">
                  <Home size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">
                    Address
                  </h3>
                  <p className="text-xs text-slate-400">
                    Residential and permanent address records
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleCardEdit("address")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                title="Edit address"
              >
                <Pencil size={15} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  Street address <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "address" || editing ? (
                  <input
                    type="text"
                    value={draft.primary_address_street || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        primary_address_street: e.target.value,
                      }))
                    }
                    placeholder="Street address / House number"
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.primary_address_street || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  City <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "address" || editing ? (
                  <input
                    type="text"
                    value={draft.primary_address_city || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        primary_address_city: e.target.value,
                      }))
                    }
                    placeholder="City"
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.primary_address_city || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  State <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "address" || editing ? (
                  <input
                    type="text"
                    value={draft.primary_address_state || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        primary_address_state: e.target.value,
                      }))
                    }
                    placeholder="State / Region / Province"
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.primary_address_state || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  Postal code <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "address" || editing ? (
                  <input
                    type="text"
                    value={draft.primary_address_postalcode || ""}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                      setDraft((prev) => ({
                        ...prev,
                        primary_address_postalcode: val,
                      }));
                    }}
                    maxLength={10}
                    inputMode="numeric"
                    placeholder="Postal / ZIP code"
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.primary_address_postalcode || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">
                  Country <span className="text-rose-500 font-bold">*</span>
                </span>
                {activeEditCard === "address" || editing ? (
                  <input
                    type="text"
                    value={draft.primary_address_country || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        primary_address_country: e.target.value,
                      }))
                    }
                    placeholder="Country"
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.primary_address_country || "Not added"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Professional Information */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8">
            <div className="flex items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                  <Briefcase size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-slate-900">
                    Professional Information
                  </h3>
                  <p className="text-xs text-slate-400">
                    Title, designation, department and professional summary
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleCardEdit("professional")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                title="Edit professional details"
              >
                <Pencil size={15} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-500">Title</span>
                  {(activeEditCard === "professional" || editing) && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      Locked
                    </span>
                  )}
                </div>
                {activeEditCard === "professional" || editing ? (
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={draft.title || ""}
                    className={`${inputClass} sm:max-w-xs bg-slate-100 text-slate-500 cursor-not-allowed`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.title || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-500">Current designation</span>
                  {(activeEditCard === "professional" || editing) && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      Locked
                    </span>
                  )}
                </div>
                {activeEditCard === "professional" || editing ? (
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={draft.current_designation || ""}
                    className={`${inputClass} sm:max-w-xs bg-slate-100 text-slate-500 cursor-not-allowed`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.current_designation || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-500">Department</span>
                  {(activeEditCard === "professional" || editing) && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      Locked
                    </span>
                  )}
                </div>
                {activeEditCard === "professional" || editing ? (
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={draft.department || ""}
                    className={`${inputClass} sm:max-w-xs bg-slate-100 text-slate-500 cursor-not-allowed`}
                  />
                ) : (
                  <span className="font-semibold text-slate-900">
                    {draft.department || "Not added"}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">LinkedIn URL</span>
                {activeEditCard === "professional" || editing ? (
                  <input
                    type="url"
                    value={draft.linkedin_url || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        linkedin_url: e.target.value,
                      }))
                    }
                    placeholder="https://linkedin.com/in/..."
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : draft.linkedin_url ? (
                  <a
                    href={draft.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                  >
                    View profile
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="text-slate-400">Not added</span>
                )}
              </div>

              <div className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-slate-500">GitHub URL</span>
                {activeEditCard === "professional" || editing ? (
                  <input
                    type="url"
                    value={draft.github_url || ""}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        github_url: e.target.value,
                      }))
                    }
                    placeholder="https://github.com/..."
                    className={`${inputClass} sm:max-w-xs`}
                  />
                ) : draft.github_url ? (
                  <a
                    href={draft.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:underline"
                  >
                    View GitHub
                    <ExternalLink size={12} />
                  </a>
                ) : (
                  <span className="text-slate-400">Not added</span>
                )}
              </div>

              <div className="flex flex-col gap-2 py-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">
                    About you <span className="text-rose-500 font-bold">*</span>
                  </span>
                  {(activeEditCard === "professional" || editing) && (
                    <span
                      className={`text-xs font-semibold ${
                        (draft.description || "").trim().length >= 50
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    >
                      {(draft.description || "").trim().length} / 50 characters min
                    </span>
                  )}
                </div>
                {activeEditCard === "professional" || editing ? (
                  <>
                    <textarea
                      rows={4}
                      value={draft.description || ""}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Describe your professional background, key skills, and career interests (minimum 50 characters)..."
                      className={`${inputClass} ${
                        draft.description &&
                        draft.description.trim().length > 0 &&
                        draft.description.trim().length < 50
                          ? "border-amber-400 focus:border-amber-500 focus:ring-amber-200"
                          : ""
                      }`}
                    />
                    {(draft.description || "").trim().length < 50 && (
                      <p className="text-xs text-amber-600 font-medium">
                        Please write at least 50 characters describing your professional summary (
                        {Math.max(0, 50 - (draft.description || "").trim().length)} more needed).
                      </p>
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                    {draft.description || "Not added"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Motion.div>
      )}

      {/* Tab 2: Education */}
      {activeTab === "education" && (
        <Motion.div
          key="tab-education"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Header Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  Education
                </h3>
                <p className="text-xs text-slate-400">
                  Qualifications, universities and educational milestones
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                addRelatedItem("education", {
                  name: "",
                  qualification: "",
                  institution: "",
                  university: "",
                  specialization: "",
                  percentage: "",
                  from_time: "",
                  to_time: "",
                  description: "",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
            >
              <Plus size={15} />
              Add Education
            </button>
          </div>

          {/* Education Records */}
          {isEduLoading ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
              <Loader2 size={24} className="mx-auto animate-spin text-indigo-500" />
              <p className="mt-3 text-xs font-medium text-slate-500">Loading education records...</p>
            </div>
          ) : educationItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                <GraduationCap size={28} />
              </div>
              <h4 className="mt-4 text-sm font-bold text-slate-800">
                No education records added yet
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Add your degrees, universities, and academic certifications to complete this section.
              </p>
              <button
                type="button"
                onClick={() =>
                  addRelatedItem("education", {
                    name: "",
                    qualification: "",
                    institution: "",
                    university: "",
                    specialization: "",
                    percentage: "",
                    from_time: "",
                    to_time: "",
                    description: "",
                  })
                }
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
              >
                <Plus size={14} />
                Add Education
              </button>
            </div>
          ) : (
            educationItems.map((item, index) => (
              <div
                key={item.id || `edu-${index}`}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <GraduationCap size={18} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {item.qualification || item.name || `Education #${index + 1}`}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {item.institution || item.university || item.school || "Institution not specified"}
                      </p>
                    </div>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeRelatedItem("education", index)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      title="Remove record"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Degree / Qualification <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.qualification || ""}
                        onChange={(e) =>
                          updateRelatedItem("education", index, "qualification", e.target.value)
                        }
                        placeholder="e.g. Bachelor of Technology"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.qualification || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Institution / University <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.institution || item.university || ""}
                        onChange={(e) => {
                          updateRelatedItem("education", index, "institution", e.target.value);
                          updateRelatedItem("education", index, "university", e.target.value);
                        }}
                        placeholder="e.g. Stanford University"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.institution || item.university || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Field of Study / Specialization
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.specialization || ""}
                        onChange={(e) =>
                          updateRelatedItem("education", index, "specialization", e.target.value)
                        }
                        placeholder="e.g. Computer Science"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.specialization || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Percentage / Grade / GPA <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.percentage || ""}
                        onChange={(e) =>
                          updateRelatedItem("education", index, "percentage", e.target.value)
                        }
                        placeholder="e.g. 85% or 3.8 GPA"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.percentage || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Start Year / Date <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.from_time || ""}
                        onChange={(e) =>
                          updateRelatedItem("education", index, "from_time", e.target.value)
                        }
                        placeholder="e.g. 2018"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.from_time || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      End Year / Date <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.to_time || ""}
                        onChange={(e) =>
                          updateRelatedItem("education", index, "to_time", e.target.value)
                        }
                        placeholder="e.g. 2022"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.to_time || "Not added"}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Academic details & description
                    </label>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={item.description || ""}
                        onChange={(e) =>
                          updateRelatedItem("education", index, "description", e.target.value)
                        }
                        placeholder="Relevant coursework, honors, projects..."
                        className={inputClass}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-slate-700 leading-relaxed">
                        {item.description || "Not added"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </Motion.div>
      )}

      {/* Tab 3: Experience */}
      {activeTab === "experiences" && (
        <Motion.div
          key="tab-experience"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Header Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
                <BriefcaseBusiness size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  Experience
                </h3>
                <p className="text-xs text-slate-400">
                  Employment history, organizational roles and career journey
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                addRelatedItem("experiences", {
                  name: "",
                  company_name: "",
                  company_location: "",
                  designation: "",
                  joining_date: "",
                  leaving_date: "",
                  description: "",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
            >
              <Plus size={15} />
              Add Experience
            </button>
          </div>

          {/* Experience Records */}
          {isExpLoading ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
              <Loader2 size={24} className="mx-auto animate-spin text-blue-500" />
              <p className="mt-3 text-xs font-medium text-slate-500">Loading work experience...</p>
            </div>
          ) : experienceItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
                <BriefcaseBusiness size={28} />
              </div>
              <h4 className="mt-4 text-sm font-bold text-slate-800">
                No work experience added yet
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Add your current or past job roles, employers, and responsibilities.
              </p>
              <button
                type="button"
                onClick={() =>
                  addRelatedItem("experiences", {
                    name: "",
                    company_name: "",
                    company_location: "",
                    designation: "",
                    joining_date: "",
                    leaving_date: "",
                    description: "",
                  })
                }
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
              >
                <Plus size={14} />
                Add Experience
              </button>
            </div>
          ) : (
            experienceItems.map((item, index) => (
              <div
                key={item.id || `exp-${index}`}
                className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BriefcaseBusiness size={18} />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        {item.name || item.designation || item.position || `Experience #${index + 1}`}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {item.company_name || item.company || "Company not specified"}
                      </p>
                    </div>
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeRelatedItem("experiences", index)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      title="Remove record"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Role / Job Title <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.name || item.designation || item.position || ""}
                        onChange={(e) => {
                          updateRelatedItem("experiences", index, "name", e.target.value);
                          updateRelatedItem("experiences", index, "designation", e.target.value);
                        }}
                        placeholder="e.g. Senior Software Engineer"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.name || item.designation || item.position || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Company <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.company_name || item.company || ""}
                        onChange={(e) => {
                          updateRelatedItem("experiences", index, "company_name", e.target.value);
                          updateRelatedItem("experiences", index, "company", e.target.value);
                        }}
                        placeholder="e.g. Google"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.company_name || item.company || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Location <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={item.company_location || ""}
                        onChange={(e) =>
                          updateRelatedItem("experiences", index, "company_location", e.target.value)
                        }
                        placeholder="e.g. New York, USA"
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.company_location || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Start Date <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={item.joining_date || ""}
                        onChange={(e) =>
                          updateRelatedItem("experiences", index, "joining_date", e.target.value)
                        }
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.joining_date || "Not added"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      End Date <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={item.leaving_date || ""}
                        onChange={(e) =>
                          updateRelatedItem("experiences", index, "leaving_date", e.target.value)
                        }
                        className={inputClass}
                      />
                    ) : (
                      <p className="font-semibold text-slate-900">
                        {item.leaving_date || "Present"}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Responsibilities and achievements
                    </label>
                    {isEditing ? (
                      <textarea
                        rows={3}
                        value={item.description || item.responsibilities || ""}
                        onChange={(e) => {
                          updateRelatedItem("experiences", index, "description", e.target.value);
                          updateRelatedItem("experiences", index, "responsibilities", e.target.value);
                        }}
                        placeholder="Key accomplishments and daily responsibilities..."
                        className={inputClass}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap break-words text-slate-700 leading-relaxed">
                        {item.description || item.responsibilities || "Not added"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </Motion.div>
      )}

      {/* Tab 4: Skills */}
      {activeTab === "skills" && (
        <Motion.div
          key="tab-skills"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Header Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  Skills
                </h3>
                <p className="text-xs text-slate-400">
                  Technical proficiencies, technologies and core competencies
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                addRelatedItem("skills", {
                  name: "",
                  skill_name: "",
                  version: "",
                  total_years_total_months: "",
                  description: "",
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 cursor-pointer"
            >
              <Plus size={15} />
              Add Skill
            </button>
          </div>

          {/* Skill Records */}
          {isSkillLoading ? (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
              <Loader2 size={24} className="mx-auto animate-spin text-indigo-500" />
              <p className="mt-3 text-xs font-medium text-slate-500">Loading skills...</p>
            </div>
          ) : skillItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <Sparkles size={28} />
              </div>
              <h4 className="mt-4 text-sm font-bold text-slate-800">
                No skills added yet
              </h4>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Highlight your technical strengths, programming languages, and domain tools.
              </p>
              <button
                type="button"
                onClick={() =>
                  addRelatedItem("skills", {
                    name: "",
                    skill_name: "",
                    version: "",
                    total_years_total_months: "",
                    description: "",
                  })
                }
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 cursor-pointer"
              >
                <Plus size={14} />
                Add Skill
              </button>
            </div>
          ) : isEditing ? (
            <div className="space-y-4">
              {skillItems.map((item, index) => (
                <div
                  key={item.id || `skill-${index}`}
                  className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Skill #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeRelatedItem("skills", index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-rose-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      title="Remove skill"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Skill name <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.skill_name || item.name || ""}
                        onChange={(e) => {
                          updateRelatedItem("skills", index, "skill_name", e.target.value);
                          updateRelatedItem("skills", index, "name", e.target.value);
                        }}
                        placeholder="e.g. React.js, Python"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Experience duration <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.total_years_total_months || ""}
                        onChange={(e) =>
                          updateRelatedItem("skills", index, "total_years_total_months", e.target.value)
                        }
                        placeholder="e.g. 3 years"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Version / Details
                      </label>
                      <input
                        type="text"
                        value={item.version || ""}
                        onChange={(e) =>
                          updateRelatedItem("skills", index, "version", e.target.value)
                        }
                        placeholder="e.g. v18"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] md:p-8">
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {skillItems.map((item, index) => {
                  const skillTitle = item.skill_name || item.name || `Skill #${index + 1}`;
                  return (
                    <div
                      key={item.id || `skill-view-${index}`}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 transition-all hover:bg-slate-50 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">
                            {skillTitle}
                          </p>
                          {item.version && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              Version: {item.version}
                            </span>
                          )}
                        </div>
                        {item.total_years_total_months && (
                          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                            {item.total_years_total_months}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Motion.div>
      )}
    </div>
  );
}
