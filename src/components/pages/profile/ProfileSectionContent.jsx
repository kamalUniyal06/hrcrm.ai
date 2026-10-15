import { BriefcaseBusiness, CalendarDays, ExternalLink, FileText, GraduationCap, MapPin, Quote, Sparkles, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import { candidateFields, relatedFields } from "./candidateApi";
import { fieldIcons, relatedFieldLabels } from "./candidateFormOptions";
import CandidatePersonalDetails from "./CandidatePersonalDetails";
import { capitalize, displayUrl, formatAddress, formatProfileDate, isWebUrl, relatedEntryView } from "./profileDisplay";

const personalGroups = [
  { title: "Contact and personal", icon: UserRound, keys: ["email1", "phone_mobile", "dob", "gender"] },
  { title: "Address", icon: MapPin, keys: [] },
  { title: "Professional", icon: BriefcaseBusiness, keys: ["current_designation", "title", "department", "linkedin_url", "github_url"] },
];
const sectionIcons = { education: GraduationCap, experiences: BriefcaseBusiness, skills: Sparkles };
const singulars = { education: "education", experiences: "experience", skills: "skill" };
const extraLabels = {
  company: "Company", position: "Position", designation: "Designation", ctc: "CTC",
  responsibilities: "Responsibilities", skill_name: "Skill", skill: "Skill", last_used: "Last used",
};
const longFields = /description|details|summary|responsibilit/i;
const linkClass = "relative inline-flex max-w-full items-center gap-1.5 break-all text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const labelFor = (key) =>
  key.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());

function FieldValue({ field, value }) {
  if (field === "email1") return <a href={`mailto:${value}`} className={linkClass}>{value}</a>;
  if (field === "phone_mobile") return <a href={`tel:${value.replace(/[^\d+]/g, "")}`} className={linkClass}>{value}</a>;
  if (field.endsWith("_url") && isWebUrl(value))
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {displayUrl(value)}
        <ExternalLink size={13} className="shrink-0" aria-hidden="true" />
        <span className="sr-only left-0 top-0">(opens in a new tab)</span>
      </a>
    );
  if (field === "dob") return formatProfileDate(value, "full");
  if (field === "gender") return capitalize(value);
  return value;
}

function GroupCard({ title, icon, children }) {
  const Icon = icon;
  return (
    <section className="rounded-2xl border border-border p-5 sm:p-6">
      <h3 className="mb-5 flex items-center gap-3 text-sm font-semibold">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent text-primary">
          <Icon size={18} aria-hidden="true" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function PersonalView({ draft }) {
  const address = formatAddress(draft);
  const designation = draft.current_designation?.trim().toLowerCase();
  const groups = personalGroups
    .map((group) => ({
      ...group,
      // Hide the title when it only repeats the current designation.
      keys: group.keys.filter((key) => draft[key] && !(key === "title" && draft[key].trim().toLowerCase() === designation)),
    }))
    .filter((group) => group.keys.length || (group.title === "Address" && address.length));
  return (
    <div className="space-y-5">
      {draft.description && (
        <section aria-labelledby="profile-about" className="relative rounded-2xl border border-primary/15 bg-accent/60 p-5 sm:p-6">
          <Quote size={22} className="absolute right-5 top-5 text-primary/25" aria-hidden="true" />
          <h3 id="profile-about" className="text-sm font-semibold text-primary">About me</h3>
          <p className="mt-2 whitespace-pre-wrap break-words pr-6 text-[15px] leading-7">{draft.description}</p>
        </section>
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title} className={group.title === "Professional" ? "xl:col-span-2" : ""}>
            <GroupCard title={group.title} icon={group.icon}>
              {group.title === "Address" ? (
                <address className="text-sm leading-6 not-italic">
                  {address.map((line) => <span key={line} className="block break-words">{line}</span>)}
                </address>
              ) : (
                <dl className={cn("grid gap-x-6 gap-y-5 sm:grid-cols-2", group.title === "Professional" && "lg:grid-cols-3")}>
                  {group.keys.map((key) => {
                    const Icon = fieldIcons[key] || FileText;
                    return (
                      <div key={key} className="min-w-0">
                        <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Icon size={14} aria-hidden="true" />
                          {candidateFields[key]}
                        </dt>
                        <dd className="mt-1.5 break-words text-sm font-medium">
                          <FieldValue field={key} value={draft[key]} />
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </GroupCard>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptySection({ section, editing }) {
  const Icon = sectionIcons[section];
  const singular = singulars[section];
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background px-6 py-12 text-center">
      <span className={cn(styles.icon, "mx-auto mb-4")}>
        <Icon size={23} aria-hidden="true" />
      </span>
      <h3 className="font-semibold">No {singular} added yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {editing
          ? `There are no ${singular} records to edit yet.`
          : `Your ${singular} details will appear here once they are added to your profile.`}
      </p>
    </div>
  );
}

function SkillsView({ items }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => {
        const entry = relatedEntryView("skills", item);
        return (
          <li key={item.id || index} className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary">
              <Sparkles size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold">{entry.title || `Skill ${index + 1}`}</p>
              {entry.details.length > 0 && (
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                  {entry.details.map(([label, value]) => `${label === "Experience" ? "" : `${label} `}${value}`).join(" · ")}
                </p>
              )}
              {entry.body.map((text) => (
                <p key={text} className="mt-1.5 line-clamp-3 text-xs leading-5 text-muted-foreground">{text}</p>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function TimelineView({ section, items }) {
  const Icon = sectionIcons[section];
  return (
    <ol className="space-y-0">
      {items.map((item, index) => {
        const entry = relatedEntryView(section, item);
        const last = index === items.length - 1;
        return (
          <li key={item.id || index} className="relative grid grid-cols-[auto_minmax(0,1fr)] gap-4">
            <div className="relative flex flex-col items-center">
              <span className="z-10 grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-accent text-primary">
                <Icon size={18} aria-hidden="true" />
              </span>
              {!last && <span className="w-px flex-1 bg-border" aria-hidden="true" />}
            </div>
            <article className={cn("min-w-0", !last && "pb-8")}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold leading-6">
                    {entry.title || `${capitalize(singulars[section])} ${index + 1}`}
                  </h3>
                  {entry.subtitle.length > 0 && (
                    <p className="mt-0.5 break-words text-sm text-muted-foreground">{entry.subtitle.join(" · ")}</p>
                  )}
                </div>
                {entry.period && (
                  <p className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <CalendarDays size={13} aria-hidden="true" />
                    {entry.period}
                    {entry.duration && <span className="text-foreground/70">· {entry.duration}</span>}
                  </p>
                )}
              </div>
              {entry.details.length > 0 && (
                <dl className="mt-3 flex flex-wrap gap-2">
                  {entry.details.map(([label, value]) => (
                    <div key={label} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-words font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {entry.body.map((text) => (
                <p key={text} className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">{text}</p>
              ))}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

function RelatedEditor({ section, items, update }) {
  const Icon = sectionIcons[section];
  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const entry = relatedEntryView(section, item);
        return (
          <article key={item.id || index} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <Icon size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {capitalize(singulars[section])} {index + 1} of {items.length}
                </p>
                <h3 className="break-words font-semibold">{entry.title || `New ${singulars[section]}`}</h3>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {relatedFields[section]
                .filter((key) => Object.hasOwn(item, key))
                .map((key) => {
                  const id = `${section}-${index}-${key}`;
                  const FieldIcon = fieldIcons[key] || (key === "name" ? Icon : FileText);
                  const long = longFields.test(key);
                  // Experience dates load as YYYY-MM-DD; keep anything else editable as text.
                  const dateInput = key.endsWith("_date") && /^\d{4}-\d{2}-\d{2}$/.test(item[key] || "");
                  return (
                    <div key={key} className={long ? "sm:col-span-2" : ""}>
                      <label htmlFor={id} className={styles.label}>
                        {relatedFieldLabels[section]?.[key] || extraLabels[key] || labelFor(key)}
                      </label>
                      <div className={cn(styles.inputIcon, "[&>textarea]:mt-0 [&>textarea]:pl-[41px]")}>
                        <FieldIcon size={18} aria-hidden="true" />
                        {long ? (
                          <textarea
                            id={id}
                            rows={3}
                            value={item[key] || ""}
                            onChange={(event) => update(index, key, event.target.value)}
                            className={cn(styles.input, "resize-y")}
                          />
                        ) : (
                          <input
                            id={id}
                            type={dateInput ? "date" : "text"}
                            value={item[key] || ""}
                            onChange={(event) => update(index, key, event.target.value)}
                            className={styles.input}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function ProfileSectionContent({
  section,
  draft,
  setDraft,
  editing,
  email,
  fieldErrors,
  setFieldErrors,
}) {
  if (section === "personal")
    return editing ? (
      <CandidatePersonalDetails
        email={email}
        draft={draft}
        setDraft={setDraft}
        fieldErrors={fieldErrors}
        setFieldErrors={setFieldErrors}
      />
    ) : (
      <PersonalView draft={draft} />
    );

  const items = draft.resumeSections?.[section] || [];
  if (!items.length) return <EmptySection section={section} editing={editing} />;
  const update = (index, key, value) =>
    setDraft((prev) => ({
      ...prev,
      resumeSections: {
        ...prev.resumeSections,
        [section]: prev.resumeSections[section].map((item, i) =>
          i === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  if (editing) return <RelatedEditor section={section} items={items} update={update} />;
  return section === "skills" ? <SkillsView items={items} /> : <TimelineView section={section} items={items} />;
}
