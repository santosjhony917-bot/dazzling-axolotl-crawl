import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, MapPin, Search, Sparkles, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type OnboardingTone = 'search' | 'friends' | 'city';

interface OnboardingScreenProps {
  eyebrow: string;
  title: string;
  description: string;
  backgroundImage: string;
  accentImage?: string;
  callout: string;
  metric: string;
  tone: OnboardingTone;
  direction: number;
  children: React.ReactNode;
}

interface AnimatedPageIndicatorProps {
  count: number;
  currentIndex: number;
}

interface PrimaryCTAButtonProps {
  children: React.ReactNode;
  disabled?: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

const easeOut = [0.16, 1, 0.3, 1] as const;
const easeInOut = [0.45, 0, 0.55, 1] as const;

const toneStyles: Record<OnboardingTone, { accent: string; glow: string; Icon: LucideIcon }> = {
  search: {
    accent: '#df4b1c',
    glow: 'rgba(45, 212, 191, 0.34)',
    Icon: Sparkles,
  },
  friends: {
    accent: '#f15a2a',
    glow: 'rgba(45, 212, 191, 0.3)',
    Icon: Users,
  },
  city: {
    accent: '#c93412',
    glow: 'rgba(45, 212, 191, 0.28)',
    Icon: MapPin,
  },
};

export function TopChip({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="flex items-center gap-2 rounded-full border border-white/25 bg-white/14 px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(91,31,10,0.12)] backdrop-blur-md"
    >
      <Sparkles className="h-4 w-4 fill-white text-white" />
      {label}
    </motion.div>
  );
}

function FloatingBackground({ direction }: { direction: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.92, x: direction * 18 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.72, ease: easeOut }}
        className="absolute left-1/2 top-[13%] h-[410px] w-[410px] -translate-x-1/2 rounded-full border border-white/16"
      />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, scale: 0.96, x: direction * -12 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 0.08, duration: 0.82, ease: easeOut }}
        className="absolute left-1/2 top-[20%] h-[300px] w-[300px] -translate-x-1/2 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="absolute left-[13%] top-[17%] h-20 w-24 opacity-25"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1.4px, transparent 1.6px)',
          backgroundSize: '16px 16px',
        }}
      />
      <motion.div
        aria-hidden="true"
        animate={{ y: [0, -7, 0], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[12%] top-[24%] h-2 w-2 rounded-full bg-white"
      />
      <motion.div
        aria-hidden="true"
        animate={{ y: [0, 8, 0], opacity: [0.12, 0.28, 0.12] }}
        transition={{ duration: 5.4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-[14%] top-[20%] h-1.5 w-1.5 rounded-full bg-white"
      />
      <motion.div
        aria-hidden="true"
        animate={{ x: [0, 10, 0], opacity: [0.14, 0.24, 0.14] }}
        transition={{ duration: 6.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[43%] left-[18%] h-px w-24 bg-white/40"
      />
    </div>
  );
}

function HologramCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className: string;
  delay?: number;
}) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: [0, -7, 0], scale: 1 }}
      transition={{
        opacity: { delay, duration: 0.45, ease: easeOut },
        scale: { delay, duration: 0.45, ease: easeOut },
        y: { delay: delay + 0.3, duration: 4.4, repeat: Infinity, ease: 'easeInOut' },
      }}
      className={`absolute rounded-[22px] border border-white/35 bg-white/12 text-white shadow-[0_0_28px_rgba(255,255,255,0.16)] backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedCharacterStage({
  image,
  direction,
  tone,
}: {
  image: string;
  direction: number;
  tone: OnboardingTone;
}) {
  const style = toneStyles[tone];
  const ToneIcon = style.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: direction * 34, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: direction * -28, y: 12, scale: 0.97 }}
      transition={{ duration: 0.62, ease: easeOut }}
      className="absolute inset-x-0 top-[9%] z-10 flex h-[58%] items-center justify-center px-1"
    >
      <motion.div
        aria-hidden="true"
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute h-[330px] w-[330px] rounded-full blur-3xl"
        style={{ background: style.glow }}
      />
      <motion.div
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[7%] h-[clamp(300px,102vw,444px)] w-[clamp(300px,102vw,444px)] rounded-full border border-white/20"
      />
      <motion.div
        aria-hidden="true"
        animate={{ rotate: -360 }}
        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
        className="absolute top-[18%] h-[clamp(224px,74vw,320px)] w-[clamp(224px,74vw,320px)] rounded-full border border-dashed border-cyan-100/22"
      />

      <HologramCard className="left-[6%] top-[35%] hidden w-24 px-3 py-3 min-[390px]:block" delay={0.18}>
        <div className="mb-2 h-1.5 w-12 rounded-full bg-white/70" />
        <div className="mb-1.5 h-1 w-16 rounded-full bg-white/40" />
        <div className="flex items-center justify-between pt-1">
          <MapPin className="h-4 w-4 text-cyan-100" />
          <span className="text-sm font-bold">$</span>
        </div>
      </HologramCard>

      <HologramCard className="right-[5%] top-[30%] w-[118px] px-3.5 py-3 text-left" delay={0.28}>
        <div className="flex items-start gap-2">
          <ToneIcon className="mt-0.5 h-4 w-4 shrink-0 text-white" />
          <span className="text-[10px] font-semibold leading-snug">Encontrando as melhores opcoes</span>
        </div>
      </HologramCard>

      <motion.div
        aria-hidden="true"
        animate={{ scaleX: [0.92, 1, 0.92], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[6%] h-14 w-[78%] rounded-[50%] border border-cyan-100/55 shadow-[0_0_28px_rgba(165,243,252,0.45)]"
      />
      <motion.span
        aria-hidden="true"
        animate={{ y: [0, -12, 0], x: [0, 8, 0], opacity: [0.3, 0.75, 0.3] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[18%] top-[28%] h-2 w-2 rounded-full bg-cyan-100 shadow-[0_0_18px_rgba(165,243,252,0.9)]"
      />
      <motion.span
        aria-hidden="true"
        animate={{ y: [0, 10, 0], x: [0, -7, 0], opacity: [0.25, 0.62, 0.25] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-[16%] top-[34%] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.8)]"
      />
      <motion.img
        src={image}
        alt=""
        animate={{ y: [0, -10, 0], rotate: [0, -0.6, 0.5, 0] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative z-10 h-full max-h-[520px] w-full object-contain drop-shadow-[0_30px_52px_rgba(91,31,10,0.30)]"
      />
    </motion.div>
  );
}

export function BottomContentCard({
  title,
  description,
  callout,
  metric,
  tone,
  children,
}: {
  title: string;
  description: string;
  callout: string;
  metric: string;
  tone: OnboardingTone;
  children: React.ReactNode;
}) {
  const style = toneStyles[tone];
  const ToneIcon = style.Icon;

  return (
    <motion.section
      initial={{ y: 84, opacity: 0, scale: 0.985 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 34, opacity: 0, scale: 0.99 }}
      transition={{ duration: 0.62, ease: easeOut }}
      className="relative flex min-h-[38%] w-full flex-col items-center rounded-t-[34px] border-t border-white/80 bg-[#FAFAFA] px-7 pb-4 pt-8 text-center shadow-[0_-18px_48px_rgba(88,29,11,0.12)]"
    >
      <div className="absolute left-1/2 top-4 h-2 w-14 -translate-x-1/2 rounded-full" style={{ background: style.accent }} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.13, duration: 0.42, ease: easeOut }}
        className="mb-5 mt-4 flex items-center gap-2 rounded-full border border-orange-100 bg-white px-4 py-2 text-[15px] font-semibold text-[#df4b1c] shadow-[0_8px_18px_rgba(88,29,11,0.05)]"
      >
        <ToneIcon className="h-4 w-4" />
        {callout}
      </motion.div>

      <motion.h1
        initial={{ y: 18, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: easeOut }}
        className="max-w-[360px] text-[clamp(31px,8.4vw,40px)] font-semibold leading-[1.03] text-[#242424]"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.29, duration: 0.5, ease: easeOut }}
        className="mt-4 max-w-[340px] text-[clamp(16px,4.4vw,19px)] font-medium leading-relaxed text-[#6b625d]"
      >
        {description}
      </motion.p>

      <motion.p
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.36, duration: 0.46, ease: easeOut }}
        className="mt-4 max-w-[320px] text-[16px] font-semibold text-[#df4b1c]"
      >
        {metric}
      </motion.p>

      {children}
    </motion.section>
  );
}

export function AnimatedPageIndicator({ count, currentIndex }: AnimatedPageIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: count }).map((_, index) => {
        const isActive = currentIndex === index;
        return (
          <motion.div
            key={index}
            layout
            animate={{
              width: isActive ? 32 : 10,
              opacity: isActive ? 1 : 0.32,
              backgroundColor: isActive ? '#df4b1c' : '#f3b29d',
            }}
            transition={{ duration: 0.32, ease: easeInOut }}
            className="h-2.5 rounded-full"
          />
        );
      })}
    </div>
  );
}

export function PrimaryCTAButton({ children, disabled, isLoading, onClick }: PrimaryCTAButtonProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: disabled ? 1 : 1.015 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className="group flex h-14 min-w-[154px] items-center justify-center gap-3 rounded-full bg-[#df4b1c] px-7 text-[18px] font-semibold text-white shadow-[0_14px_26px_rgba(223,75,28,0.25)] outline-none transition-colors hover:bg-[#bd3f17] disabled:opacity-70"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <>
          <span>{children}</span>
          <ArrowRight className="h-5 w-5 stroke-[2.5] transition-transform duration-200 group-hover:translate-x-0.5" />
        </>
      )}
    </motion.button>
  );
}

export function OnboardingPage({
  eyebrow,
  title,
  description,
  backgroundImage,
  accentImage,
  callout,
  metric,
  tone,
  direction,
  children,
}: OnboardingScreenProps) {
  const heroImage = accentImage || backgroundImage;

  return (
    <div
      className="relative flex h-screen w-full flex-col overflow-hidden bg-gradient-to-b from-[#ff5728] via-[#ef4d1e] to-[#d83e14]"
      style={{ minHeight: '100dvh' }}
    >
      <FloatingBackground direction={direction} />

      <div
        className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5"
        style={{ paddingTop: 'max(1.75rem, env(safe-area-inset-top))' }}
      >
        <TopChip label={eyebrow} />
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5, ease: easeOut }}
          className="font-['Lobster'] text-[28px] leading-none text-white drop-shadow-[0_10px_20px_rgba(88,29,11,0.16)]"
        >
          FilterFood
        </motion.div>
      </div>

      <AnimatedCharacterStage image={heroImage} direction={direction} tone={tone} />

      <div className="relative z-20 mt-auto flex w-full flex-col justify-end">
        <BottomContentCard title={title} description={description} callout={callout} metric={metric} tone={tone}>
          {children}
        </BottomContentCard>
      </div>
    </div>
  );
}

export default OnboardingPage;
