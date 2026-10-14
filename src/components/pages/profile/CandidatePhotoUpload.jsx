import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion, useReducedMotion } from "framer-motion";
import { Camera, Check, ImagePlus, Loader2, Mail, Upload } from "lucide-react";
import { FETCH_GPC_X_API_KEY } from "../../../store/constants";
import { crmFetch } from "../../../services/crmClient";
import { toast } from "react-hot-toast";

function PhotoUploadIllustration({ active = false, reducedMotion = false }) {
  const float = (delay = 0) =>
    reducedMotion
      ? undefined
      : {
          y: [0, -5, 0],
          transition: {
            duration: 3.8,
            repeat: Infinity,
            ease: "easeInOut",
            delay,
          },
        };

  return (
    <svg
      viewBox="0 0 200 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="mx-auto w-full max-w-[170px] overflow-visible select-none"
    >
      <ellipse
        cx="100"
        cy="108"
        rx="50"
        ry="7"
        fill="var(--ob-line)"
        opacity=".35"
      />
      <Motion.g
        animate={
          reducedMotion
            ? undefined
            : active
              ? { y: -4, scale: 1.04 }
              : float(0)
        }
        transition={{ duration: 0.2 }}
      >
        <rect
          x="56"
          y="14"
          width="74"
          height="78"
          rx="14"
          fill="var(--ob-soft)"
          stroke={active ? "var(--ob-accent)" : "var(--ob-line)"}
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
        <rect
          x="64"
          y="10"
          width="74"
          height="78"
          rx="14"
          fill="var(--ob-surface)"
          stroke="var(--ob-accent)"
          strokeOpacity={active ? ".85" : ".45"}
          strokeWidth="1.6"
        />
        <circle cx="101" cy="40" r="13" fill="var(--ob-soft)" />
        <circle cx="101" cy="37" r="5" fill="var(--ob-accent)" opacity=".85" />
        <path
          d="M89 51c0-8 24-8 24 0"
          fill="var(--ob-accent)"
          opacity=".55"
        />
        <path
          d="M82 66h38M88 73h26"
          stroke="var(--ob-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </Motion.g>
      <Motion.g animate={float(0.8)}>
        <rect
          x="130"
          y="58"
          width="32"
          height="26"
          rx="8"
          fill="var(--ob-accent)"
        />
        <circle
          cx="146"
          cy="71"
          r="5"
          stroke="var(--ob-surface)"
          strokeWidth="2"
        />
        <path
          d="M141 62h10"
          stroke="var(--ob-surface)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Motion.g>
    </svg>
  );
}

export default function CandidatePhotoUpload({
  initialEmail = "",
  initialPhotoUrl = "",
  lockedEmail = false,
  disabled = false,
  embedded = false,
  onUploaded,
  onBusyChange,
}) {
  const reducedMotion = useReducedMotion();
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(initialPhotoUrl);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const setError = (message) => {
    if (message) toast.error(message);
  };
  const [uploaded, setUploaded] = useState(() =>
    initialPhotoUrl ? { image_url: initialPhotoUrl } : null,
  );
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewRef = useRef("");
  const requestRef = useRef(null);
  const cameraAttemptRef = useRef(0);

  useEffect(
    () => () => {
      cameraAttemptRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      URL.revokeObjectURL(previewRef.current);
      requestRef.current?.abort();
    },
    [],
  );

  const stopCamera = () => {
    cameraAttemptRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  };

  const selectPhoto = (file) => {
    setError("");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !file.size) {
      setError("Please choose a non-empty JPG, PNG, or WebP image.");
      return;
    }
    stopCamera();
    URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(file);
    setPhoto(file);
    setPreview(previewRef.current);
    setUploaded(null);
  };

  const startCamera = async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(
        "Camera access is unavailable in this browser. Please upload a photo instead.",
      );
      return;
    }
    const attempt = ++cameraAttemptRef.current;
    setCameraOpen(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (attempt !== cameraAttemptRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      if (attempt === cameraAttemptRef.current) setCameraReady(true);
    } catch {
      if (attempt !== cameraAttemptRef.current) return;
      stopCamera();
      setError(
        "Could not access your camera. Allow camera access or upload a photo instead.",
      );
    }
  };

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const attempt = cameraAttemptRef.current;
    canvas.toBlob(
      (blob) => {
        if (attempt !== cameraAttemptRef.current) return;
        if (!blob) {
          setError("Could not capture your photo. Please try again.");
          return;
        }
        selectPhoto(
          new File([blob], "candidate-photo.jpg", { type: "image/jpeg" }),
        );
      },
      "image/jpeg",
      0.9,
    );
  };

  const uploadPhoto = async (event) => {
    event.preventDefault();
    if (!photo || !email.trim() || requestRef.current) return;
    setError("");
    setUploaded(null);
    if (!FETCH_GPC_X_API_KEY) {
      setError(
        "Photo upload is not configured. Please contact your administrator.",
      );
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setUploading(true);
    onBusyChange?.(true);
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const body = new FormData();
      body.append("email", email.trim());
      body.append("image", photo, photo.name);
      const response = await crmFetch(
        "https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=upload_candidate_image",
        {
          method: "POST",
          headers: { "x-api-key": FETCH_GPC_X_API_KEY },
          body,
          signal: controller.signal,
        },
      );
      const json = await response.json().catch(() => {
        throw new Error(
          "The server returned an unreadable response. Please try again.",
        );
      });
      if (!response.ok || json?.success !== true) {
        throw new Error(
          typeof json?.message === "string"
            ? json.message
            : typeof json?.error === "string"
              ? json.error
              : "Could not upload your photo. Please try again.",
        );
      }
      const imageUrl = json.image_url;
      if (typeof imageUrl !== "string" || !/^https?:\/\/.+/i.test(imageUrl))
        throw new Error(
          "The upload did not return a valid image URL. Please try again.",
        );
      onUploaded?.(imageUrl, photo);
      setUploaded(json);
      toast.success(
        "Photo uploaded. Complete registration or save your profile to apply it.",
      );
    } catch (err) {
      setError(
        err.name === "AbortError"
          ? "Photo upload timed out. Please try again."
          : err.message || "Photo upload failed. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  const buttonClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--ob-line)] px-4 py-2 text-sm font-medium hover:bg-[var(--ob-soft)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className={embedded ? "" : "ob-surface p-6"}>
      {!embedded && <><h2 className="text-lg font-semibold">
        Add your profile photo
      </h2>
      <p className="ob-muted mt-1 text-sm">
        Choose a photo or take one with your camera, then upload it.
      </p></>}
      <form
        onSubmit={uploadPhoto}
        className={embedded ? "space-y-4" : "mt-4 space-y-4"}
        aria-busy={uploading}
      >
        <fieldset disabled={disabled} className="space-y-4">
          <div className="rounded-xl border border-[var(--ob-line)] bg-[var(--ob-page)] p-3.5">
            <div className="flex items-center gap-2">
              <Mail
                size={14}
                className="text-[var(--ob-accent)]"
                aria-hidden="true"
              />
              <label htmlFor="candidate-photo-email" className="ob-label">
                Candidate email <span className="ob-required">*</span>
              </label>
            </div>
            <input
              id="candidate-photo-email"
              type="email"
              required
              value={email}
              readOnly={lockedEmail}
              disabled={uploading}
              onChange={(event) => {
                setEmail(event.target.value);
                setUploaded(null);
              }}
              placeholder="you@example.com"
              className="ob-input"
            />
            <p className="ob-help">
              Use the email associated with your candidate profile.
            </p>
          </div>
          <div>
            <label
              htmlFor="candidate-photo"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Choose a photo (JPG, PNG, or WebP)
            </label>
            <input
              id="candidate-photo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              className="ob-input block file:mr-3 file:rounded-md file:border-0 file:bg-[var(--ob-soft)] file:px-3 file:py-2 file:text-[var(--ob-accent)]"
              onChange={(event) => {
                selectPhoto(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
          {!cameraOpen && (
            <button
              type="button"
              disabled={uploading}
              onClick={startCamera}
              className={buttonClass}
            >
              <Camera size={17} />
              Take a photo
            </button>
          )}
          {cameraOpen && (
            <div className="max-w-md space-y-3">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full rounded-xl bg-slate-900 object-cover"
                aria-label="Camera preview"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={takePhoto}
                  disabled={!cameraReady}
                  className={buttonClass}
                >
                  Capture photo
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className={buttonClass}
                >
                  Cancel camera
                </button>
              </div>
            </div>
          )}
          {preview && !cameraOpen && (
            <div className="flex items-center gap-4">
              <img
                key={preview}
                src={preview}
                alt={
                  uploaded
                    ? "Uploaded candidate photo"
                    : "Selected candidate photo preview"
                }
                className="h-28 w-28 rounded-xl border border-slate-200 object-cover"
              />
              <p className="break-all text-sm text-slate-500">{photo.name}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={
              !photo ||
              !email.trim() ||
              uploading ||
              cameraOpen ||
              Boolean(uploaded)
            }
            className={styles.primary}
          >
            {uploading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Upload size={17} />
            )}
            {uploading
              ? "Uploading photo..."
              : uploaded
                ? "Photo uploaded"
                : "Upload photo"}
          </button>
        </fieldset>
      </form>
    </section>
  );
}

