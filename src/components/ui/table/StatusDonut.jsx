import { VictoryPie } from "victory";

function StatusDonut({
    label,
    value = 0,
    total = 100,
    color = "#2563eb",
    icon: Icon,
    active,
    amount,
    showAmount,
    onClick,
}) {
    // ✅ Handle edge cases
    const isZero = value === 0 || total === 0;

    // ✅ Safe data for VictoryPie
    const chartData = isZero
        ? [{ x: "empty", y: 1 }] // full gray ring
        : [
            { x: "value", y: value },
            { x: "rest", y: Math.max(total - value, 0) },
        ];

    return (
        <button
            onClick={onClick}
            style={{
                backgroundColor: active ? `${color}15` : "transparent",
            }}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition cursor-pointer bg-white
      ${active ? "shadow-md" : "hover:bg-gray-50"}`}
        >
            {/* Amount */}
            {showAmount && (
                <div className="flex items-center justify-center gap-2">
                    <p className="text-sm font-medium text-gray-700">${amount}</p>
                </div>
            )}

            {/* Donut */}
            <div className="relative w-20 h-20">
                <VictoryPie
                    data={chartData}
                    innerRadius={100} // ✅ FIXED (was too large before)
                    cornerRadius={2}
                    startAngle={-90}
                    endAngle={270}
                    padAngle={2}
                    colorScale={
                        isZero ? ["#e5e7eb"] : [color, "#e5e7eb"]
                    }
                    labels={() => null}
                    animate={{ duration: 700 }}
                />

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-md font-semibold text-gray-900">
                        {value}
                    </span>
                </div>
            </div>

            {/* Label */}
            <div className="flex items-center justify-center gap-2">
                {Icon && <Icon className="w-4 h-4 text-gray-500" />}
                <p className="text-sm font-medium text-gray-700">{label}</p>
            </div>
        </button>
    );
}

export default StatusDonut;