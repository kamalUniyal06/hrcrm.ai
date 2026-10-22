import confetti from "canvas-confetti";

// canvas-confetti only reads hex colours, so theme tokens (hex, oklch or var()) are resolved through a canvas.
function themeColors(names) {
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!context) return undefined;
  const styles = getComputedStyle(document.documentElement);
  const colors = names.map((name) => styles.getPropertyValue(name).trim()).filter(Boolean).map((value) => {
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = "#000";
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
    return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
  });
  return colors.length ? colors : undefined;
}

/** A short confetti burst in the current theme's colours. Skipped for people who prefer reduced motion. */
export function celebrate() {
  const shared = {
    colors: themeColors(["--primary", "--sidebar-primary", "--highlight", "--chart-1", "--chart-2", "--chart-4"]),
    disableForReducedMotion: true,
  };
  void confetti({ ...shared, particleCount: 140, spread: 90, startVelocity: 45, origin: { y: 0.6 } });
  setTimeout(() => {
    void confetti({ ...shared, particleCount: 70, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    void confetti({ ...shared, particleCount: 70, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
  }, 300);
}
