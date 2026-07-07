import * as React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type ButtonBaseProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  loading?: boolean;
};

function buttonContent(children: React.ReactNode, Icon?: LucideIcon, loading?: boolean) {
  if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (!Icon && (React.isValidElement(children) || React.Children.count(children) > 1)) return <>{children}</>;

  return (
    <>
      {Icon && <Icon className="h-5 w-5 shrink-0 stroke-[2.35]" />}
      <span className="truncate">{children}</span>
    </>
  );
}

export const FFPrimaryButton = React.forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ className, icon: Icon, loading, disabled, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-[var(--ff-radius-button)] bg-[var(--ff-primary)] px-6 text-[15px] font-bold text-white shadow-[var(--ff-shadow-button)] transition-colors [transition-duration:var(--ff-motion-normal)] hover:bg-[var(--ff-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65',
        className
      )}
      {...props}
    >
      {buttonContent(children, Icon, loading)}
    </motion.button>
  )
);
FFPrimaryButton.displayName = 'FFPrimaryButton';

export const FFSecondaryButton = React.forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ className, icon: Icon, loading, disabled, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-[var(--ff-radius-button)] bg-[var(--ff-surface)] px-6 text-[15px] font-bold text-[var(--ff-text-primary)] shadow-[var(--ff-shadow-card)] transition-colors [transition-duration:var(--ff-motion-normal)] hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65',
        className
      )}
      {...props}
    >
      {buttonContent(children, Icon, loading)}
    </motion.button>
  )
);
FFSecondaryButton.displayName = 'FFSecondaryButton';

export const FFOutlineButton = React.forwardRef<HTMLButtonElement, ButtonBaseProps>(
  ({ className, icon: Icon, loading, disabled, children, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-[var(--ff-radius-button)] border border-[var(--ff-primary)]/30 bg-[var(--ff-surface)] px-6 text-[15px] font-bold text-[var(--ff-primary)] transition-colors [transition-duration:var(--ff-motion-normal)] hover:bg-[rgba(223,75,28,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65',
        className
      )}
      {...props}
    >
      {buttonContent(children, Icon, loading)}
    </motion.button>
  )
);
FFOutlineButton.displayName = 'FFOutlineButton';

export const FFCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-[var(--ff-radius-card)] border border-[var(--ff-border-soft)] bg-[var(--ff-surface)] text-[var(--ff-text-primary)] shadow-[var(--ff-shadow-card)]',
        className
      )}
      {...props}
    />
  )
);
FFCard.displayName = 'FFCard';

type FFActionCardProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
};

export const FFActionCard = React.forwardRef<HTMLButtonElement, FFActionCardProps>(
  ({ className, icon: Icon, title, description, trailing, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      className={cn(
        'group flex w-full items-center gap-4 rounded-[var(--ff-radius-card)] border border-[var(--ff-border-soft)] bg-[var(--ff-surface)] p-4 text-left shadow-[var(--ff-shadow-card)] transition-colors [transition-duration:var(--ff-motion-normal)] hover:border-[var(--ff-primary)]/35 hover:bg-[var(--ff-surface-warm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35 focus-visible:ring-offset-2',
        className
      )}
      {...props}
    >
      <FFIconBadge icon={Icon} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold leading-tight text-[var(--ff-text-primary)]">{title}</span>
        {description && (
          <span className="mt-1 block text-sm font-medium leading-normal text-[var(--ff-text-secondary)]">
            {description}
          </span>
        )}
      </span>
      {trailing}
    </motion.button>
  )
);
FFActionCard.displayName = 'FFActionCard';

type FFTopBarProps = React.HTMLAttributes<HTMLDivElement> & {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

export function FFTopBar({ title, subtitle, left, right, className, ...props }: FFTopBarProps) {
  return (
    <header
      className={cn(
        'flex w-full items-center justify-between gap-3 border-b border-[var(--ff-border-soft)] bg-[var(--ff-surface)]/96 px-5 py-4 backdrop-blur-md',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3">
        {left}
        <div className="min-w-0">
          <div className="truncate text-lg font-semibold leading-tight tracking-tight text-[var(--ff-text-primary)]">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs font-medium text-[var(--ff-text-secondary)]">{subtitle}</div>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}

type FFChipProps = React.HTMLAttributes<HTMLSpanElement> & {
  icon?: LucideIcon;
  tone?: 'brand' | 'tech' | 'neutral';
};

export function FFChip({ className, icon: Icon = Sparkles, tone = 'brand', children, ...props }: FFChipProps) {
  const toneClass =
    tone === 'tech'
      ? 'border-[rgba(20,200,195,0.24)] bg-[rgba(20,200,195,0.08)] text-[#0d7f80]'
      : tone === 'neutral'
        ? 'border-[var(--ff-border-soft)] bg-[var(--ff-surface)] text-[var(--ff-text-secondary)]'
        : 'border-[rgba(223,75,28,0.18)] bg-[var(--ff-surface)] text-[var(--ff-primary)]';

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-2 rounded-[var(--ff-radius-chip)] border px-4 py-2 text-sm font-semibold leading-none shadow-[0_8px_18px_rgba(15,23,42,0.035)]',
        toneClass,
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0 stroke-[2.4]" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

type FFIconBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  icon: LucideIcon;
  tone?: 'brand' | 'tech' | 'success' | 'neutral';
};

export function FFIconBadge({ icon: Icon, tone = 'brand', className, ...props }: FFIconBadgeProps) {
  const toneClass =
    tone === 'tech'
      ? 'bg-[rgba(20,200,195,0.12)] text-[#0d7f80]'
      : tone === 'success'
        ? 'bg-emerald-50 text-emerald-600'
        : tone === 'neutral'
          ? 'bg-slate-100 text-slate-600'
          : 'bg-[rgba(223,75,28,0.09)] text-[var(--ff-primary)]';

  return (
    <span
      className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', toneClass, className)}
      {...props}
    >
      <Icon className="h-5 w-5 stroke-[2.35]" />
    </span>
  );
}

type FFPageContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  shellClassName?: string;
};

export function FFPageContainer({ children, className, shellClassName, ...props }: FFPageContainerProps) {
  return (
    <div
      className={cn(
        'min-h-[100dvh] w-full bg-[var(--ff-background)] text-[var(--ff-text-primary)]',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'app-phone-shell min-h-[100dvh] bg-[var(--ff-surface-warm)] font-["Poppins"]',
          shellClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}

export const FFBottomSheetCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <section
      ref={ref}
      className={cn(
        'rounded-t-[var(--ff-radius-sheet)] border-t border-[var(--ff-border-soft)] bg-[var(--ff-surface-warm)] shadow-[0_-14px_38px_rgba(88,29,11,0.08)]',
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
);
FFBottomSheetCard.displayName = 'FFBottomSheetCard';

export function FFLoadingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center gap-2 text-sm font-semibold text-[var(--ff-primary)]', className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      Carregando
    </div>
  );
}

type FFEmptyStateProps = React.HTMLAttributes<HTMLDivElement> & {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function FFEmptyState({ icon: Icon = Sparkles, title, description, action, className, ...props }: FFEmptyStateProps) {
  return (
    <FFCard className={cn('flex flex-col items-center px-5 py-8 text-center', className)} {...props}>
      <FFIconBadge icon={Icon} tone="tech" className="mb-4" />
      <h3 className="text-lg font-semibold leading-tight text-[var(--ff-text-primary)]">{title}</h3>
      {description && <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--ff-text-secondary)]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </FFCard>
  );
}

type FFSectionTitleProps = React.HTMLAttributes<HTMLDivElement> & {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: 'left' | 'center';
};

export function FFSectionTitle({ eyebrow, title, description, align = 'left', className, ...props }: FFSectionTitleProps) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)} {...props}>
      {eyebrow && <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--ff-primary)]">{eyebrow}</div>}
      <h2 className="text-[clamp(22px,5.8vw,30px)] font-bold leading-tight tracking-tight text-[var(--ff-text-primary)]">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--ff-text-secondary)]">{description}</p>
      )}
    </div>
  );
}
