import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion"; // Importando motion

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft-md",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-soft-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Novo estilo de destaque (Highlight)
        highlight: "bg-highlight text-white hover:bg-highlight/90 shadow-highlight-glow transition-all duration-300 relative overflow-hidden",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
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
    
    // Adicionando animação de hover/tap para todos os botões
    const motionProps = {
      whileHover: { scale: 1.02 },
      whileTap: { scale: 0.98 },
      transition: { type: "spring", stiffness: 400, damping: 17 },
    };

    // Aplicando o efeito de brilho apenas ao variant 'highlight'
    const isHighlight = variant === 'highlight';
    
    return (
      <motion.div {...motionProps} className={cn(isHighlight && "relative")}>
        <Comp
          className={cn(buttonVariants({ variant, size, className }), isHighlight && "relative z-10")}
          ref={ref}
          {...props}
        />
        {/* Adicionando o efeito de brilho visualmente no fundo do botão highlight */}
        {isHighlight && (
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-white/10 animate-shine"
            />
          </div>
        )}
      </motion.div>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };