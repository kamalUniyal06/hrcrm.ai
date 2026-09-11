import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload } from "lucide-react";
import { FETCH_GPC_X_API_KEY } from "../../../store/constants";

export default function CandidatePhotoUpload({ initialEmail = "", lockedEmail = false, disabled = false, onUploaded, onBusyChange }) {
  const [email, setEmail] = useState(initialEmail);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploaded, setUploaded] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const previewRef = useRef("");
  const requestRef = useRef(null);
  const cameraAttemptRef = useRef(0);

  useEffect(() => () => {
    cameraAttemptRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    URL.revokeObjectURL(previewRef.current);
    requestRef.current?.abort();
  }, []);

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
      setError("Camera access is unavailable in this browser. Please upload a photo instead.");
      return;
    }
    const attempt = ++cameraAttemptRef.current;
    setCameraOpen(true);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
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
      setError("Could not access your camera. Allow camera access or upload a photo instead.");
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
    canvas.toBlob((blob) => {
      if (attempt !== cameraAttemptRef.current) return;
      if (!blob) {
        setError("Could not capture your photo. Please try again.");
        return;
      }
      selectPhoto(new File([blob], "candidate-photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  const uploadPhoto = async (event) => {
    event.preventDefault();
    if (!photo || !email.trim() || requestRef.current) return;
    setError("");
    setUploaded(null);
    if (!FETCH_GPC_X_API_KEY) {
      setError("Photo upload is not configured. Please contact your administrator.");
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
      const response = await fetch("https://flight.hrcrm.ai/index.php?entryPoint=hrc&type=upload_candidate_image", {
        method: "POST", headers: { "x-api-key": FETCH_GPC_X_API_KEY }, body, signal: controller.signal,
      });
      const json = await response.json().catch(() => { throw new Error("The server returned an unreadable response. Please try again."); });
      if (!response.ok || json?.success !== true) {
        throw new Error(typeof json?.message === "string" ? json.message : typeof json?.error === "string" ? json.error : "Could not upload your photo. Please try again.");
      }
      const imageUrl = json.image_url;
      if (typeof imageUrl !== "string" || !/^https?:\/\/.+/i.test(imageUrl)) throw new Error("The upload did not return a valid image URL. Please try again.");
      onUploaded?.(imageUrl, photo);
      setUploaded(json);
    } catch (err) {
      setError(err.name === "AbortError" ? "Photo upload timed out. Please try again." : err.message || "Photo upload failed. Please try again.");
    } finally {
      clearTimeout(timeout);
      requestRef.current = null;
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-900">Add your profile photo</h2>
      <p className="mt-1 text-sm text-slate-500">Upload a photo or take one with your camera, then save your profile to apply it.</p>
      <form onSubmit={uploadPhoto} className="mt-5 space-y-5" aria-busy={uploading}>
        <fieldset disabled={disabled} className="space-y-5">
        <div className="max-w-md">
          <label htmlFor="candidate-photo-email" className="mb-2 block text-sm font-medium text-slate-700">Candidate email</label>
          <input id="candidate-photo-email" type="email" required value={email} readOnly={lockedEmail} disabled={uploading} onChange={(event) => { setEmail(event.target.value); setUploaded(null); }} placeholder="you@example.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <p className="mt-2 text-xs text-slate-500">Use the email associated with your candidate profile.</p>
        </div>
        <div>
          <label htmlFor="candidate-photo" className="mb-2 block text-sm font-medium text-slate-700">Choose a photo (JPG, PNG, or WebP)</label>
          <input id="candidate-photo" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:px-4 file:py-2 file:text-indigo-700" onChange={(event) => { selectPhoto(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
        {!cameraOpen && <button type="button" disabled={uploading} onClick={startCamera} className={buttonClass}><Camera size={17} />Take a photo</button>}
        {cameraOpen && <div className="max-w-md space-y-3">
          <video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-slate-900 object-cover" aria-label="Camera preview" />
          <div className="flex gap-3"><button type="button" onClick={takePhoto} disabled={!cameraReady} className={buttonClass}>Capture photo</button><button type="button" onClick={stopCamera} className={buttonClass}>Cancel camera</button></div>
        </div>}
        {preview && !cameraOpen && <div className="flex items-center gap-4"><img key={preview} src={preview} alt={uploaded ? "Uploaded candidate photo" : "Selected candidate photo preview"} className="h-28 w-28 rounded-xl border border-slate-200 object-cover" /><p className="break-all text-sm text-slate-500">{photo.name}</p></div>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={!photo || !email.trim() || uploading || cameraOpen || Boolean(uploaded)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-sidebar-primary to-sidebar-secondary px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{uploading ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}{uploading ? "Uploading photo..." : uploaded ? "Photo uploaded" : "Upload photo"}</button>
        <p role="status" className="text-sm text-green-700">{uploaded ? "Photo uploaded. Save your profile to apply it." : ""}</p>
        </fieldset>
      </form>
    </section>
  );
}

