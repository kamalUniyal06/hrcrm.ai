import { cn } from "@/lib/utils";
import { onboardingStyles as styles } from "./onboardingStyles";
import {
  ArrowRight,
  Building2,
  Check,
  GraduationCap,
  Presentation,
  Sparkles,
  UserRound,
} from "lucide-react";

const workspaceTones = {
  blue: "bg-linear-to-r from-card to-[var(--employee-blue-soft)] [&>span]:border-[var(--employee-blue)]/20 [&>span]:bg-[var(--employee-blue-soft)] [&>span]:text-[var(--employee-blue)]",
  green: "bg-linear-to-r from-card to-[var(--employee-green-soft)] [&>span]:border-[var(--employee-green)]/20 [&>span]:bg-[var(--employee-green-soft)] [&>span]:text-[var(--employee-green)]",
  amber: "bg-linear-to-r from-card to-[var(--leave-yellow-soft)] [&>span]:border-[var(--employee-orange)]/20 [&>span]:bg-[var(--leave-yellow-soft)] [&>span]:text-[var(--employee-orange)]",
};

const onboardingOptions = [
  {
    title: "Organization",
    description: "Bring your team together and manage hiring in one place.",
    icon: Building2,
    tone: "blue",
  },
  {
    title: "College",
    description: "Connect students with employers and campus placements.",
    icon: GraduationCap,
    tone: "green",
  },
  {
    title: "Demo Organization",
    description: "Explore a sample workspace before setting up your own.",
    icon: Presentation,
    tone: "amber",
  },
];

export default function OnboardingWelcome({ onCandidate }) {
  return (
    <section aria-labelledby="onboarding-welcome-title" className="mx-auto max-w-[1120px] pt-8 pb-4 lg:pt-16">
      <header className="mb-8">
        <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" /> Welcome to HRCRM</p>
        <h1 id="onboarding-welcome-title" className={styles.display}>
          How would you like<br className="hidden sm:block" /> to <span>get started?</span>
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-base leading-7">
          Your next opportunity, your team, your campus. Find your place and make your next move.
        </p>
      </header>
      <div className="grid grid-cols-1 items-stretch gap-7 md:grid-cols-[1.05fr_1fr] md:gap-6">
        <article className="relative flex flex-col overflow-hidden rounded-3xl border border-primary/25 bg-linear-to-br from-card to-accent p-5 shadow-sm min-[400px]:p-6 md:p-[30px]">
          <div className="flex items-center justify-between gap-3">
            <span className={cn(styles.icon, `size-14 border-transparent bg-primary text-primary-foreground`)}><UserRound size={27} aria-hidden="true" /></span>
            <span className={cn(styles.status, `border-[var(--employee-green)]/25 bg-[var(--employee-green-soft)] text-[var(--employee-green)] max-[399px]:text-[10px]`)}><Check size={13} aria-hidden="true" /> Ready to get started</span>
          </div>
          <div className="mt-7 [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:leading-tight [&>h2]:tracking-tight lg:[&>h2]:text-3xl">
            <p className="mb-2 text-xs font-medium text-primary">For your next career move</p>
            <h2>Here as a candidate?</h2>
            <p className="text-muted-foreground mt-3 max-w-md text-sm leading-6">
              Create a profile that brings your skills, experience, and ambitions together. Let our recruitment team get to know you.
            </p>
          </div>
          <ul className="my-6 grid gap-2.5 text-[13px] leading-normal text-muted-foreground [&>li]:flex [&>li]:items-center [&>li]:gap-2 [&_svg]:shrink-0 [&_svg]:text-primary">
            <li><Check size={16} aria-hidden="true" /> Start with your resume or build from scratch</li>
            <li><Check size={16} aria-hidden="true" /> Review your details before you finish</li>
          </ul>
          <button type="button" onClick={onCandidate} className={cn(styles.primary, `mt-auto min-h-12 w-full [&>svg]:ml-auto`)}>
            Continue as a candidate <ArrowRight size={18} aria-hidden="true" />
          </button>
        </article>
        <div className="flex flex-col gap-3">
          <h2 className="mt-0.5 mb-0.5 ml-0.5 text-[13px] font-semibold text-muted-foreground">A space for every journey</h2>
          {onboardingOptions.map(({ title, description, icon, tone }) => {
            const Icon = icon;
            return (
              <article key={title} className={`flex flex-1 items-start gap-3 rounded-[20px] border border-border p-4 min-[400px]:gap-4 min-[400px]:p-[18px] md:p-[21px] ${workspaceTones[tone]}`}>
                <span className={styles.icon}><Icon size={23} aria-hidden="true" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 md:flex-nowrap [&>h3]:text-base [&>h3]:font-semibold [&>h3]:leading-normal">
                    <h3>{title}</h3>
                    <span className={styles.status}>Coming soon</span>
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">{description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
