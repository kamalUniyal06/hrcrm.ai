import React from "react";

/**
 * One cell of the record mini-tables used by the deals / offers thread and
 * create pages.
 *
 * Those tables lay their header and rows out on a fixed 8–13 track grid, which
 * cannot fit a phone — at ~25px per track every heading collapses into a
 * vertical stack of letters. Below `lg` the row is rendered as a stacked card
 * instead, and each cell shows its column name inline (the shared header row is
 * hidden there). From `lg` up the labels drop out and the cells fall back into
 * their grid tracks unchanged, so the desktop layout is untouched.
 *
 * Desktop-only track and alignment classes go in `className`, e.g.
 * `"lg:col-span-2 lg:text-center"`.
 */
export default function RecordCell({ label, className = "", children }) {
    return (
        <div
            className={`flex items-center justify-between gap-3 lg:block ${className}`}
        >
            {label && (
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400 lg:hidden">
                    {label}
                </span>
            )}
            {children}
        </div>
    );
}
