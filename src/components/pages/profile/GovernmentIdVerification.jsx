import { useState } from "react";
import { Hash, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import GovernmentDocumentUpload from "./GovernmentDocumentUpload";
import { governmentIdError, governmentIdTypes } from "./onboardingValidation.js";

export default function GovernmentIdVerification({
  governmentIdType, governmentIdNumber, governmentDocumentFile,
  documentScanBusy, documentScanned, documentMatches, documentScanError,
  onDocumentFileChange, onDocumentScan, onIdTypeChange, onIdNumberChange,
}) {
  const [idTouched, setIdTouched] = useState(false);
  const selectedId = governmentIdTypes[governmentIdType];
  const idError = governmentIdError(governmentIdType, governmentIdNumber);
  const showIdReminder = (idTouched || !!documentScanError) && !!idError;

  return (
    <section aria-labelledby="candidate-id-heading" className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 id="candidate-id-heading" className="text-base font-semibold">Government ID</h2>
      <div className="grid gap-5 sm:grid-cols-[0.85fr_1.15fr]">
        <div>
          <label htmlFor="candidate-id-type" className={styles.label}>Government ID <span className="text-primary">*</span></label>
          <div className={styles.inputIcon}>
            <IdCard size={18} aria-hidden="true" />
            <select id="candidate-id-type" required value={governmentIdType}
              onChange={(event) => { onIdTypeChange(event.target.value); setIdTouched(false); }} className={styles.input}>
              {Object.entries(governmentIdTypes).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="candidate-id-number" className={styles.label}>{selectedId.label} number <span className="text-primary">*</span></label>
          <div className={styles.inputIcon}>
            <Hash size={18} aria-hidden="true" />
            <input id="candidate-id-number" required autoComplete="off" spellCheck={false}
              inputMode={governmentIdType === "aadhaar" ? "numeric" : "text"}
              maxLength={selectedId.maxLength} value={governmentIdNumber}
              onChange={(event) => onIdNumberChange(event.target.value.toUpperCase())}
              placeholder={selectedId.placeholder} onBlur={() => setIdTouched(true)}
              aria-invalid={showIdReminder}
              aria-describedby={showIdReminder ? "candidate-id-hint" : undefined}
              className={cn(styles.input, "tracking-wider placeholder:tracking-normal placeholder:text-muted-foreground/70")} />
          </div>
          {showIdReminder && <p id="candidate-id-hint" className={cn(styles.help, "text-destructive")}>{idError}</p>}
        </div>
      </div>
      <GovernmentDocumentUpload
        label={selectedId.label} file={governmentDocumentFile}
        scanning={documentScanBusy} scanned={documentScanned} matches={documentMatches}
        error={documentScanError} onFileChange={onDocumentFileChange} onScan={onDocumentScan}
      />
    </section>
  );
}
