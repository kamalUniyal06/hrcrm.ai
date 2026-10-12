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
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--ob-line)] bg-[var(--ob-surface)] px-3.5 py-2 text-sm font-semibold transition-colors hover:border-[var(--ob-accent)] hover:bg-[var(--ob-soft)] disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className={embedded ? "" : "ob-surface p-5"}>
      {!embedded && (
        <>
          <h2 className="text-lg font-semibold">Add your profile photo</h2>
          <p className="ob-muted mt-1 text-sm">
            Choose a photo or take one with your camera, then upload it.
          </p>
        </>
      )}
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
              className="ob-input !bg-[var(--ob-surface)]"
            />
            <p className="ob-help">
              Use the email associated with your candidate profile.
            </p>
          </div>

          <input
            ref={fileInputRef}
            id="candidate-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={uploading}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              selectPhoto(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          <AnimatePresence mode="wait" initial={false}>
            {cameraOpen ? (
              <Motion.div
                key="camera"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="rounded-xl border border-[var(--ob-line)] bg-[var(--ob-page)] p-4"
              >
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="mx-auto aspect-video w-full max-w-md rounded-xl border border-[var(--ob-line)] bg-slate-900 object-cover"
                  aria-label="Camera preview"
                />
                <div className="mt-3 flex flex-wrap justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={takePhoto}
                    disabled={!cameraReady}
                    className="ob-primary"
                  >
                    <Camera size={16} />
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
              </Motion.div>
            ) : preview ? (
              <Motion.div
                key="preview"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col items-center gap-4 rounded-xl border border-[var(--ob-line)] bg-[var(--ob-page)] p-4 sm:flex-row"
              >
                <div className="relative shrink-0">
                  <img
                    key={preview}
                    src={preview}
                    alt={
                      uploaded
                        ? "Uploaded candidate photo"
                        : "Selected candidate photo preview"
                    }
                    className="h-24 w-24 rounded-2xl border-2 border-[var(--ob-accent)] object-cover shadow-xs"
                  />
                  {uploaded && (
                    <span className="absolute -bottom-1.5 -right-1.5 grid size-6 place-items-center rounded-full bg-[var(--ob-accent)] text-[var(--ob-surface)] shadow-xs">
                      <Check size={13} />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="break-all text-sm font-semibold text-[var(--ob-accent)]">
                    {photo?.name || "Profile photo"}
                  </p>
                  <p className="ob-muted mt-0.5 text-xs">
                    {uploaded
                      ? "Photo uploaded and linked to your profile."
                      : "Ready to upload. Click Upload photo below to apply it."}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className={buttonClass}
                    >
                      <ImagePlus size={15} />
                      Change photo
                    </button>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={startCamera}
                      className={buttonClass}
                    >
                      <Camera size={15} />
                      Take a photo
                    </button>
                  </div>
                </div>
              </Motion.div>
            ) : (
              <Motion.div
                key="dropzone"
                initial={reducedMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!dragging) setDragging(true);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) {
                    setDragging(false);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  selectPhoto(event.dataTransfer.files?.[0]);
                }}
                className={`ob-choice flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center ${
                  dragging
                    ? "border-[var(--ob-accent)] bg-[var(--ob-soft)]"
                    : "border-[var(--ob-line)] bg-[var(--ob-page)]"
                }`}
              >
                <PhotoUploadIllustration
                  active={dragging}
                  reducedMotion={reducedMotion}
                />
                <label
                  htmlFor="candidate-photo"
                  onClick={(event) => event.stopPropagation()}
                  className="mt-1.5 cursor-pointer text-sm font-medium"
                >
                  Choose a photo (JPG, PNG, or WebP){" "}
                  <span className="ob-required">*</span>
                </label>
                <p className="ob-help">
                  Drag and drop an image here, or use one of the options below.
                </p>
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={(event) => {
                      event.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className={buttonClass}
                  >
                    <ImagePlus size={16} />
                    Choose from device
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={(event) => {
                      event.stopPropagation();
                      startCamera();
                    }}
                    className={buttonClass}
                  >
                    <Camera size={16} />
                    Take a photo
                  </button>
                </div>
              </Motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={
              !photo ||
              !email.trim() ||
              uploading ||
              cameraOpen ||
              Boolean(uploaded)
            }
            className="ob-primary"
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

