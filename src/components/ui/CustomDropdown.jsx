import { Check, ChevronDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react'

function CustomDropdown({
    options = [],
    value,
    onChange,
    placeholder = "Select",
    className = "",
    disabled = false,
    maxHeight = "240px",
    defaultOpen = false,
    outsideClickHandle
}) {
    const [open, setOpen] = useState(defaultOpen);
    const ref = useRef(null);

    const selectedOption = options.find((o) => o.value === value);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
                outsideClickHandle?.()
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div ref={ref} className={`relative min-w-0 ${className}`}>
            <button
                disabled={disabled}
                onClick={() => setOpen((p) => !p)}
                className={`
          w-full flex items-center justify-between gap-2
          px-3 py-2.5 rounded-lg border
          bg-white text-sm text-gray-700
          shadow-sm transition
          hover:border-indigo-400
          focus:outline-none focus:ring-2 focus:ring-indigo-500
          sm:px-4
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
            >
                <span className={`truncate ${selectedOption ? "text-gray-900" : "text-gray-400"}`}>
                    {selectedOption?.label || placeholder}
                </span>

                <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-lg border overflow-hidden">
                    <div
                        style={{ maxHeight }}
                        className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
                    >
                        {options.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                No options available
                            </div>
                        )}

                        {options.map((option) => {
                            const isSelected = option.value === value;

                            return (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                    }}
                                    className={`
                    w-full flex items-center justify-between
                    px-4 py-2 text-sm transition
                    ${isSelected
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-gray-700 hover:bg-gray-100"
                                        }
                  `}
                                >
                                    <span className="truncate">{option.label}</span>

                                    {isSelected && <Check className="w-4 h-4 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomDropdown