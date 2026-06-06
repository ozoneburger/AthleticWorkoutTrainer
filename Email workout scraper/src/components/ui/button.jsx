import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-primary bg-primary px-4 text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary: "border-border bg-secondary px-4 text-secondary-foreground hover:bg-secondary/80",
        ghost: "border-transparent bg-transparent px-3 text-foreground hover:bg-muted",
        danger: "border-destructive bg-destructive px-4 text-destructive-foreground hover:bg-destructive/90",
        icon: "size-11 border-border bg-background p-0 hover:bg-muted"
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3",
        lg: "h-12 px-5",
        icon: "size-11 p-0"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
