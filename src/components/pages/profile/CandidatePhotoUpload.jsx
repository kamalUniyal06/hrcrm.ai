import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { useEffect, useRef, useState } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import { Camera, Check, ImagePlus, Loader2, Mail, RotateCcw, UploadCloud, UserRound, X } from "lucide-react";
import { FETCH_GPC_X_API_KEY } from "../../../store/constants";
import { crmFetch } from "../../../services/crmClient";
import { toast } from "react-hot-toast";

// Photo picker with drag and drop, file choice or camera capture. The photo
// uploads as soon as it is chosen; `existingUrl` previews a photo saved earlier.
export default function CandidatePhotoUpload({
  initialEmail = "",
  lockedEmail = false,
  disabled = false,
  embedded = false,
  existingUrl = "",
  invalid = false,
  onUploaded,
  onBusyChange,
}) {
  const reducedMotion = useReducedMotion();
  const [email, setEmail] = useState(initialEmail);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [failedExisting, setFailedExisting] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewRef = useRef("");
  const requestRef = useRef(null);
  const cameraAttemptRef = useRef(0);
  const inputRef = useRef(null);
  const dragDepth = useRef(0);

  const uploading = status === "uploading";
  const locked = disabled || uploading;
  const savedUrl = existingUrl && failedExisting !== existingUrl ? existingUrl : "";
  const shownUrl = preview || savedUrl;
  const done = status === "uploaded" || (!preview && !!savedUrl);

  useEffect(
    () => () => {
      cameraAttemptRef.current += 1;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      URL.revokeObjectURL(previewRef.current);
      requestRef.current?.abort();
    },
    [],
  );

  const fail = (message) => {
    setStatus("error");
    setErrorMessage(message);
    toast.error(message);
  };

  const stopCamera = () => {
    cameraAttemptRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraReady(false);
  };

  const upload = async (file) => {
    if (!file || requestRef.current) return;
    if (!email.trim()) {
      fail("Enter the email associated with your candidate profile first.");
      return;
    }
    if (!FETCH_GPC_X_API_KEY) {
      fail("Photo upload is not configured. Please contact your administrator.");
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("uploading");
    setErrorMessage("");
    onBusyChange?.(true);
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const body = new FormData();
      body.append("email", email.trim());
      body.append("image", file, file.name);
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
        throw new Error("The server returned an unreadable response. Please try again.");
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
        throw new Error("The upload did not return a valid image URL. Please try again.");
      onUploaded?.(imageUrl, file);
      setStatus("uploaded");
      toast.success("Photo uploaded.");
    } catch (err) {
      fail(
        err.name === "AbortError"
          ? "Photo upload timed out. Please try again."
          : err.message || "Photo upload failed. Please try again.",
      );
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      onBusyChange?.(false);
    }
  };

  const selectPhoto = (file) => {
    if (!file || locked) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || !file.size) {
      toast.error("Please choose a non-empty JPG, PNG, or WebP image.");
      return;
    }
    stopCamera();
    URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(file);
    setPhoto(file);
    setPreview(previewRef.current);
    upload(file);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera access is unavailable in this browser. Please choose a photo instead.");
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
      toast.error("Could not access your camera. Allow camera access or choose a photo instead.");
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
          toast.error("Could not capture your photo. Please try again.");
          return;
        }
        selectPhoto(new File([blob], "candidate-photo.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  const title = dragging
    ? "Drop your photo to upload it"
    : uploading
      ? "Uploading your photo…"
      : status === "error"
        ? "Your photo was not uploaded"
        : done
          ? "Looking good"
          : "Drag and drop your photo here";
  const subtitle = uploading
    ? "This only takes a moment. Keep this page open."
    : status === "error"
      ? errorMessage
      : done
        ? "Your photo is uploaded. Drop or choose another to replace it."
        : "Use a clear, front-facing photo. JPG, PNG, or WebP.";

  return (
    <section className={embedded ? "" : cn(styles.surface, "p-6")}>
      {!embedded && (
        <>
          <h2 className="text-lg font-semibold">Add your profile photo</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Drop a photo, choose one, or take one with your camera.
          </p>
        </>
      )}
      <div className={embedded ? "space-y-4" : "mt-5 space-y-4"}>
        {lockedEmail ? (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Mail size={15} aria-hidden="true" /> Linked to <span className="font-medium text-foreground">{email}</span>
          </p>
        ) : (
          <div className="max-w-md">
            <label htmlFor="candidate-photo-email" className={styles.label}>Candidate email</label>
            <input
              id="candidate-photo-email"
              type="email"
              required
              value={email}
              disabled={locked}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={styles.input}
            />
            <p className={styles.help}>Use the email associated with your candidate profile.</p>
          </div>
        )}

        <div
          id="candidate-photo-dropzone"
          tabIndex={-1}
          role="group"
          aria-label="Profile photo"
          aria-busy={uploading}
          aria-invalid={invalid || undefined}
          aria-describedby="candidate-photo-status"
          className={cn(
            "relative rounded-2xl border-2 border-dashed border-border bg-card/60 p-5 outline-none transition-[border-color,background-color,scale] duration-200 hover:border-primary/40 motion-reduce:transition-none sm:p-7",
            dragging && "scale-[1.01] border-primary bg-accent",
            done && !dragging && "border-solid border-[var(--employee-green)]/40 bg-[var(--employee-green-soft)]/40",
            (status === "error" || (invalid && !done)) && !dragging && "border-destructive/60",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            if (locked || cameraOpen || !Array.from(event.dataTransfer.types).includes("Files")) return;
            dragDepth.current += 1;
            setDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = locked || cameraOpen ? "none" : "copy";
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            dragDepth.current = Math.max(0, dragDepth.current - 1);
            if (!dragDepth.current) setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepth.current = 0;
            setDragging(false);
            if (!cameraOpen) selectPhoto(event.dataTransfer.files?.[0]);
          }}
        >
          {cameraOpen ? (
            <div className="mx-auto max-w-md space-y-3">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full rounded-xl bg-foreground object-cover"
                aria-label="Camera preview"
              />
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" onClick={takePhoto} disabled={!cameraReady} className={styles.primary}>
                  <Camera size={17} aria-hidden="true" /> Capture photo
                </button>
                <button type="button" onClick={stopCamera} className={cn(styles.secondary, "bg-card")}>
                  <X size={17} aria-hidden="true" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:gap-7 sm:text-left">
              <div className="relative size-32 shrink-0">
                {shownUrl ? (
                  <Motion.img
                    key={shownUrl}
                    src={shownUrl}
                    alt={done ? "Your profile photo" : "Selected profile photo preview"}
                    initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    onError={() => !preview && setFailedExisting(existingUrl)}
                    className="size-full rounded-full object-cover shadow-md ring-4 ring-card"
                  />
                ) : (
                  <Motion.span
                    aria-hidden="true"
                    animate={reducedMotion ? undefined : dragging ? { scale: 1.08 } : { y: [0, -5, 0] }}
                    transition={dragging ? { type: "spring", stiffness: 300, damping: 16 } : { duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="flex size-full items-center justify-center rounded-full border-2 border-dashed border-primary/30 bg-accent text-primary"
                  >
                    {dragging ? <UploadCloud size={36} /> : <UserRound size={40} />}
                  </Motion.span>
                )}
                {uploading && (
                  <span className="absolute inset-0 grid place-items-center rounded-full bg-foreground/40" aria-hidden="true">
                    <Loader2 size={28} className="animate-spin text-white motion-reduce:animate-none" />
                  </span>
                )}
                {done && (
                  <Motion.span
                    aria-hidden="true"
                    initial={reducedMotion ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 420, damping: 16 }}
                    className="absolute right-1 bottom-1 grid size-8 place-items-center rounded-full border-2 border-card bg-[var(--employee-green)] text-white"
                  >
                    <Check size={16} strokeWidth={3} />
                  </Motion.span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold">{title}</p>
                <p id="candidate-photo-status" role="status" aria-live="polite" className={cn("mt-1 text-sm leading-6", status === "error" ? "text-destructive" : "text-muted-foreground")}>
                  {subtitle}
                </p>
                {photo && !uploading && <p className="text-muted-foreground mt-1 break-all text-xs">{photo.name}</p>}
                <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                  {status === "error" && photo ? (
                    <button type="button" onClick={() => upload(photo)} disabled={locked} className={styles.primary}>
                      <RotateCcw size={16} aria-hidden="true" /> Try again
                    </button>
                  ) : null}
                  <button type="button" onClick={() => inputRef.current?.click()} disabled={locked} className={cn(status === "error" || done ? styles.secondary : styles.primary, status === "error" || done ? "bg-card" : "")}>
                    <ImagePlus size={16} aria-hidden="true" /> {shownUrl ? "Choose another" : "Choose photo"}
                  </button>
                  <button type="button" onClick={startCamera} disabled={locked} className={cn(styles.secondary, "bg-card")}>
                    <Camera size={16} aria-hidden="true" /> Take a photo
                  </button>
                </div>
              </div>
            </div>
          )}
          <label htmlFor="candidate-photo" className="sr-only">Choose a profile photo</label>
          <input
            ref={inputRef}
            id="candidate-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            tabIndex={-1}
            disabled={locked}
            className="sr-only"
            onChange={(event) => {
              selectPhoto(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
      </div>
    </section>
  );
}
