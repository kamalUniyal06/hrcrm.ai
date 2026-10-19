import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchScore } from "@/lib/searchScore";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Items carry keywords [label, ...codes]; codes only match exactly.
const filter = (value, search, keywords = []) => searchScore(search, [value, keywords[0]], keywords.slice(1));

// Searchable single select. `options` are { value, label, keywords? }. A value
// that is not in the list (older or imported data) still shows on the trigger,
// so nothing silently disappears. Style the trigger through `className`.
function Combobox({
  id,
  value = "",
  options = [],
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Search",
  emptyText = "No results",
  loading = false,
  disabled = false,
  className,
  ...triggerProps
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const listRef = useRef(null);
  const selected = options.find((option) => option.value === value);
  const shown = loading ? "Loading…" : selected?.label || value;

  // Bring the current choice into view when the list opens.
  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() =>
      listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // Searching starts from the top, where the best match is.
  useLayoutEffect(() => {
    if (search && listRef.current) listRef.current.scrollTop = 0;
  }, [search]);

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); setSearch(""); }}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled || loading}
          className={cn("flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60", className)}
          {...triggerProps}
        >
          <span className={cn("min-w-0 truncate", !shown && "text-muted-foreground")}>{shown || placeholder}</span>
          <ChevronsUpDown size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-60 gap-0 overflow-hidden p-0">
        <Command defaultValue={selected?.value} filter={filter}>
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="h-11 w-full border-b border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List ref={listRef} className="max-h-64 overflow-y-auto overscroll-contain p-1">
            <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</Command.Empty>
            {options.map((option) => (
              <Command.Item
                key={option.value}
                value={option.value}
                keywords={[option.label, ...(option.keywords || [])]}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}
                className="flex min-h-10 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm data-[selected=true]:bg-accent"
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === value && <Check size={16} aria-hidden="true" className="shrink-0 text-primary" />}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox };
