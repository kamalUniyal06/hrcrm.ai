import {
  ArrowRight,
  Building2,
  GraduationCap,
  Presentation,
  UserRound,
  Sparkles,
  CheckCircle2,
  MoveUpRight,
} from "lucide-react";

const onboardingOptions = [
  {
    title: "Organization",
    description: "Build your team. Transform your hiring.",
    icon: Building2,
    theme: "blue",
    features: ["Team management", "Hiring workflow"],
  },
  {
    title: "College",
    description: "Connect student talent with opportunity.",
    icon: GraduationCap,
    theme: "green",
    features: ["Student profiles", "Campus placements"],
  },
  {
    title: "Explore HRCRM",
    description: "Experience a smarter way to recruit.",
    icon: Presentation,
    theme: "violet",
    features: ["Demo workspace", "Explore features"],
  },
];

const themeStyles = {
  blue: {
    icon: "bg-blue-50 text-blue-600",
    border: "hover:border-blue-200",
    arrow: "group-hover:bg-blue-600",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-600",
    border: "hover:border-emerald-200",
    arrow: "group-hover:bg-emerald-600",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    border: "hover:border-violet-200",
    arrow: "group-hover:bg-violet-600",
  },
};

export default function OnboardingWelcome({ onCandidate }) {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f7f8fc] px-4 py-4 sm:px-7 lg:px-10 lg:py-2">
      <div className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-7xl flex-col">
        {/* Header */}

        {/* Revolutionary hero */}
        <section className="relative mt-5 shrink-0 overflow-hidden rounded-3xl bg-[#10121b] text-white">
          <div className="pointer-events-none absolute -right-20 -top-32 size-96 rounded-full bg-indigo-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 right-1/3 size-72 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative flex flex-col justify-between gap-7 px-6 py-7 sm:px-9 sm:py-9 md:flex-row md:items-center lg:px-12 lg:py-10">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium tracking-wide text-indigo-200">
                <Sparkles size={14} />
                THE NEXT ERA OF RECRUITMENT
              </span>

              <h1 className="mt-5 text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[48px]">
                Hiring is changing.
                <span className="mt-1 block text-transparent bg-gradient-to-r from-indigo-300 via-blue-300 to-cyan-200 bg-clip-text">
                  Be part of the revolution.
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                One connected workspace. New possibilities for organizations,
                colleges, and ambitious candidates.
              </p>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {["Simpler workflows", "Better connections"].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 text-xs text-slate-300"
                  >
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Animated logo */}
            <div className="flex shrink-0 items-center justify-center py-2 md:mr-5">
              <div className="relative flex size-28 items-center justify-center rounded-[28px] border border-white/15 bg-white/[0.06] shadow-2xl sm:size-36">
                <div className="absolute inset-2 rounded-[22px] border border-dashed border-indigo-300/30 animate-[spin_24s_linear_infinite]" />
                <div className="absolute inset-0 rounded-[28px] bg-indigo-400/10 blur-xl" />
                <img
                  src="/unnamed.jpg"
                  alt="HRCRM"
                  className="relative z-10 size-20 rounded-2xl object-contain transition-transform duration-500 hover:rotate-6 sm:size-24"
                />
                <span className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-xl border border-white/10 bg-[#272938] text-indigo-200 shadow-lg">
                  <Sparkles size={15} />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Workspace choices */}
        <section className="mt-6 shrink-0">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Your journey starts here
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Find your starting point.
              </h2>
            </div>
            <span className="hidden text-xs text-slate-400 sm:block">
              Choose your workspace
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {onboardingOptions.map(
              ({ title, description, icon: Icon, theme, features }) => {
                const style = themeStyles[theme];

                return (
                  <article
                    key={title}
                    className={`group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5
  before:pointer-events-none before:absolute before:inset-0 before:rounded-2xl before:border-2 before:border-indigo-500 before:content-[''] before:[clip-path:inset(0_100%_100%_0)] before:transition-none hover:before:animate-[draw-border_0.8s_ease-out_forwards]
  ${style.border}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`flex size-10 items-center justify-center rounded-xl ${style.icon}`}
                      >
                        <Icon size={21} strokeWidth={1.8} />
                      </span>
                      <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                        Coming soon
                      </span>
                    </div>

                    <h3 className="mt-4 text-base font-semibold text-slate-900">
                      {title}
                    </h3>

                    <p className="mt-1.5 min-h-10 text-xs leading-5 text-slate-500 sm:text-sm">
                      {description}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {features.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-medium text-slate-500">
                        Discover more
                      </span>
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:text-white ${style.arrow}`}
                      >
                        <ArrowRight size={16} />
                      </span>
                    </div>
                  </article>
                );
              },
            )}
          </div>
        </section>

        {/* Candidate CTA */}

        {/* Candidate CTA with Aura Effect */}
        <section className="aura mt-4 rounded-2xl bg-black-200 p-1 text-blue-600">
          <div className="card bg-base-100 text-base-content rounded-xl">
            <div className="card-body flex flex-col justify-between gap-4 !p-4 sm:flex-row sm:items-center sm:!px-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <UserRound size={21} />
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-slate-900 sm:text-base">
                    Your next opportunity starts with you.
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Create your profile and put your skills in the spotlight.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onCandidate}
                className="group inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:w-auto"
              >
                Continue as candidate
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto flex shrink-0 items-center justify-between gap-3 py-4 text-[10px] text-slate-400 sm:text-xs">
          <span>© {new Date().getFullYear()} HRCRM</span>
          <span className="inline-flex items-center gap-1.5">
            Built for what comes next
            <MoveUpRight size={12} />
          </span>
        </footer>
      </div>
    </main>
  );
}
