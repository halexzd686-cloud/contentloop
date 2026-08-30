import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * ContentLoop Badge / Status Chip — design.md §16
 * Lightweight pill for status display
 * Color rules: New/Draft → gray, Selected/Active → mint, Review → amber,
 *              Overdue → muted red, Published → mint/dark
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-150",
  {
    variants: {
      variant: {
        default:
          "bg-surface-subtle text-ink-secondary",
        mint:
          "bg-mint-100 text-mint-600",
        warning:
          "bg-warning/10 text-warning",
        danger:
          "bg-danger/10 text-danger",
        outline:
          "border border-border text-ink-secondary",
        success:
          "bg-mint-600 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
