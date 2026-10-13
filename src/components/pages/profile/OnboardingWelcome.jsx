import {
  ArrowRight,
  Building2,
  GraduationCap,
  Presentation,
  UserRound,
} from "lucide-react";

const onboardingOptions = [
  {
    title: "Organization",
    description:
      "Set up your organization, bring your team together, and manage hiring in one place.",
    icon: <Building2 size={24} aria-hidden="true" />,
  },
  {
    title: "College",
    description:
      "Connect your college with employers and support students through campus placements.",
    icon: <GraduationCap size={24} aria-hidden="true" />,
  },
  {
    title: "Demo Organization",
    description:
      "Explore a sample organization and see how HRCRM works before setting up your own.",
    icon: <Presentation size={24} aria-hidden="true" />,
  },
];

export default function OnboardingWelcome({ onCandidate }) {
  return (
    <section
      aria-labelledby="onboarding-welcome-title"
      className="mx-auto max-w-5xl py-10 sm:py-16"
    >
      <header className="mb-8 max-w-2xl">
        <p className="ob-muted text-sm font-medium">Welcome to HRCRM</p>
        <h1
          id="onboarding-welcome-title"
          className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          How would you like to get started?
        </h1>
        <p className="ob-muted mt-4 text-sm leading-7">
          Find the right space for your team, your college, or your next career
          move. Candidate registration is ready to use today.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {onboardingOptions.map(({ title, description, icon }) => (
          <article key={title} className="ob-surface flex flex-col p-6 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-12 items-center justify-center rounded-xl bg-[var(--ob-soft)] text-[var(--ob-accent)]">
                {icon}
              </span>
              <span className="ob-muted rounded-full border border-[var(--ob-line)] px-3 py-1 text-xs font-medium">
                Coming soon
              </span>
            </div>
            <h2 className="mt-6 text-lg font-semibold">{title}</h2>
            <p className="ob-muted mt-2 text-sm leading-6">{description}</p>
          </article>
        ))}
      </div>

      <div className="ob-surface mt-6 flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ob-soft)] text-[var(--ob-accent)]">
            <UserRound size={24} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Here as a candidate?</h2>
            <p className="ob-muted mt-2 text-sm leading-6">
              Create your profile and share your skills, experience, and resume.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCandidate}
          className="ob-primary shrink-0"
        >
          Continue as a candidate <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
