import { useState } from "react";
import { BriefcaseBusiness, FileText, LockKeyhole, Mail, MapPin, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { countrySuggestions, fieldIcons, genderOptions, indianRegions } from "./candidateFormOptions";
import { ABOUT_MIN_LENGTH, localToday, normalizeProfileUrl, requiredPersonalFields, validatePersonalDetails } from "./onboardingValidation";

const groups = [
  { title: "Contact and personal information", hint: "The basics recruiters use to get to know you and reach you.", icon: UserRound, keys: ["first_name", "last_name", "phone_mobile", "dob", "gender"] },
  { title: "Address", hint: "Tell us where you're currently based.", icon: MapPin, keys: ["primary_address_street", "primary_address_country", "primary_address_state", "primary_address_city", "primary_address_postalcode"] },
  { title: "Professional introduction", hint: "Share your background, career interests, and professional profiles.", icon: BriefcaseBusiness, keys: ["current_designation", "description", "linkedin_url", "github_url"] },
];
const autoComplete = {
  first_name: "given-name", last_name: "family-name", phone_mobile: "tel", dob: "bday",
  primary_address_street: "street-address", primary_address_city: "address-level2",
  primary_address_state: "address-level1", primary_address_postalcode: "postal-code",
  primary_address_country: "country-name", current_designation: "organization-title",
};

export default function CandidatePersonalDetails({ email, draft, setDraft, fieldErrors, setFieldErrors }) {
  const [customRegion, setCustomRegion] = useState(false);
  const usesIndianRegions = !draft.primary_address_country || /^(india|in|ind|bharat)$/i.test(draft.primary_address_country.trim());
  const change = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  };
  const input = (key) => {
    const required = Object.hasOwn(requiredPersonalFields, key);
    const label = requiredPersonalFields[key] || (key === "linkedin_url" ? "LinkedIn URL" : "GitHub URL");
    const error = fieldErrors[key];
    const Icon = fieldIcons[key] || FileText;
    const id = `candidate-${key}`;
    const describedBy = [key === "description" && "candidate-about-hint", error && `${id}-error`].filter(Boolean).join(" ") || undefined;
    const attributes = {
      id, required, value: draft[key] || "", className: styles.input,
      "aria-invalid": !!error, "aria-describedby": describedBy,
      autoComplete: autoComplete[key],
      onChange: event => change(key, event.target.value),
      onBlur: event => {
        const value = key.endsWith("_url") ? normalizeProfileUrl(event.target.value) : event.target.value;
        if (key.endsWith("_url")) change(key, value);
        setFieldErrors(prev => ({ ...prev, [key]: validatePersonalDetails({ ...draft, [key]: value })[key] }));
      },
    };
    if (key === "gender") {
      const options = genderOptions.some(option => option.toLowerCase() === draft.gender.toLowerCase()) || !draft.gender ? genderOptions : [...genderOptions, draft.gender];
      return (
        <fieldset key={key} id={id} tabIndex={-1} aria-invalid={!!error} aria-describedby={describedBy} className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary sm:col-span-2">
          <legend className="mb-2 flex items-center gap-2 text-sm font-medium"><UserRound size={16} className="text-muted-foreground" aria-hidden="true" /> Gender <span className="text-primary">*</span></legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {options.map(option => (
              <label key={option} className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary", draft.gender.toLowerCase() === option.toLowerCase() && "border-primary bg-accent text-primary", error && "border-destructive")}>
                <input type="radio" name="candidate-gender" value={option} required checked={draft.gender.toLowerCase() === option.toLowerCase()} onChange={() => change(key, option)} className="size-4 shrink-0 accent-primary" />
                <span>{option}</span>
              </label>
            ))}
          </div>
          {error && <p id={`${id}-error`} className="mt-2 text-xs text-destructive">{error}</p>}
        </fieldset>
      );
    }
    return (
      <div key={key} className={key === "description" || key === "primary_address_street" || key === "current_designation" ? "sm:col-span-2" : ""}>
        <label htmlFor={id} className={styles.label}>{label} {required ? <span className="text-primary">*</span> : <span className="text-xs font-normal text-muted-foreground">(optional)</span>}</label>
        <div className={cn(styles.inputIcon, "[&>textarea]:mt-0 [&>textarea]:pl-[41px]")}>
          <Icon size={18} aria-hidden="true" />
          {key === "description" ? (
            <textarea {...attributes} rows={4} minLength={ABOUT_MIN_LENGTH} placeholder="Tell us about your background, strengths, and what you'd like to do next." />
          ) : key === "primary_address_state" && usesIndianRegions && !customRegion ? (
            <select {...attributes} onChange={event => {
              if (event.target.value === "__custom_region__") { setCustomRegion(true); change(key, ""); requestAnimationFrame(() => document.getElementById(id)?.focus()); }
              else change(key, event.target.value);
            }}>
              <option value="" disabled>Select a state or union territory</option>
              {draft[key] && !indianRegions.includes(draft[key]) && <option value={draft[key]}>{draft[key]}</option>}
              {indianRegions.map(region => <option key={region} value={region}>{region}</option>)}
              <option value="__custom_region__">Enter another state / region</option>
            </select>
          ) : (
            <input {...attributes}
              type={key === "dob" ? "date" : key === "phone_mobile" ? "tel" : "text"}
              inputMode={key.endsWith("_url") ? "url" : key === "primary_address_postalcode" && usesIndianRegions ? "numeric" : undefined}
              max={key === "dob" ? localToday() : undefined}
              list={key === "primary_address_country" ? "candidate-country-options" : undefined}
              placeholder={key === "linkedin_url" ? "linkedin.com/in/your-name" : key === "github_url" ? "github.com/your-name" : key === "primary_address_country" ? "Choose or enter your country" : key === "primary_address_state" ? "Enter your state or region" : undefined}
            />
          )}
        </div>
        {key === "primary_address_state" && usesIndianRegions && customRegion && <button type="button" onClick={() => setCustomRegion(false)} className="mt-1 min-h-11 text-xs font-medium text-primary hover:underline">Choose from Indian states instead</button>}
        {key === "description" && <p id="candidate-about-hint" className={cn(styles.help, "flex flex-wrap justify-between gap-2")}><span>At least {ABOUT_MIN_LENGTH} characters.</span><span className={cn("tabular-nums", draft.description.trim().length >= ABOUT_MIN_LENGTH && "text-primary")}>{draft.description.trim().length} characters</span></p>}
        {error && <p id={`${id}-error`} className="mt-2 text-xs leading-5 text-destructive">{error}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <datalist id="candidate-country-options">{countrySuggestions.map(country => <option key={country} value={country} />)}</datalist>
      {groups.map(({ title, hint, icon, keys }, index) => {
        const Icon = icon;
        return (
        <section key={title} aria-labelledby={`personal-group-${index}`} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <header className="mb-6 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Icon size={20} aria-hidden="true" /></span>
            <div><h2 id={`personal-group-${index}`} className="text-base font-semibold">{title}</h2><p className="mt-1 text-sm leading-5 text-muted-foreground">{hint}</p></div>
          </header>
          <div className="grid gap-5 sm:grid-cols-2">
            {index === 0 && <div className="border-b border-border pb-5 sm:col-span-2">
              <label htmlFor="candidate-email1" className={styles.label}>Account email <span className="text-primary">*</span></label>
              <div className={styles.inputIcon}><Mail size={18} aria-hidden="true" /><input id="candidate-email1" type="email" value={email} readOnly className={styles.input} aria-describedby="candidate-email-hint" /></div>
              <p id="candidate-email-hint" className={cn(styles.help, "flex items-start gap-1.5")}><LockKeyhole size={13} className="mt-0.5 shrink-0" aria-hidden="true" /> This is the email address you use to sign in.</p>
            </div>}
            {keys.map(input)}
          </div>
        </section>
      ); })}
    </div>
  );
}
