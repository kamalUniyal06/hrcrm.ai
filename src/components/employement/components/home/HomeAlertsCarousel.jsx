import { createElement, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCheck, ChevronLeft, ChevronRight, Clock3, Pause, Play, ReceiptText, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  useAcknowledgeQuotation,
  useQuotationAcknowledgements,
  useQuotationAdmins,
  useQuotations,
} from "../../../../queries/quotations.queries";
import { acknowledgementsByQuotation, needsAcknowledgement } from "../../../pages/quotations/quotationAcknowledgements";
import { amountOf, formatAmount, quotationPeople } from "../../../pages/quotations/quotationUtils";
import { generalAlerts, hideAlert, indiaMinutes, isWorkingDay, readHiddenAlerts } from "./generalAlerts";

const ROTATE_MS = 7000;
const NAMES_SHOWN = 4;
const TONES = {
  danger: { color: "var(--attendance-absent)", icon: AlertTriangle },
  warning: { color: "var(--attendance-late)", icon: Clock3 },
  quotation: { color: "var(--attendance-late)", icon: ReceiptText },
};
const tint = (color, amount) => `color-mix(in oklab, ${color} ${amount}%, transparent)`;

function readHidden(userId, day) {
  try {
    return readHiddenAlerts(localStorage, userId, day);
  } catch {
    return new Set();
  }
}

const namesLine = (people) =>
  people.slice(0, NAMES_SHOWN).map((person) => person.name).join(", ") + (people.length > NAMES_SHOWN ? ` +${people.length - NAMES_SHOWN} more` : "");

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/**
 * One compact strip on the admin home page for everything that needs attention: quotations
 * other admins raised that this admin hasn't acknowledged, and today's general alerts
 * (see generalAlerts.js). Shows one alert at a time and moves on every few seconds;
 * it pauses on hover or focus, with the pause button, or when the system asks for reduced motion.
 */
export default function HomeAlertsCarousel({ day, holidays, notCheckedIn, waitingLeaves, overdueQuotations }) {
  const navigate = useNavigate();
  const userId = useSelector((state) => state.user.userInfo?.id || "");
  const reducedMotion = usePrefersReducedMotion();
  const [now, setNow] = useState(() => new Date());
  const [hidden, setHidden] = useState(() => ({ day, ids: readHidden(userId, day) }));
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);

  // Quotations waiting for this admin's acknowledgement.
  const quotations = useQuotations();
  const acknowledgements = useQuotationAcknowledgements();
  const admins = useQuotationAdmins();
  const acknowledge = useAcknowledgeQuotation();
  const nameById = useMemo(() => new Map((admins.data || []).map((admin) => [admin.id, admin.name])), [admins.data]);
  const toAcknowledge = useMemo(() => {
    if (!quotations.data || !acknowledgements.data) return [];
    const acks = acknowledgementsByQuotation(acknowledgements.data, nameById);
    return quotations.data.filter((quotation) => needsAcknowledgement(quotation, acks, userId));
  }, [quotations.data, acknowledgements.data, nameById, userId]);

  // Re-check every minute, so the 11:00 AM alert appears without a reload.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const hiddenIds = hidden.day === day ? hidden.ids : readHidden(userId, day);
  const general = useMemo(() => generalAlerts({
    day,
    minutes: indiaMinutes(now),
    workingDay: isWorkingDay(day, holidays),
    notCheckedIn,
    waitingLeaves,
    overdueQuotations,
  }), [day, now, holidays, notCheckedIn, waitingLeaves, overdueQuotations]);

  const hide = (id) => {
    let ids;
    try {
      ids = hideAlert(localStorage, userId, day, id);
    } catch {
      ids = new Set([...hiddenIds, id]);
    }
    setHidden({ day, ids });
  };

  const slides = [
    ...general.filter((alert) => !hiddenIds.has(alert.id)).map((alert) => ({
      id: alert.id,
      tone: alert.tone,
      title: alert.title,
      detail: alert.people.length ? namesLine(alert.people) : alert.detail,
      action: { label: alert.action.label, onClick: () => navigate(alert.action.to) },
      onHide: () => hide(alert.id),
    })),
    ...toAcknowledge.map((quotation) => {
      const { createdBy } = quotationPeople(quotation, nameById);
      const saving = acknowledge.isPending && acknowledge.variables?.id === quotation.id;
      return {
        id: `quotation:${quotation.id}`,
        tone: "quotation",
        title: `Acknowledge quotation: ${quotation.name}`,
        detail: [formatAmount(amountOf(quotation)), quotation.worker_name, createdBy && `raised by ${createdBy}`, quotation.quotation_number].filter(Boolean).join(" · "),
        onOpen: () => navigate(`/quotations?quotation=${quotation.id}`),
        action: {
          label: saving ? "Saving…" : "Acknowledge",
          icon: CheckCheck,
          primary: true,
          busy: saving,
          onClick: () => acknowledge.mutate(quotation, {
            onSuccess: () => toast.success(`Acknowledged ${quotation.quotation_number || quotation.name}.`),
            onError: (error) => toast.error(error.message),
          }),
        },
      };
    }),
  ];
  const count = slides.length;
  const current = count ? index % count : 0;
  const rotating = count > 1 && !paused && !holding && !reducedMotion;

  useEffect(() => {
    if (!rotating) return undefined;
    const timer = setTimeout(() => setIndex((value) => (value + 1) % count), ROTATE_MS);
    return () => clearTimeout(timer);
  }, [rotating, current, count]);

  if (!count) return null;

  const slide = slides[current];
  const tone = TONES[slide.tone] || TONES.warning;
  const step = (by) => setIndex((current + by + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Alerts that need your attention"
      data-tour="home-alerts"
      onMouseEnter={() => setHolding(true)}
      onMouseLeave={() => setHolding(false)}
      onFocus={() => setHolding(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setHolding(false); }}
      className="relative overflow-hidden rounded-2xl border bg-card shadow-sm"
      style={{ borderColor: tint(tone.color, 35) }}
    >
      <div className="flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:gap-3 sm:px-3">
        <div
          key={slide.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${current + 1} of ${count}`}
          aria-live={rotating ? "off" : "polite"}
          className="flex min-w-0 flex-1 items-center gap-3 animate-in fade-in-0 slide-in-from-right-2 duration-300 motion-reduce:animate-none"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ color: tone.color, backgroundColor: tint(tone.color, 12) }}>
            {createElement(tone.icon, { size: 17, "aria-hidden": true })}
          </span>
          {slide.onOpen ? (
            <button type="button" onClick={slide.onOpen} className="min-w-0 flex-1 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="block truncate text-sm font-semibold text-foreground">{slide.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{slide.detail}</span>
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{slide.title}</p>
              <p className="truncate text-xs text-muted-foreground">{slide.detail}</p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 pl-12 sm:pl-0">
          <button
            type="button"
            onClick={slide.action.onClick}
            disabled={slide.action.busy}
            className={cn(
              "inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
              slide.action.primary ? "text-white hover:opacity-90" : "border border-border text-foreground hover:bg-muted",
            )}
            style={slide.action.primary ? { backgroundColor: tone.color } : undefined}
          >
            {slide.action.icon && createElement(slide.action.icon, { size: 13, "aria-hidden": true })}
            {slide.action.label}
            {!slide.action.icon && <ArrowRight size={13} aria-hidden="true" />}
          </button>
          {slide.onHide && (
            <button type="button" onClick={slide.onHide} aria-label={`Hide "${slide.title}" for today`} title="Hide for today" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
              <X size={15} />
            </button>
          )}

          {count > 1 && (
            <div className="ml-1 flex items-center border-l border-border pl-1.5">
              <button type="button" onClick={() => step(-1)} aria-label="Previous alert" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[3.25rem] text-center text-[11px] font-semibold tabular-nums text-muted-foreground" aria-hidden="true">
                {current + 1} / {count}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next alert" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <ChevronRight size={16} />
              </button>
              {!reducedMotion && (
                <button
                  type="button"
                  onClick={() => setPaused((value) => !value)}
                  aria-label={paused ? "Resume rotating alerts" : "Pause rotating alerts"}
                  aria-pressed={paused}
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {rotating && (
        <span
          key={`progress-${slide.id}`}
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.5 animate-in slide-in-from-left-full"
          style={{ width: "100%", backgroundColor: tint(tone.color, 45), animationDuration: `${ROTATE_MS}ms`, animationTimingFunction: "linear" }}
        />
      )}
    </section>
  );
}
