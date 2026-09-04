import { Loader2 } from "lucide-react";

const IconButton = ({
    icon: Icon,
    label = "",
    onClick,

    // STATES
    loading = false,
    disabled = false,

    // ICON
    iconSize = 18,
    iconClassName = "",
    iconColor = "currentColor",

    // TEXT
    text = "",
    textClassName = "",
    textPosition = "right",
    gap = "gap-2",

    // BUTTON
    size = "md",
    variant = "default",
    rounded = "xl",
    className = "",

    // TOOLTIP
    tooltipPosition = "top",
    showTooltip = true,
    tooltipClassName = "",

    // COUNT / BADGE
    count = null,
    countPosition = "top-right",
    countClassName = "",
    showCount = true,
    maxCount = 99,

    // CUSTOM LOADING
    renderLoading,

    // EXTRA
    children,
    type = "button",
}) => {
    // SIZE CLASSES
    const sizeClasses = {
        xs: "p-1.5 text-xs",
        sm: "p-2 text-sm",
        md: "p-3 text-sm",
        lg: "p-4 text-base",
        xl: "p-5 text-lg",
    };

    // ROUNDED CLASSES
    const roundedClasses = {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        xl: "rounded-xl",
        full: "rounded-full",
    };

    // VARIANT CLASSES
    const variantClasses = {
        default:
            "bg-white text-gray-700 hover:bg-gray-100",

        primary:
            "bg-blue-600 text-white hover:bg-blue-700",

        secondary:
            "bg-gray-200 text-gray-800 hover:bg-gray-300",

        success:
            "bg-green-600 text-white hover:bg-green-700",

        danger:
            "bg-red-600 text-white hover:bg-red-700",

        ghost:
            "bg-transparent hover:bg-gray-100 text-gray-700",

        glass:
            "bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20",
    };

    // TOOLTIP POSITION
    const tooltipPositions = {
        top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
        bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
        left: "right-full mr-2 top-1/2 -translate-y-1/2",
        right: "left-full ml-2 top-1/2 -translate-y-1/2",
    };

    // COUNT POSITION
    const countPositions = {
        "top-right":
            "-top-1 -right-1",

        "top-left":
            "-top-1 -left-1",

        "bottom-right":
            "-bottom-1 -right-1",

        "bottom-left":
            "-bottom-1 -left-1",
    };

    // FORMAT COUNT
    const formattedCount =
        typeof count === "number" &&
            count > maxCount
            ? `${maxCount}+`
            : count;

    return (
        <div className="relative group inline-flex overflow-visible">
            {/* BUTTON */}
            <button
                type={type}
                onClick={onClick}
                disabled={disabled || loading}
                className={`
                    relative
                    flex items-center justify-center
                    transition-all duration-200
                    active:scale-95

                    ${sizeClasses[size]}
                    ${roundedClasses[rounded]}
                    ${variantClasses[variant]}

                    ${disabled || loading
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:scale-105 cursor-pointer"
                    }

                    ${className}
                `}
            >
                {loading ? (
                    renderLoading?.() || (
                        <Loader2
                            className="animate-spin"
                            size={iconSize}
                        />
                    )
                ) : children ? (
                    children
                ) : (
                    <div
                        className={`
                            flex items-center
                            ${gap}
                            ${textPosition === "left"
                                ? "flex-row-reverse"
                                : ""
                            }
                        `}
                    >
                        {Icon && (
                            <Icon
                                size={iconSize}
                                color={iconColor}
                                className={iconClassName}
                            />
                        )}

                        {text && (
                            <span className={textClassName}>
                                {text}
                            </span>
                        )}
                    </div>
                )}
            </button>

            {/* COUNT BADGE */}
            {showCount &&
                count !== null &&
                count !== undefined &&
                count !== 0 && (
                    <span
                        className={`
                            absolute z-40
                            min-w-[18px]
                            h-[18px]
                            px-1
                            flex items-center justify-center
                            rounded-full
                            bg-red-500
                            text-white
                            text-[10px]
                            font-bold
                            shadow-md

                            ${countPositions[countPosition]}
                            ${countClassName}
                        `}
                    >
                        {formattedCount}
                    </span>
                )}

            {/* TOOLTIP */}
            {showTooltip &&
                label &&
                !loading && (
                    <span
                        className={`
                            absolute z-[999999]
                            whitespace-nowrap
                            rounded-lg
                            bg-black
                            text-white
                            text-xs
                            px-2 py-1
                            opacity-0
                            group-hover:opacity-100
                            pointer-events-none
                            transition-all duration-200

                            ${tooltipPositions[tooltipPosition]}
                            ${tooltipClassName}
                        `}
                    >
                        {label}
                    </span>
                )}
        </div>
    );
};

export default IconButton;