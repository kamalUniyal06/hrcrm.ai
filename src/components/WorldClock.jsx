import { Check, ChevronDown, Clock, Clock3, Globe2, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const STORAGE_KEY = "hrcrm-world-clock";

const COUNTRIES = [
  { country: "Australia", flag: "AU", zones: [{ city: "Sydney", zone: "Australia/Sydney" }, { city: "Perth", zone: "Australia/Perth" }] },
  { country: "Brazil", flag: "BR", zones: [{ city: "Sao Paulo", zone: "America/Sao_Paulo" }] },
  { country: "Canada", flag: "CA", zones: [{ city: "Toronto", zone: "America/Toronto" }, { city: "Vancouver", zone: "America/Vancouver" }] },
  { country: "China", flag: "CN", zones: [{ city: "Shanghai", zone: "Asia/Shanghai" }] },
  { country: "France", flag: "FR", zones: [{ city: "Paris", zone: "Europe/Paris" }] },
  { country: "Germany", flag: "DE", zones: [{ city: "Berlin", zone: "Europe/Berlin" }] },
  { country: "India", flag: "IN", zones: [{ city: "Kolkata", zone: "Asia/Kolkata" }] },
  { country: "Japan", flag: "JP", zones: [{ city: "Tokyo", zone: "Asia/Tokyo" }] },
  { country: "New Zealand", flag: "NZ", zones: [{ city: "Auckland", zone: "Pacific/Auckland" }] },
  { country: "Singapore", flag: "SG", zones: [{ city: "Singapore", zone: "Asia/Singapore" }] },
  { country: "South Africa", flag: "ZA", zones: [{ city: "Johannesburg", zone: "Africa/Johannesburg" }] },
  { country: "United Arab Emirates", flag: "AE", zones: [{ city: "Dubai", zone: "Asia/Dubai" }] },
  { country: "United Kingdom", flag: "GB", zones: [{ city: "London", zone: "Europe/London" }] },
  { country: "United States", flag: "US", zones: [{ city: "New York", zone: "America/New_York" }, { city: "Chicago", zone: "America/Chicago" }, { city: "Denver", zone: "America/Denver" }, { city: "Los Angeles", zone: "America/Los_Angeles" }, { city: "Honolulu", zone: "Pacific/Honolulu" }] },
];

const DEFAULT_SELECTION = { country: "India", zone: "Asia/Kolkata" };

function CountryFlag({ code, country, className = "h-3.5 w-5" }) {
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      srcSet={`https://flagcdn.com/w80/${code.toLowerCase()}.png 2x`}
      width="20"
      height="15"
      alt={`${country} flag`}
      className={`${className} shrink-0 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(15,23,42,0.12)]`}
      loading="lazy"
    />
  );
}

function getStoredSelection() {
  if (typeof window === "undefined") return DEFAULT_SELECTION;
  try {
    const selection = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    const country = COUNTRIES.find((item) => item.country === selection?.country);
    return country?.zones.some((item) => item.zone === selection?.zone) ? selection : DEFAULT_SELECTION;
  } catch {
    return DEFAULT_SELECTION;
  }
}

function getOffset(date, timeZone) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" })
    .formatToParts(date)
    .find(({ type }) => type === "timeZoneName")?.value;
  return part?.replace("GMT", "UTC") ?? "UTC";
}

export function WorldClock() {
  const [now, setNow] = useState(() => new Date());
  const [selection, setSelection] = useState(getStoredSelection);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const delay = 1000 - (Date.now() % 1000);
    let interval;
    const alignTimer = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, 1000);
    }, delay);
    return () => {
      window.clearTimeout(alignTimer);
      if (interval) window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  }, [selection]);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((item) => item.country === selection.country) ?? COUNTRIES[6],
    [selection.country],
  );
  const selectedZone = selectedCountry.zones.find((item) => item.zone === selection.zone) ?? selectedCountry.zones[0];
  const time = new Intl.DateTimeFormat("en-US", { timeZone: selectedZone.zone, hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true }).format(now);
  const date = new Intl.DateTimeFormat("en-US", { timeZone: selectedZone.zone, weekday: "short", month: "short", day: "numeric" }).format(now);
  const offset = getOffset(now, selectedZone.zone);

  const handleCountryChange = (countryName) => {
    const country = COUNTRIES.find((item) => item.country === countryName);
    if (country) setSelection({ country: country.country, zone: country.zones[0].zone });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`World clock. ${time} in ${selectedZone.city}, ${selection.country}`}
          className="group flex h-11 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white/95 px-2.5 text-left text-slate-900 shadow-[0_8px_24px_rgba(15,23,42,0.08)] outline-none backdrop-blur-md transition duration-200 hover:border-indigo-200 hover:shadow-[0_10px_28px_rgba(79,70,229,0.12)] focus-visible:ring-2 focus-visible:ring-indigo-500/40 active:scale-[0.98] dark:border-white/10 dark:bg-slate-900/90 dark:text-white"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/25">
            <Clock size={15} strokeWidth={2} />
          </span>
          <span className="min-w-0">
            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
              <time className="text-sm font-bold leading-none tabular-nums" dateTime={now.toISOString()}>{time}</time>
              <span className="hidden text-[10px] font-semibold text-slate-500 sm:inline dark:text-slate-400">{offset}</span>
            </span>
            <span className="mt-1 flex items-center gap-1 text-[10px] font-medium leading-none text-slate-500 dark:text-slate-400">
              <CountryFlag code={selectedCountry.flag} country={selectedCountry.country} />
              <span className="max-w-24 truncate">{selectedZone.city}</span>
              <span className="hidden sm:inline">{date}</span>
            </span>
          </span>
          <ChevronDown size={14} className="ml-0.5 shrink-0 text-slate-400 transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="z-[1000] w-[min(22rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-[0_24px_64px_rgba(15,23,42,0.18)] ring-0 dark:border-white/10 dark:bg-slate-950">
        <div className="bg-slate-950 px-4 py-4 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-300"><Clock3 size={13} /> World clock</p>
              <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{time}</p>
            </div>
            <div className="text-right">
              <CountryFlag code={selectedCountry.flag} country={selectedCountry.country} className="ml-auto h-[21px] w-7" />
              <p className="mt-1 text-xs font-semibold text-slate-200">{selectedZone.city}</p>
              <p className="text-[11px] text-slate-400">{date} · {offset}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200" htmlFor="world-clock-country">Country</label>
            <Select value={selection.country} onValueChange={handleCountryChange}>
              <SelectTrigger id="world-clock-country" className="h-10 w-full border-slate-200 bg-slate-50 px-3 dark:border-white/10 dark:bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" align="end" className="z-[1001] max-h-72 min-w-[var(--radix-select-trigger-width)]">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.country} value={country.country}><CountryFlag code={country.flag} country={country.country} /><span>{country.country}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200" htmlFor="world-clock-zone">Time zone</label>
            <Select value={selectedZone.zone} onValueChange={(zone) => setSelection((current) => ({ ...current, zone }))}>
              <SelectTrigger id="world-clock-zone" className="h-10 w-full border-slate-200 bg-slate-50 px-3 dark:border-white/10 dark:bg-white/5"><SelectValue /></SelectTrigger>
              <SelectContent position="popper" align="end" className="z-[1001] min-w-[var(--radix-select-trigger-width)]">
                {selectedCountry.zones.map((zone) => (
                  <SelectItem key={zone.zone} value={zone.zone}><MapPin size={14} className="text-slate-400" /><span>{zone.city}</span><span className="ml-auto text-xs text-slate-400">{zone.zone.replaceAll("_", " ")}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300">
            <Check size={14} /> Your selection is saved on this device
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
