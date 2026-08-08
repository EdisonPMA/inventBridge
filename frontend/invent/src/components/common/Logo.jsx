/**
 * Brand logo component.
 * Uses the real logo image from assets.
 *
 * Props:
 *   size    — "sm" | "md" | "lg"  (default "md")
 *   variant — "light" | "dark"    (default "light" — dark text, for light backgrounds)
 *             "light" → shows logo + dark text
 *             "dark"  → shows logo + white text (for dark/coloured backgrounds)
 *   showText — boolean (default true)
 *   className — extra classes on the wrapper
 */
import logo from "../../assets/logo.png";

const sizes = {
  sm: { img: "h-7 w-auto", text: "text-lg" },
  md: { img: "h-9 w-auto", text: "text-xl" },
  lg: { img: "h-11 w-auto", text: "text-2xl" },
};

export default function Logo({ size = "md", variant = "light", showText = true, className = "" }) {
  const s = sizes[size] || sizes.md;
  const textColor = variant === "dark" ? "text-white" : "text-slate-900";

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <img
        src={logo}
        alt="InventBridge logo"
        className={`${s.img} object-contain`}
        draggable={false}
      />
      {showText && (
        <span className={`font-bold tracking-tight ${s.text} ${textColor}`}>
          InventBridge
        </span>
      )}
    </span>
  );
}
