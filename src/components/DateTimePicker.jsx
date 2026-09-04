import { ChevronDown } from "lucide-react";
import React, { useState } from "react";
import { pad, polar, MONTHS, DAY_HDRS } from "../services/dateRangeUtils";
export function DateTimePicker({
    value,
    onChange,
    onClose,
    defaultHour = 0,
    defaultMin = 1,
}) {
    const [step, setStep] = useState("date");
    const [pickingHour, setPickingHour] = useState(true);
    const [navYear, setNavYear] = useState(
        value?.year ?? new Date().getFullYear(),
    );
    const [navMonth, setNavMonth] = useState(
        value?.month ?? new Date().getMonth(),
    );
    const today = new Date();
    const firstDay = new Date(navYear, navMonth, 1).getDay();
    const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();

    const prevMonth = () =>
        navMonth === 0
            ? (setNavMonth(11), setNavYear((y) => y - 1))
            : setNavMonth((m) => m - 1);
    const nextMonth = () =>
        navMonth === 11
            ? (setNavMonth(0), setNavYear((y) => y + 1))
            : setNavMonth((m) => m + 1);

    function selectDay(d) {
        onChange({
            ...value,
            year: navYear,
            month: navMonth,
            day: d,
            hour: value?.hour ?? defaultHour,
            min: value?.min ?? defaultMin,
        });
        setTimeout(() => {
            setStep("time");
            setPickingHour(true);
        }, 120);
    }
    function pickHour(h) {
        onChange({ ...value, hour: h });
        setTimeout(() => setPickingHour(false), 120);
    }
    function pickMin(mv) {
        onChange({ ...value, min: mv });
        setTimeout(() => onClose?.(), 100);
    }

    return (
        <div
            className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Tabs */}
            <div className="flex">
                {[
                    ["date", "📅 Date"],
                    ["time", "🕐 Time"],
                ].map(([s, lbl]) => (
                    <button
                        key={s}
                        onClick={(e) => {
                            e.stopPropagation();
                            setStep(s);
                        }}
                        className={`flex-1 py-2.5 text-xs font-bold tracking-wide transition-all ${step === s
                            ? "bg-blue-700 text-white"
                            : "bg-gray-50 text-gray-400 hover:text-gray-700"
                            }`}
                    >
                        {lbl}
                    </button>
                ))}
            </div>

            {/* ── DATE ── */}
            {step === "date" && (
                <div>
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border-b border-gray-100">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                prevMonth();
                            }}
                            className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-all font-bold flex items-center justify-center text-base"
                        >
                            ‹
                        </button>

                        <div className="flex items-center gap-1.5">
                            {/* Month */}
                            <div className="relative">
                                <select
                                    value={navMonth}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setNavMonth(Number(e.target.value));
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="appearance-none pl-2.5 pr-6 py-1.5 text-xs font-bold border border-gray-200 rounded-lg bg-white text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {MONTHS.map((mo, i) => (
                                        <option key={mo} value={i}>
                                            {mo}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={10}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                />
                            </div>

                            {/* Year */}
                            <div className="relative">
                                <select
                                    value={navYear}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        setNavYear(Number(e.target.value));
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="appearance-none pl-2.5 pr-6 py-1.5 text-xs font-bold border border-gray-200 rounded-lg bg-white text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    {Array.from(
                                        { length: 21 },
                                        (_, i) => new Date().getFullYear() - 10 + i,
                                    ).map((yr) => (
                                        <option key={yr} value={yr}>
                                            {yr}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={10}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                nextMonth();
                            }}
                            className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-blue-700 hover:text-white hover:border-blue-700 transition-all font-bold flex items-center justify-center text-base"
                        >
                            ›
                        </button>
                    </div>

                    <div className="grid grid-cols-7 px-3 pt-2 pb-3">
                        {DAY_HDRS.map((d) => (
                            <div
                                key={d}
                                className="text-[9px] text-center text-gray-400 py-1 font-black tracking-widest"
                            >
                                {d}
                            </div>
                        ))}
                        {Array.from({ length: firstDay }).map((_, i) => (
                            <div key={i} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const d = i + 1;
                            const isToday =
                                d === today.getDate() &&
                                navMonth === today.getMonth() &&
                                navYear === today.getFullYear();
                            const isSel =
                                value?.day === d &&
                                value?.month === navMonth &&
                                value?.year === navYear;
                            return (
                                <button
                                    key={d}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        selectDay(d);
                                    }}
                                    className={`text-[11px] py-1.5 rounded-lg font-medium transition-all ${isSel
                                        ? "bg-blue-700 text-white shadow-sm font-bold"
                                        : isToday
                                            ? "ring-2 ring-blue-400 text-blue-700 font-bold"
                                            : "hover:bg-blue-50 text-gray-700"
                                        }`}
                                >
                                    {d}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── TIME ── */}
            {step === "time" && (
                <div className="p-4 flex flex-col items-center gap-3">
                   <div className="w-52 h-52">
                        <ClockFace
                            hour={value?.hour ?? defaultHour}
                            min={value?.min ?? defaultMin}
                            pickingHour={pickingHour}
                            onPickHour={pickHour}
                            onPickMin={pickMin}
                        />
                    </div>
                    <div className="text-2xl font-black text-gray-800 tracking-tight tabular-nums">
                        {pad(value?.hour ?? defaultHour)}:{pad(value?.min ?? defaultMin)}
                    </div>
                    <div className="flex gap-2">
                        {[
                            ["Hour", true],
                            ["Min", false],
                        ].map(([lbl, isHour]) => (
                            <button
                                key={lbl}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPickingHour(isHour);
                                }}
                                className={`px-5 py-1.5 rounded-xl text-xs font-bold transition-all ${pickingHour === isHour
                                    ? "bg-blue-700 text-white shadow-sm"
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    }`}
                            >
                                {lbl}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function ClockFace({ hour, min, pickingHour, onPickHour, onPickMin }) {
    const cx = 90,
        cy = 90,
        R = 76;
    const items = pickingHour
       ? Array.from({ length: 24 }, (_, i) => {
    const displayHour = i === 0 ? 12 : i > 12 ? i - 12 : i;
    const ang = (displayHour / 12) * 360 - 90;

    // 1–12 on outer ring; 13–23 and 00 on inner ring
    const radius = i >= 1 && i <= 12 ? R - 14 : 38;
    const [x, y] = polar(cx, cy, radius, ang);

    return {
        x,
        y,
        lbl: pad(i),
        sel: hour === i,
        onClick: () => onPickHour(i),
    };
})
        : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((mv, i) => {
            const ang = (i / 12) * 360 - 90;
            const [x, y] = polar(cx, cy, R - 14, ang);
            return {
                x,
                y,
                lbl: pad(mv),
                sel: min === mv,
                onClick: () => onPickMin(mv),
            };
        });

    const selectedHour = hour ?? 0;
const hourDisplay =
    selectedHour === 0
        ? 12
        : selectedHour > 12
            ? selectedHour - 12
            : selectedHour;

const hourRadius =
    selectedHour >= 1 && selectedHour <= 12
        ? R - 14
        : 38;

const [hx, hy] = polar(
    cx,
    cy,
    hourRadius,
    (hourDisplay / 12) * 360 - 90
);
    const [mx, my] = polar(cx, cy, 60, (min / 60) * 360 - 90);

    return (
        <svg viewBox="0 0 180 180" className="w-full h-full">
            <circle
                cx={cx}
                cy={cy}
                r={R}
                fill="#f8fafc"
                stroke="#e2e8f0"
                strokeWidth="1"
            />
            {Array.from({ length: 60 }).map((_, i) => {
                const ang = (i / 60) * 360 - 90;
                const [x1, y1] = polar(cx, cy, i % 5 === 0 ? R - 5 : R - 2.5, ang);
                const [x2, y2] = polar(cx, cy, R - 0.5, ang);
                return (
                    <line
                        key={i}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                        stroke={i % 5 === 0 ? "#cbd5e1" : "#e2e8f0"}
                        strokeWidth={i % 5 === 0 ? "1.5" : "0.8"}
                    />
                );
            })}
            {items.map((it, i) => (
                <g key={i} onClick={it.onClick} style={{ cursor: "pointer" }}>
                    <circle
                        cx={it.x.toFixed(1)}
                        cy={it.y.toFixed(1)}
                        r="13"
                        fill={it.sel ? "#1d4ed8" : "transparent"}
                    />
                    <text
                        x={it.x.toFixed(1)}
                        y={(it.y + 4.5).toFixed(1)}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={it.sel ? "700" : "400"}
                        fill={it.sel ? "#fff" : "#374151"}
                    >
                        {it.lbl}
                    </text>
                </g>
            ))}
            <line
                x1={cx}
                y1={cy}
                x2={hx.toFixed(1)}
                y2={hy.toFixed(1)}
                stroke={pickingHour ? "#1d4ed8" : "#94a3b8"}
                strokeWidth="3"
                strokeLinecap="round"
            />
            <line
                x1={cx}
                y1={cy}
                x2={mx.toFixed(1)}
                y2={my.toFixed(1)}
                stroke={!pickingHour ? "#1d4ed8" : "#94a3b8"}
                strokeWidth="2"
                strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r="5" fill="#1d4ed8" />
            <circle cx={cx} cy={cy} r="2" fill="#fff" />
        </svg>
    );
}