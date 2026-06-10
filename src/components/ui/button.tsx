import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-[16px] font-bold transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 soft-pill", 
  {
    variants: {
      variant: {
        default: "bg-[#EF2A39] text-white hover:bg-[#D9202E] shadow-[0_10px_40px_rgba(239,42,57,0.3)]",
        destructive: "bg-red-500 text-white hover:bg-red-600 shadow-[0_10px_40px_rgba(239,42,57,0.3)]",
        outline: "bg-white text-[#3C2F2F] border-none shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:bg-gray-50",
        secondary: "bg-gray-100 text-[#3C2F2F] hover:bg-gray-200",
        ghost: "hover:bg-gray-100 text-[#3C2F2F]",
        link: "text-[#EF2A39] underline-offset-4 hover:underline",
        highlight: "bg-[#EF2A39] text-white hover:bg-[#D9202E] shadow-[0_10px_40px_rgba(239,42,57,0.3)]",
        channel: "bg-white text-[#EF2A39] shadow-[0_10px_40px_rgba(0,0,0,0.06)] hover:bg-gray-50",
      },
      size: {
        default: "h-14 px-8",
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