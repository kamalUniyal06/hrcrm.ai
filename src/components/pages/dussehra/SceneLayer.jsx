import { forwardRef } from "react";
import { cn } from "@/lib/utils";

// One full-stage SVG layer in scene pixels (see dussehraScene.js). Things that
// animate get their own layer, so the browser can composite them instead of
// repainting the static artwork underneath every frame.
const SceneLayer = forwardRef(function SceneLayer({ layout, className, children, label, ...props }, ref) {
  return (
    <svg
      ref={ref}
      className={cn("dussehra-layer", className)}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true, focusable: "false" })}
      {...props}
    >
      {children}
    </svg>
  );
});

export default SceneLayer;
