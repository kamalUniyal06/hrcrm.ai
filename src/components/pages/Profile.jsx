import { useCallback, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useSelector } from "react-redux";
import { useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { apiRequest, fetchGpc } from "../../services/api";
import { CREATE_DEAL_API_KEY, FETCH_GPC_X_API_KEY } from "../../store/constants";
import { PageContext } from "../../context/pageContext";
import { AlertTriangle, Info, Loader2 } from "lucide-react";
import {
  ONBOARDING_STEP,
  fetchOnboardingProgress,
  getOnboardingRecordName,
  upsertOnboardingProgress,
} from "../../utils/onboardingCompletion";
import AiGenerateModal from "./profile/AiGenerateModal";
import FirstSyncRecordsTable from "./profile/FirstSyncRecordsTable";
import FirstSyncStepSection from "./profile/FirstSyncStepSection";
import ProfileOnboardingSkeleton from "./profile/ProfileOnboardingSkeleton";
import ProfileSummary from "./profile/ProfileSummary";
import { SetupCompleteBanner, SetupSteps } from "./profile/SetupStatus";
import TemplateEditorModal from "./profile/TemplateEditorModal";
import TemplatePreviewModal from "./profile/TemplatePreviewModal";
import TemplateStepSection from "./profile/TemplateStepSection";
import WebsiteStepSection from "./profile/WebsiteStepSection";
import {
  ALLOWED_SITES_MODULE,
  broadcastSyncState,
  createEmptyWebsiteForm,
  decodeHtmlEntities,
  getTemplateHtml,
  getTemplateKey,
  isOnboardingTemplate,
  normalizeTemplateRows,
} from "./profile/profileUtils";
import { queryClient } from "../../lib/queryClient";
import { useCrmUsers } from "../../queries/users.queries";

const Profile = () => {
  const { handleDateClick } = useContext(PageContext);
  const { data } = useCrmUsers()
  const navigate = useNavigate();
  const location = useLocation();
  const { user, businessEmail, currentScore, crmEndpoint } = useSelector(
    (state) => state.user,
  );
  const TINY_EDITOR_API_KEY = queryClient.getQueryData(['tiny-key'])
  const [websites, setWebsites] = useState([]);
  const [websitesLoading, setWebsitesLoading] = useState(false);
  const [websiteSaving, setWebsiteSaving] = useState(false);
  const [websiteForms, setWebsiteForms] = useState([createEmptyWebsiteForm()]);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [savedTemplateIds, setSavedTemplateIds] = useState(() => new Set());
  const [skippedTemplateIds, setSkippedTemplateIds] = useState(() => new Set());
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [templateName, setTemplateName] = useState("");
  const [templateStage, setTemplateStage] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [templatePreview, setTemplatePreview] = useState(null);
  const [stages, setStages] = useState({});
  const [motiveList, setMotiveList] = useState([]);
  const [motiveListLoading, setMotiveListLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiMotive, setAiMotive] = useState("");
  const [aiDetails, setAiDetails] = useState("");
  const [aiName, setAiName] = useState("");
  const [aiStage, setAiStage] = useState("");
  const [aiIncludeHtml, setAiIncludeHtml] = useState(true);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [profileDeleting, setProfileDeleting] = useState(false);
  const [syncLimit, setSyncLimit] = useState(10);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [firstSyncRecordsSeen, setFirstSyncRecordsSeen] = useState(false);
  const [crmOnboardingStep, setCrmOnboardingStep] = useState(0);
  const [crmProgressLoading, setCrmProgressLoading] = useState(true);
  const celebratedCompleteRef = useRef(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDisclaimerAccepted, setDeleteDisclaimerAccepted] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const profileEmail = businessEmail || user.email;
  const onboardingRecordName = getOnboardingRecordName({
    user,
    businessEmail: profileEmail,
  });
  const step3Done = crmOnboardingStep >= ONBOARDING_STEP.WEBSITE_ADDED;
  const templateDone = crmOnboardingStep >= ONBOARDING_STEP.TEMPLATE_READY;
  const syncDone = crmOnboardingStep >= ONBOARDING_STEP.FIRST_SYNC_DONE;
  const onboardingLoading = crmProgressLoading;
  const completion = syncDone ? 100 : templateDone ? 85 : step3Done ? 70 : 50;
  const syncRecords = Array.isArray(syncResult?.records)
    ? syncResult.records
    : [];
  const forceShowFirstSyncRecords = new URLSearchParams(location.search).get(
    "showFirstSync",
  ) === "1";
  const showFirstSyncRecords =
    syncDone &&
    syncResult &&
    (!firstSyncRecordsSeen || forceShowFirstSyncRecords);
  const handledTemplateCount = templates.filter((template) => {
    const key = getTemplateKey(template);
    return savedTemplateIds.has(key) || skippedTemplateIds.has(key);
  }).length;

  useEffect(() => {
    celebratedCompleteRef.current =
      crmOnboardingStep >= ONBOARDING_STEP.FIRST_SYNC_DONE;
  }, [crmOnboardingStep]);

  const loadWebsites = useCallback(async () => {
    if (!crmEndpoint) return [];

    setWebsitesLoading(true);
    try {
      const data = await apiRequest({
        endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
        method: "POST",
        params: { action_type: "get_data" },
        body: {
          module: ALLOWED_SITES_MODULE,
        },
        headers: {
          "x-api-key": CREATE_DEAL_API_KEY,
          "Content-Type": "application/json",
        },
      });
      if (data?.success === false) {
        throw new Error(data.message || "Unable to fetch websites");
      }
      const nextWebsites = Array.isArray(data) ? data : data?.data ?? [];
      setWebsites(nextWebsites);
      return nextWebsites;
    } catch (error) {
      toast.error(error?.message || "Unable to fetch websites");
      return [];
    } finally {
      setWebsitesLoading(false);
    }
  }, [crmEndpoint]);

  useEffect(() => {
    loadWebsites();
  }, [loadWebsites]);

  const loadTemplates = useCallback(async () => {
    if (!crmEndpoint) return [];

    setTemplatesLoading(true);
    try {
      const data = await fetchGpc({
        method: "GET",
        params: { type: "templates" },
      });
      const rows = normalizeTemplateRows(data);
      const onboardingTemplates = rows.filter(isOnboardingTemplate);
      setTemplates(onboardingTemplates);
      return onboardingTemplates;
    } catch (error) {
      toast.error(error?.message || "Unable to fetch onboarding templates");
      return [];
    } finally {
      setTemplatesLoading(false);
    }
  }, [crmEndpoint]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const result = await fetchGpc({
          method: "POST",
          params: { type: "templates" },
          body: { stages: 1 },
        });
        if (result && typeof result === "object" && !Array.isArray(result)) {
          setStages(result);
        }
      } catch (error) {
        console.error("Failed to fetch template stages:", error);
      }
    };

    fetchStages();
  }, []);

  useEffect(() => {
    const fetchMotives = async () => {
      setMotiveListLoading(true);
      try {
        const result = await fetchGpc({
          params: { type: "motive_list" },
        });
        setMotiveList(Array.isArray(result) ? result : []);
      } catch (error) {
        console.error("Failed to fetch motive list:", error);
        setMotiveList([]);
      } finally {
        setMotiveListLoading(false);
      }
    };

    fetchMotives();
  }, []);

  useEffect(() => {
    if (!crmEndpoint || !onboardingRecordName) {
      setCrmProgressLoading(false);
      return;
    }

    let ignore = false;

    const loadCrmOnboardingProgress = async () => {
      setCrmProgressLoading(true);
      try {
        const current = await fetchOnboardingProgress({
          crmEndpoint,
          name: onboardingRecordName,
        });
        const progress = current;
        if (ignore) return;

        setCrmOnboardingStep(progress.step);
        if (progress.step >= ONBOARDING_STEP.WEBSITE_ADDED) {
          broadcastSyncState({
            websiteDone: true,
            onboardingStep: progress.step,
          });
        }
        if (progress.step >= ONBOARDING_STEP.FIRST_SYNC_DONE) {
          setSyncing(false);
          setFirstSyncRecordsSeen(true);
          celebratedCompleteRef.current = true;
          broadcastSyncState({
            onboardingStep: progress.step,
          });
        }
      } catch (error) {
        console.error("Failed to load CRM onboarding progress:", error);
      } finally {
        if (!ignore) setCrmProgressLoading(false);
      }
    };

    loadCrmOnboardingProgress();

    return () => {
      ignore = true;
    };
  }, [crmEndpoint, onboardingRecordName]);

  const celebrate = (options = {}) => {
    confetti({
      particleCount: options.particleCount ?? 80,
      spread: options.spread ?? 65,
      origin: options.origin ?? { y: 0.25 },
      colors: ["#10b981", "#6366f1", "#06b6d4", "#f59e0b"],
    });
  };

  const completeWebsiteStep = async () => {
    await upsertOnboardingProgress({
      crmEndpoint,
      name: onboardingRecordName,
      step: ONBOARDING_STEP.WEBSITE_ADDED,
    });
    setCrmOnboardingStep((step) =>
      Math.max(step, ONBOARDING_STEP.WEBSITE_ADDED),
    );
    broadcastSyncState({
      websiteDone: true,
      onboardingStep: ONBOARDING_STEP.WEBSITE_ADDED,
    });
  };

  const completeTemplateStep = async () => {
    await upsertOnboardingProgress({
      crmEndpoint,
      name: onboardingRecordName,
      step: ONBOARDING_STEP.TEMPLATE_READY,
    });
    setCrmOnboardingStep((step) =>
      Math.max(step, ONBOARDING_STEP.TEMPLATE_READY),
    );
    broadcastSyncState({
      onboardingStep: ONBOARDING_STEP.TEMPLATE_READY,
    });
  };

  const maybeCompleteTemplateStep = async (nextSavedIds, nextSkippedIds) => {
    const allTemplatesHandled =
      templates.length > 0 &&
      templates.every((template) => {
        const key = getTemplateKey(template);
        return nextSavedIds.has(key) || nextSkippedIds.has(key);
      });

    if (!allTemplatesHandled) return false;

    await completeTemplateStep();
    return true;
  };

  const saveWebsitePayload = async (payload) => {
    const data = await apiRequest({
      endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
      method: "POST",
      params: { action_type: "post_data" },
      body: {
        parent_bean: payload,
      },
      headers: {
        "x-api-key": CREATE_DEAL_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (data?.success === false) {
      throw new Error(data.message || "Website save failed");
    }

    return data;
  };

  const updateWebsiteField = (index, field, value) => {
    setWebsiteForms((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addWebsiteRow = () => {
    setWebsiteForms((prev) => [...prev, createEmptyWebsiteForm()]);
  };

  const removeWebsiteRow = (index) => {
    setWebsiteForms((prev) =>
      prev.length === 1
        ? [createEmptyWebsiteForm()]
        : prev.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleWebsiteSave = async (event) => {
    event.preventDefault();

    const validForms = websiteForms
      .map((item) => ({
        name: item.name.trim(),
        minimum_price: item.minimum_price,
        amount: item.amount,
      }))
      .filter(
        (item) =>
          item.name || item.minimum_price !== "" || item.amount !== "",
      );

    if (validForms.length === 0) {
      toast.error("At least one website is required");
      return;
    }

    for (const [index, item] of validForms.entries()) {
      if (!item.name) {
        toast.error(`Website name is required in row ${index + 1}`);
        return;
      }

      const minPrice = Number(item.minimum_price);
      const maxPrice = Number(item.amount);
      if (
        item.minimum_price !== "" &&
        item.amount !== "" &&
        !Number.isNaN(minPrice) &&
        !Number.isNaN(maxPrice) &&
        minPrice > maxPrice
      ) {
        toast.error(
          `Minimum price cannot be greater than maximum price in row ${index + 1}`,
        );
        return;
      }
    }

    if (!crmEndpoint) {
      toast.error("CRM endpoint missing");
      return;
    }

    setWebsiteSaving(true);
    try {
      const createdWebsites = [];

      for (const item of validForms) {
        const payload = {
          module: ALLOWED_SITES_MODULE,
          name: item.name,
          minimum_price: item.minimum_price,
          amount: item.amount,
          description: item.name,
        };
        const data = await saveWebsitePayload(payload);
        createdWebsites.push(data?.data || data?.website || payload);
      }

      setWebsites((prev) => [...createdWebsites, ...prev]);
      await completeWebsiteStep();
      setWebsiteForms([createEmptyWebsiteForm()]);
      toast.success(
        createdWebsites.length === 1
          ? "Website saved successfully"
          : `${createdWebsites.length} websites saved successfully`,
      );
    } catch (error) {
      toast.error(error?.message || "Website save failed");
    } finally {
      setWebsiteSaving(false);
    }
  };

  const handleWebsiteImportSuccess = async () => {
    await loadWebsites();
    await completeWebsiteStep();
  };

  const openTemplateEditor = (template) => {
    setActiveTemplate(template);
    setTemplateName(template?.name || "");
    setTemplateStage(template?.stage || template?.stage_type || "others");
    setTemplateDescription(template?.description || "");
    setTemplateContent(getTemplateHtml(template) || "<p>Start writing here...</p>");
  };

  const closeTemplateEditor = () => {
    if (templateSaving || aiGenerating) return;
    setActiveTemplate(null);
    setShowAiModal(false);
  };

  const openAiTemplateModal = () => {
    setAiName(templateName || activeTemplate?.name || "");
    setAiStage(
      templateStage ||
      activeTemplate?.stage ||
      activeTemplate?.stage_type ||
      Object.keys(stages)[0] ||
      "others",
    );
    setAiMotive("");
    setAiDetails(templateDescription || activeTemplate?.description || "");
    setAiIncludeHtml(true);
    setShowAiModal(true);
  };

  const handleGenerateTemplate = async () => {
    if (!crmEndpoint) {
      toast.error("CRM endpoint missing");
      return;
    }

    setAiGenerating(true);
    try {
      const formData = new FormData();
      formData.append("motive", aiMotive);
      formData.append("details", aiDetails);
      formData.append("current_name", aiName);
      formData.append("stage", aiStage);

      if (aiIncludeHtml && templateContent) {
        formData.append("html", decodeHtmlEntities(templateContent));
      }

      const response = await fetch(
        `${crmEndpoint.split("?")[0]}?entryPoint=fetch_gpc&type=generate_template`,
        {
          method: "POST",
          headers: {
            "X-Api-Key": FETCH_GPC_X_API_KEY,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response?.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (!result?.success || !result?.data?.html) {
        throw new Error(result?.message || result?.error || "Generation failed");
      }

      setTemplateContent(result.data.html);
      if (aiName) setTemplateName(aiName);
      if (aiStage) setTemplateStage(aiStage);
      if (aiDetails) setTemplateDescription(aiDetails);
      setShowAiModal(false);
      toast.success("Template generated successfully");
    } catch (error) {
      toast.error(error?.message || "Template generation failed");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleTemplateSave = async () => {
    if (!activeTemplate) return;
    if (!templateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!templateContent.trim()) {
      toast.error("Template content is required");
      return;
    }
    if (!crmEndpoint) {
      toast.error("CRM endpoint missing");
      return;
    }

    setTemplateSaving(true);
    try {
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const payload = {
        module: "EmailTemplates",
        name: templateName.trim(),
        description: templateDescription || "",
        body_html: templateContent,
        subject: activeTemplate.subject || "",
        type: activeTemplate.type || "",
        stage: templateStage || activeTemplate.stage || activeTemplate.stage_type || "",
        assigned_user_id: activeTemplate.assigned_user_id || "",
        published: activeTemplate.published || "off",
        text_only: activeTemplate.text_only || "0",
        onboarding: "1",
        date_entered: activeTemplate.date_entered || now,
        date_modified: now,
      };

      if (activeTemplate.id) {
        payload.id = activeTemplate.id;
      }

      const data = await apiRequest({
        method: "POST",
        endpoint: `${crmEndpoint.split("?")[0]}?entryPoint=get_post_all`,
        params: { action_type: "post_data" },
        body: {
          parent_bean: payload,
        },
        headers: {
          "x-api-key": CREATE_DEAL_API_KEY,
          "Content-Type": "application/json",
        },
      });

      if (data?.success === false) {
        throw new Error(data.message || data.error || "Template save failed");
      }

      const savedId = data.parent_id || data.id || activeTemplate.id;
      const activeKey = getTemplateKey(activeTemplate);
      const nextSavedIds = new Set([
        ...savedTemplateIds,
        activeKey,
        ...(savedId ? [String(savedId)] : []),
      ]);
      const nextSkippedIds = new Set(skippedTemplateIds);
      nextSkippedIds.delete(activeKey);
      if (savedId) nextSkippedIds.delete(String(savedId));
      setSavedTemplateIds(nextSavedIds);
      setSkippedTemplateIds(nextSkippedIds);
      setTemplates((prev) =>
        prev.map((item) =>
          item.id === activeTemplate.id
            ? { ...item, ...payload, id: savedId || item.id }
            : item,
        ),
      );
      const completed = await maybeCompleteTemplateStep(
        nextSavedIds,
        nextSkippedIds,
      );
      setActiveTemplate(null);
      toast.success(
        completed
          ? "All templates handled. First sync is now unlocked."
          : "Template saved. Save or skip the remaining templates to continue.",
      );
    } catch (error) {
      toast.error(error?.message || "Template save failed");
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleSkipTemplate = async (template) => {
    if (templateDone) return;
    const key = getTemplateKey(template);
    const nextSkippedIds = new Set([...skippedTemplateIds, key]);
    const nextSavedIds = new Set(savedTemplateIds);
    nextSavedIds.delete(key);
    setSkippedTemplateIds(nextSkippedIds);
    setSavedTemplateIds(nextSavedIds);

    try {
      const completed = await maybeCompleteTemplateStep(
        nextSavedIds,
        nextSkippedIds,
      );
      toast.info(
        completed
          ? "All templates handled. First sync is now unlocked."
          : "Template skipped. Save or skip the remaining templates to continue.",
      );
    } catch (error) {
      toast.error(error?.message || "Unable to update template step");
    }
  };

  const handleSkipRemainingTemplates = async () => {
    if (templateDone) return;
    const nextSavedIds = new Set(savedTemplateIds);
    const nextSkippedIds = new Set(skippedTemplateIds);

    templates.forEach((template) => {
      const key = getTemplateKey(template);
      if (!nextSavedIds.has(key)) nextSkippedIds.add(key);
    });

    setSavedTemplateIds(nextSavedIds);
    setSkippedTemplateIds(nextSkippedIds);

    try {
      const completed = await maybeCompleteTemplateStep(
        nextSavedIds,
        nextSkippedIds,
      );
      toast.info(
        completed
          ? "Remaining templates skipped. First sync is now unlocked."
          : "No templates were available to skip.",
      );
    } catch (error) {
      toast.error(error?.message || "Unable to update template step");
    }
  };

  const handleFirstSync = async () => {
    if (!profileEmail) {
      toast.error("Business email is required before running the first sync");
      return;
    }
    if (!templateDone) {
      toast.error("Please save or skip every onboarding template first");
      return;
    }

    const limit = Math.min(Math.max(Number(syncLimit) || 1, 1), 100);
    setSyncLimit(limit);
    setSyncing(true);
    setSyncResult(null);
    broadcastSyncState({ status: "loading", limit });

    try {
      const data = await fetchGpc({
        method: "GET",
        params: {
          type: "first_sync",
          limit,
        },
      });

      const rawRecords =
        data?.data?.records ??
        data?.data?.data ??
        data?.records ??
        data?.data ??
        [];
      const records = Array.isArray(rawRecords) ? rawRecords : [];
      const count = data?.data?.count ?? data?.count ?? records.length ?? 0;
      const result = {
        count,
        records,
        message: data?.message || `First sync completed for ${count} records.`,
      };
      await upsertOnboardingProgress({
        crmEndpoint,
        name: onboardingRecordName,
        step: ONBOARDING_STEP.FIRST_SYNC_DONE,
      });
      setCrmOnboardingStep((step) =>
        Math.max(step, ONBOARDING_STEP.FIRST_SYNC_DONE),
      );
      setSyncResult(result);
      setFirstSyncRecordsSeen(false);
      broadcastSyncState({
        status: "completed",
        result,
        onboardingStep: ONBOARDING_STEP.FIRST_SYNC_DONE,
      });
      if (!celebratedCompleteRef.current) {
        celebratedCompleteRef.current = true;
        celebrate({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.35 },
        });
      }
      toast.success("All set! Your profile setup is complete");
    } catch (error) {
      broadcastSyncState({ status: "idle" });
      toast.error(error?.message || "First sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleRecordClick = (record) => {
    if (!record?.email) {
      toast.error("Email missing for this synced record");
      return;
    }
    localStorage.setItem("firstSyncThreadId", record.thread_id || "");
    localStorage.setItem("firstSyncMessageId", record.message_id || "");
    handleDateClick({ email: record.email, navigate: "/" });
  };

  const openDeleteModal = () => {
    setDeleteDisclaimerAccepted(false);
    setDeleteReason("");
    setOtherReason("");
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (profileDeleting) return;
    setShowDeleteModal(false);
    setDeleteDisclaimerAccepted(false);
    setDeleteReason("");
    setOtherReason("");
  };

  const handleDeleteProfile = async (reason) => {
    if (!profileEmail) {
      toast.error("Business email is required to delete profile");
      return;
    }

    setProfileDeleting(true);
    try {
      const response = await fetch(
        `https://crm.outrightsystems.org/index.php?entryPoint=trynow&email=${encodeURIComponent(
          profileEmail,
        )}&delete=1&reason=${encodeURIComponent(reason)}`,
      );

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!response.ok || data?.success === false) {
        throw new Error(
          data?.message ||
          data?.error ||
          text ||
          `Delete failed with status ${response?.status}`,
        );
      }

      sessionStorage.removeItem("onboardingShown");
      toast.success(data?.message || "Profile delete request completed");
      window.setTimeout(() => {
        setShowDeleteModal(false);
        window.location.reload();
      }, 800);
    } catch (error) {
      toast.error(error?.message || "Unable to delete profile");
    } finally {
      setProfileDeleting(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <ProfileSummary
        user={user}
        profileEmail={profileEmail}
        currentScore={currentScore}
        websitesCount={websites.length}
        websitesLoading={websitesLoading}
        onboardingLoading={onboardingLoading}
        completion={completion}
        syncDone={syncDone}
        profileDeleting={profileDeleting}
        onDeleteProfile={openDeleteModal}
      />

      {onboardingLoading && <ProfileOnboardingSkeleton />}

      {!onboardingLoading && !syncDone && (
        <SetupSteps step3Done={step3Done} templateDone={templateDone} />
      )}

      {!onboardingLoading && syncDone && <SetupCompleteBanner />}

      {!onboardingLoading && showFirstSyncRecords && (
        <FirstSyncRecordsTable
          records={syncRecords}
          result={syncResult}
          onRecordClick={handleRecordClick}
          onShowActivity={() => navigate("/RecentEntry")}
        />
      )}

      {!onboardingLoading && !step3Done && !syncDone && (
        <WebsiteStepSection
          websiteForms={websiteForms}
          websiteSaving={websiteSaving}
          onWebsiteSave={handleWebsiteSave}
          onWebsiteImportSuccess={handleWebsiteImportSuccess}
          onUpdateWebsiteField={updateWebsiteField}
          onAddWebsiteRow={addWebsiteRow}
          onRemoveWebsiteRow={removeWebsiteRow}
        />
      )}

      {!onboardingLoading && !syncDone && step3Done && !templateDone && (
        <TemplateStepSection
          templates={templates}
          templatesLoading={templatesLoading}
          savedTemplateIds={savedTemplateIds}
          skippedTemplateIds={skippedTemplateIds}
          handledTemplateCount={handledTemplateCount}
          onPreviewTemplate={setTemplatePreview}
          onOpenTemplateEditor={openTemplateEditor}
          onSkipTemplate={handleSkipTemplate}
          onSkipRemainingTemplates={handleSkipRemainingTemplates}
        />
      )}

      {!onboardingLoading && !syncDone && step3Done && templateDone && (
        <FirstSyncStepSection
          syncLimit={syncLimit}
          setSyncLimit={setSyncLimit}
          syncing={syncing}
          syncResult={syncResult}
          onFirstSync={handleFirstSync}
        />
      )}

      {templatePreview && (
        <TemplatePreviewModal
          template={templatePreview}
          onClose={() => setTemplatePreview(null)}
          onEdit={() => {
            openTemplateEditor(templatePreview);
            setTemplatePreview(null);
          }}
        />
      )}

      {activeTemplate && (
        <TemplateEditorModal
          tinyKey={TINY_EDITOR_API_KEY}
          name={templateName}
          setName={setTemplateName}
          stage={templateStage}
          setStage={setTemplateStage}
          description={templateDescription}
          setDescription={setTemplateDescription}
          content={templateContent}
          setContent={setTemplateContent}
          saving={templateSaving}
          generating={aiGenerating}
          onGenerateWithAi={openAiTemplateModal}
          onClose={closeTemplateEditor}
          onSave={handleTemplateSave}
        />
      )}

      <AiGenerateModal
        isOpen={showAiModal}
        onClose={() => !aiGenerating && setShowAiModal(false)}
        aiName={aiName}
        setAiName={setAiName}
        aiStage={aiStage}
        setAiStage={setAiStage}
        aiMotive={aiMotive}
        setAiMotive={setAiMotive}
        aiDetails={aiDetails}
        setAiDetails={setAiDetails}
        aiIncludeHtml={aiIncludeHtml}
        setAiIncludeHtml={setAiIncludeHtml}
        stages={stages}
        motiveList={motiveList}
        motiveListLoading={motiveListLoading}
        onGenerate={handleGenerateTemplate}
        isGenerating={aiGenerating}
      />

      {/* ── Delete Profile Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl overflow-y-auto max-h-[90vh]">

            {/* STEP 1 — Disclaimer */}
            {!deleteDisclaimerAccepted && (
              <>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 leading-tight">
                      Delete your profile
                    </h2>
                    <p className="text-sm text-slate-500">
                      This action is permanent and cannot be undone
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-4">
                  <p className="text-sm font-semibold text-red-700 mb-2">
                    By proceeding, the following will be permanently deleted:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-sm text-red-700">
                    <li>Your account and profile information</li>
                    <li>All CRM data including contacts, deals, and activity history</li>
                    <li>All backups and stored configurations</li>
                    <li>Email templates and onboarding settings</li>
                    <li>Any related content and integrations linked to your account</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    disabled={profileDeleting}
                    onClick={closeDeleteModal}
                    className="rounded-xl border px-5 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setDeleteDisclaimerAccepted(true)}
                    className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 transition-colors"
                  >
                    I understand, continue
                  </button>
                </div>
              </>
            )}

            {/* STEP 2 — Reason + Delete */}
            {deleteDisclaimerAccepted && (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-slate-900">
                    Why are you leaving?
                  </h2>
                  <p className="mt-2 text-slate-500">
                    We'd appreciate your feedback before you go.
                  </p>
                </div>

                <div className="grid gap-3">
                  {[
                    "Found a better service",
                    "Too expensive",
                    "Missing features",
                    "Difficult to use",
                    "Technical issues",
                    "No longer needed",
                    "Created another account",
                    "Other",
                  ].map((reason) => (
                    <label
                      key={reason}
                      className={`cursor-pointer rounded-xl border p-4 transition ${deleteReason === reason
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 hover:border-slate-300"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          value={reason}
                          checked={deleteReason === reason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                        />
                        <span className="font-medium">{reason}</span>
                      </div>
                    </label>
                  ))}
                </div>

                {deleteReason === "Other" && (
                  <textarea
                    rows={4}
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    className="mt-4 w-full rounded-xl border p-3"
                    placeholder="Tell us more..."
                  />
                )}

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    disabled={profileDeleting}
                    onClick={() => {
                      setDeleteDisclaimerAccepted(false);
                      setDeleteReason("");
                      setOtherReason("");
                    }}
                    className="rounded-xl border px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    disabled={!deleteReason || profileDeleting}
                    onClick={() =>
                      handleDeleteProfile(
                        deleteReason === "Other" ? otherReason : deleteReason,
                      )
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {profileDeleting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Profile"
                    )}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
