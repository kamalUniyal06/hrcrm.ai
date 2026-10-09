import { useState } from "react";
import { candidateName } from "./candidatesApi";

export default function CandidateAvatar({ record, className = "" }) {
  const [failedPhoto, setFailedPhoto] = useState("");
  const photo = typeof record.profile_image === "string"
    ? record.profile_image.trim()
    : "";
  const showPhoto = photo && photo !== failedPhoto;

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden ${className}`}
    >
      {showPhoto ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedPhoto(photo)}
          className="h-full w-full object-cover"
        />
      ) : candidateName(record).slice(0, 1).toUpperCase()}
    </span>
  );
}
