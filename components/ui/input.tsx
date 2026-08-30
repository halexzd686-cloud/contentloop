import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * ContentLoop Input — design.md §15
 * 8px radius, border-first, focus = mint border/ring, error = muted red
 * Label placed above input (not floating)
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-[8px] border border-border bg-workspace px-3 py-1 text-sm text-ink-primary transition-colors duration-150",
        "placeholder:text-ink-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint-500 focus-visible:ring-offset-1 focus-visible:border-mint-600",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-subtle",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
