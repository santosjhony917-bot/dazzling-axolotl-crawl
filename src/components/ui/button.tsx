import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-[15px] font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 soft-pill", 
  {
    variants: {
      variant: {
        default: "bg-highlight text-white hover:bg-highlight/90 shadow-[0_6px_16px_rgba(223,75,28,0.14)] hover:shadow-[0_8px_20px_rgba(223,75,28,0.18)]",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_14px_rgba(239,68,68,0.22)]",
        outline: "bg-white text-foreground border border-slate-200/80 shadow-none hover:bg-slate-50",
        secondary: "bg-slate-100 text-foreground hover:bg-slate-200",
        ghost: "hover:bg-slate-100 text-foreground",
        link: "text-highlight underline-offset-4 hover:underline",
        highlight: "bg-highlight text-white hover:bg-highlight/90 shadow-[0_6px_16px_rgba(223,75,28,0.14)] hover:shadow-[0_8px_20px_rgba(223,75,28,0.18)]",
        channel: "bg-white text-foreground border border-slate-200/80 shadow-none hover:bg-slate-50",
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
