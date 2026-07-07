import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-[15px] font-semibold transition-all [transition-duration:var(--ff-motion-normal)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 soft-pill", 
  {
    variants: {
      variant: {
        default: "bg-[var(--ff-primary)] text-white shadow-[var(--ff-shadow-button)] hover:bg-[var(--ff-primary-dark)]",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_14px_rgba(239,68,68,0.22)]",
        outline: "bg-white text-[var(--ff-text-primary)] border border-[var(--ff-border-soft)] shadow-none hover:bg-[var(--ff-surface-warm)]",
        secondary: "bg-slate-100 text-foreground hover:bg-slate-200",
        ghost: "hover:bg-slate-100 text-foreground",
        link: "text-[var(--ff-primary)] underline-offset-4 hover:underline",
        highlight: "bg-[var(--ff-primary)] text-white shadow-[var(--ff-shadow-button)] hover:bg-[var(--ff-primary-dark)]",
        channel: "bg-white text-[var(--ff-text-primary)] border border-[var(--ff-border-soft)] shadow-none hover:bg-[var(--ff-surface-warm)]",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-10 px-4 text-sm",
        lg: "h-16 px-10 text-lg",
        icon: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
