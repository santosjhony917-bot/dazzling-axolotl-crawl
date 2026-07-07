import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeDollarSign,
  Building2,
  Check,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  Utensils,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';

type SlideTone = 'ai' | 'friends' | 'city';

interface Benefit {
  icon: LucideIcon;
  label: string;
  color: string;
}

interface OnboardingSlide {
  tone: SlideTone;
  topChip: string;
  TopIcon: LucideIcon;
  avatar: string;
  callout: string;
  title: string;
  description: string;
  accentLine?: string;
  cta: string;
  benefits?: Benefit[];
}

const onboardingSlides: OnboardingSlide[] = [
  {
    tone: 'ai',
    topChip: 'IA do FilterFood',
    TopIcon: Sparkles,
    avatar: '/images/filterfood_ai_avatar_search_clean.png',
    callout: 'Busca inteligente',
    title: 'Busque pratos com IA',
    description: 'Diga o que quer comer e encontre opções por preço, bairro e cardápio.',
    accentLine: 'Pratos certos, sem abrir vários links',
    cta: 'Continuar',
  },
  {
    tone: 'friends',
    topChip: 'Com amigos',
    TopIcon: Sparkles,
    avatar: '/images/filterfood_avatar_friends_clean.png',
    callout: 'Com amigos',
    title: 'Crie grupos com seus amigos',
    description: 'Compartilhe opções, vote junto e escolha onde todo mundo quer comer.',
    accentLine: 'Decidam juntos, sem confusão no grupo',
    cta: 'Continuar',
  },
  {
    tone: 'city',
    topChip: 'Cidade inteira',
    TopIcon: MapPin,
    avatar: '/images/filterfood_avatar_city_clean.png',
    callout: 'Cardápios reunidos',
    title: 'Todos os cardápios da cidade em um só app',
    description: 'Compare restaurantes, veja pratos, preços e escolha mais rápido.',
    cta: 'Começar',
    benefits: [
      { icon: Search, label: 'Compare opções', color: 'bg-[#FFE5DE] text-[var(--ff-primary)]' },
      { icon: BadgeDollarSign, label: 'Veja preços e promos', color: 'bg-[#DDF8EE] text-[#0EA582]' },
      { icon: Zap, label: 'Decida mais rápido', color: 'bg-[#FFE9B8] text-[#df8f17]' },
    ],
  },
];

const sceneEase = [0.16, 1, 0.3, 1] as const;

function TopBar({ slide }: { slide: OnboardingSlide }) {
  const Icon = slide.TopIcon;

  return (
    <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-[max(1.35rem,env(safe-area-inset-top))]">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: sceneEase }}
        className="flex items-center gap-2 rounded-full border border-white/25 bg-white/12 px-4 py-2.5 text-[clamp(12px,3.3vw,15px)] font-semibold text-white shadow-[0_12px_26px_rgba(91,31,10,0.12)] backdrop-blur-md"
      >
        <Icon className="h-4 w-4 fill-white/10 text-white" />
        {slide.topChip}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.45, ease: sceneEase }}
        className="font-['Lobster'] text-[clamp(25px,7vw,36px)] leading-none text-white drop-shadow-[0_10px_20px_rgba(88,29,11,0.16)]"
      >
        FilterFood
      </motion.div>
    </div>
  );
}

function IconBubble({ className, Icon, delay = 0 }: { className: string; Icon: LucideIcon; delay?: number }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.82, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: [0, -7, 0] }}
      transition={{
        opacity: { delay, duration: 0.35, ease: sceneEase },
        scale: { delay, duration: 0.35, ease: sceneEase },
        y: { delay: delay + 0.2, duration: 4.5, repeat: Infinity, ease: 'easeInOut' },
      }}
      className={`absolute z-[12] flex h-[clamp(38px,9.5vw,50px)] w-[clamp(38px,9.5vw,50px)] items-center justify-center rounded-full border border-white/24 bg-white/12 text-white shadow-[0_0_16px_rgba(255,255,255,0.10)] backdrop-blur-md ${className}`}
    >
      <Icon className="h-[48%] w-[48%] stroke-[2.2]" />
    </motion.div>
  );
}

function GlassCard({ className, children, delay = 0 }: { className: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0, y: 14, scale: 0.94 }}
      animate={{ opacity: 1, y: [0, -5, 0], scale: 1 }}
      transition={{
        opacity: { delay, duration: 0.38, ease: sceneEase },
        scale: { delay, duration: 0.38, ease: sceneEase },
        y: { delay: delay + 0.2, duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
      }}
      className={`absolute z-[13] rounded-[22px] border border-white/24 bg-white/14 text-white shadow-[0_0_16px_rgba(255,255,255,0.08)] backdrop-blur-md ${className}`}
    >
      {children}
    </motion.div>
  );
}

function BackgroundStage() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_22%,rgba(255,156,74,0.95),rgba(255,74,31,0.96)_42%,rgba(217,55,18,1)_100%)]" />
      <div className="absolute left-1/2 top-[17%] h-[clamp(280px,92vw,470px)] w-[clamp(280px,92vw,470px)] -translate-x-1/2 rounded-full border border-white/10 opacity-55" />
      <div className="absolute left-1/2 top-[25%] h-[clamp(220px,70vw,360px)] w-[clamp(220px,70vw,360px)] -translate-x-1/2 rounded-full border border-white/10 opacity-30" />
      <div
        className="absolute left-[14%] top-[18%] h-20 w-24 opacity-[0.09]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.85) 1.4px, transparent 1.6px)',
          backgroundSize: '16px 16px',
        }}
      />
      <div className="absolute bottom-0 left-1/2 h-24 w-[82%] -translate-x-1/2 rounded-[50%] border border-cyan-100/24 shadow-[0_0_18px_rgba(103,232,249,0.16)]" />
    </div>
  );
}

function SocialDecor() {
  return (
    <>
      <GlassCard className="left-[8%] top-[32%] px-3 py-2 text-[10px] font-semibold leading-snug" delay={0.18}>
        Bora decidir
        <br />
        juntos? :)
      </GlassCard>
      <GlassCard className="right-[4%] top-[72%] w-[76px] px-2 py-1.5" delay={0.28}>
        <div className="flex items-center justify-between gap-1 border-b border-white/35 pb-1.5">
          <span className="text-[9px] font-semibold">Pizza</span>
          <span className="rounded-full bg-cyan-100/80 px-1.5 py-0.5 text-[10px] font-bold text-[#0d7f80]">7</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-1">
          <span className="text-[9px] font-semibold">Sushi</span>
          <span className="rounded-full bg-cyan-100/80 px-1.5 py-0.5 text-[10px] font-bold text-[#0d7f80]">3</span>
        </div>
      </GlassCard>
      <IconBubble className="left-[13%] top-[22%]" Icon={Users} delay={0.1} />
      <motion.div className="absolute left-[18%] top-[45%] z-[14] rounded-full bg-cyan-100 p-2 text-[#0d7f80] shadow-[0_0_16px_rgba(103,232,249,0.55)]">
        <Check className="h-4 w-4" />
      </motion.div>
    </>
  );
}

function AiDecor() {
  return (
    <>
      <IconBubble className="right-[14%] top-[24%]" Icon={Utensils} delay={0.16} />
      <GlassCard className="right-[7%] top-[36%] max-w-[122px] px-3 py-2 text-left text-[10px] font-semibold leading-snug" delay={0.25}>
        <div className="flex items-start gap-2">
          <Search className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Encontrando as melhores opções</span>
        </div>
      </GlassCard>
    </>
  );
}

function CityDecor() {
  return (
    <>
      <div className="absolute inset-x-0 bottom-0 z-0 h-32 bg-[linear-gradient(to_top,rgba(176,47,16,0.58),transparent)]" />
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0, y: 14, scale: 0.95 }}
        animate={{ opacity: 1, y: [0, -4, 0], scale: 1 }}
        transition={{
          opacity: { delay: 0.18, duration: 0.38, ease: sceneEase },
          scale: { delay: 0.18, duration: 0.38, ease: sceneEase },
          y: { delay: 0.38, duration: 4.8, repeat: Infinity, ease: 'easeInOut' },
        }}
        className="absolute left-[6%] top-[28%] z-30 w-[clamp(120px,32%,150px)] rounded-[18px] border border-white/70 bg-[#fffaf6]/95 px-2 py-2 text-left text-[#3C2F2F] shadow-[0_16px_30px_rgba(91,31,10,0.12)] backdrop-blur-sm"
      >
        <div className="mb-1.5 flex items-center justify-between rounded-full bg-white px-2 py-1.5 text-[7.8px] text-slate-500 shadow-[0_4px_10px_rgba(91,31,10,0.04)]">
          <span className="truncate">Buscar restaurante ou prato</span>
          <SlidersHorizontal className="h-3.5 w-3.5 text-[#3C2F2F]" />
        </div>
        {[
          ['Sabor da Praça', 'Comida brasileira • 1,2 km', 'Promo hoje'],
          ['Burger House', 'Hambúrguer • 850 m', 'Combo amigo'],
          ['Cantinho do Sushi', 'Japonesa • 2,1 km', 'Entrega grátis'],
        ].map((row) => (
          <div key={row[0]} className="flex items-center gap-1.5 py-0.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-[#df4b1c]">
              <Utensils className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-[8.3px] font-bold leading-none text-[#3C2F2F]">
                <span className="truncate">{row[0]}</span>
                <Star className="h-2.5 w-2.5 fill-[#f59e0b] text-[#f59e0b]" />
              </div>
              <p className="mt-0.5 truncate text-[7px] text-slate-500">{row[1]}</p>
              <span className="mt-0.5 inline-flex rounded-full bg-emerald-100 px-1.5 py-0.5 text-[6.6px] font-semibold text-emerald-700">{row[2]}</span>
            </div>
          </div>
        ))}
      </motion.div>
      <MapPin className="absolute left-[8%] top-[58%] z-20 h-9 w-9 fill-cyan-200 text-cyan-500 drop-shadow-[0_10px_18px_rgba(15,118,110,0.16)]" />
      <div className="absolute bottom-[8%] left-[14%] right-[14%] z-10 border-t-2 border-dashed border-white/45" />
    </>
  );
}

function HeroStage({ slide, direction }: { slide: OnboardingSlide; direction: number }) {
  const avatarWrapClass =
    slide.tone === 'city'
      ? 'absolute inset-x-0 bottom-[-3%] z-20 flex justify-end px-0'
      : 'absolute inset-x-0 bottom-[-5%] z-20 flex justify-center px-1';
  const avatarClass =
    slide.tone === 'city'
      ? 'h-[clamp(285px,47dvh,470px)] w-[94%] max-w-[440px] -mr-[12%] object-contain drop-shadow-[0_28px_52px_rgba(91,31,10,0.28)]'
      : slide.tone === 'friends'
        ? 'h-[clamp(285px,48dvh,480px)] w-full max-w-[470px] object-contain drop-shadow-[0_28px_52px_rgba(91,31,10,0.28)]'
        : 'h-[clamp(300px,51dvh,520px)] w-full max-w-[520px] object-contain drop-shadow-[0_28px_52px_rgba(91,31,10,0.28)]';

  return (
    <section className="relative min-h-[250px] flex-1 overflow-hidden">
      <BackgroundStage />
      <TopBar slide={slide} />

      {slide.tone === 'ai' && <AiDecor />}
      {slide.tone === 'friends' && <SocialDecor />}
      {slide.tone === 'city' && <CityDecor />}

      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={slide.avatar}
          custom={direction}
          initial={{ opacity: 0, x: direction * 28, scale: 0.96 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: direction * -24, scale: 0.98 }}
          transition={{
            opacity: { duration: 0.28 },
            x: { duration: 0.42, ease: sceneEase },
            scale: { duration: 0.42, ease: sceneEase },
          }}
          className={avatarWrapClass}
        >
          <motion.img
            src={slide.avatar}
            alt=""
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut' }}
            className={avatarClass}
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>

      <motion.div
        aria-hidden="true"
        animate={{ scaleX: [0.92, 1, 0.92], opacity: [0.35, 0.68, 0.35] }}
        transition={{ duration: 3.7, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[1.5%] left-1/2 z-20 h-12 w-[74%] -translate-x-1/2 rounded-[50%] border border-cyan-100/38 shadow-[0_0_18px_rgba(103,232,249,0.28)]"
      />
    </section>
  );
}

function PageDots({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex min-w-[74px] items-center justify-center gap-2">
      {onboardingSlides.map((slide, index) => {
        const active = currentIndex === index;
        return (
          <motion.span
            key={slide.tone}
            layout
            animate={{
              width: active ? 30 : 9,
              backgroundColor: active ? '#df4b1c' : '#f6c2b3',
              opacity: active ? 1 : 0.72,
            }}
            transition={{ duration: 0.28, ease: sceneEase }}
            className="h-2.5 rounded-full"
          />
        );
      })}
    </div>
  );
}

function CardTitle({ slide }: { slide: OnboardingSlide }) {
  if (slide.tone !== 'city') {
    return (
      <h1 className="mx-auto max-w-[360px] text-center text-[clamp(25px,6.4vw,32px)] font-bold leading-[1.1] tracking-tight text-[var(--ff-text-primary)]">
        {slide.title}
      </h1>
    );
  }

  return (
    <h1 className="mx-auto max-w-[370px] text-center text-[clamp(24px,6.1vw,31px)] font-bold leading-[1.12] tracking-tight text-[var(--ff-text-primary)]">
      Todos os
      <br />
      <span className="text-[var(--ff-primary)]">cardápios da cidade</span>
      <br />
      em um só app
    </h1>
  );
}

function BenefitRow({ benefits }: { benefits: Benefit[] }) {
  return (
    <div className="mt-[clamp(0.55rem,1.8dvh,1rem)] flex w-full items-center justify-center gap-2 rounded-[20px] border border-[#F7D9CF] bg-white/75 px-3 py-2 shadow-[0_8px_22px_rgba(88,29,11,0.04)]">
      {benefits.map((benefit) => {
        const Icon = benefit.icon;
        return (
          <div key={benefit.label} className="flex min-w-0 flex-1 items-center gap-2">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${benefit.color}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-left text-[10px] font-medium leading-tight text-[#3C2F2F]">{benefit.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BottomCard({
  slide,
  currentIndex,
  isCompleting,
  onSkip,
  onNext,
}: {
  slide: OnboardingSlide;
  currentIndex: number;
  isCompleting: boolean;
  onSkip: () => void;
  onNext: () => void;
}) {
  return (
    <motion.section
      key={`${slide.tone}-card`}
      initial={{ y: 42, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.48, ease: sceneEase }}
      className="relative z-20 mx-auto -mt-[clamp(6px,1.5dvh,16px)] flex w-full flex-[0_0_clamp(252px,32dvh,318px)] flex-col rounded-t-[32px] bg-[#FFFBF8] px-[clamp(1.25rem,6vw,2rem)] pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-[clamp(0.85rem,2.4dvh,1.35rem)] text-center shadow-[0_-18px_46px_rgba(88,29,11,0.12)]"
    >
      <div className="mx-auto mb-[clamp(0.55rem,1.5dvh,1rem)] h-1.5 w-14 rounded-full bg-[#df4b1c]" />

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0">
          {slide.tone === 'city' ? (
            <div className="mx-auto mb-[clamp(0.45rem,1.3dvh,0.85rem)] flex h-[clamp(38px,6dvh,50px)] w-[clamp(38px,6dvh,50px)] items-center justify-center rounded-full border border-[#FFE0D7] bg-white text-[#df4b1c] shadow-[0_10px_22px_rgba(223,75,28,0.08)]">
              <Building2 className="h-[52%] w-[52%]" />
            </div>
          ) : (
            <div className="mx-auto mb-[clamp(0.65rem,1.6dvh,1rem)] flex w-fit items-center gap-2 rounded-full border border-[#F7D9CF] bg-white px-4 py-1.5 text-[clamp(12px,3.2vw,14px)] font-semibold text-[#df4b1c] shadow-[0_8px_18px_rgba(88,29,11,0.05)]">
              <Sparkles className="h-4 w-4 fill-[#df4b1c]/10" />
              {slide.callout}
            </div>
          )}

          <CardTitle slide={slide} />

          <p className="mx-auto mt-[clamp(0.55rem,1.6dvh,0.9rem)] max-w-[350px] text-center text-[clamp(13.5px,3.45vw,16px)] font-medium leading-relaxed text-[#6B7280]">
            {slide.description}
          </p>

          {slide.benefits ? (
            <BenefitRow benefits={slide.benefits} />
          ) : (
            <p className="mx-auto mt-[clamp(0.55rem,1.5dvh,0.85rem)] max-w-[330px] text-[clamp(12.5px,3.25vw,15px)] font-semibold text-[#df4b1c]">
              {slide.accentLine}
            </p>
          )}
        </div>

        <div className="mt-auto flex w-full items-center justify-between gap-3 pt-[clamp(0.65rem,2dvh,1.2rem)]">
          <button
            type="button"
            onClick={onSkip}
            disabled={isCompleting}
            className="h-11 shrink-0 rounded-full px-1 text-[clamp(13.5px,3.5vw,16px)] font-semibold text-slate-500 outline-none transition-colors hover:text-[#3C2F2F] focus-visible:ring-2 focus-visible:ring-[#df4b1c]/35 disabled:cursor-wait disabled:opacity-70"
            aria-label="Pular onboarding"
          >
            Pular
          </button>

          <PageDots currentIndex={currentIndex} />

          <motion.button
            type="button"
            onClick={onNext}
            disabled={isCompleting}
            whileTap={{ scale: 0.96 }}
            className="flex h-12 min-w-[clamp(120px,32vw,148px)] items-center justify-center gap-2 rounded-full bg-[#df4b1c] px-5 text-[clamp(14px,3.55vw,16px)] font-semibold text-white shadow-[0_14px_26px_rgba(223,75,28,0.24)] outline-none transition-colors hover:bg-[#bd3f17] focus-visible:ring-2 focus-visible:ring-[#df4b1c]/35 disabled:cursor-wait disabled:opacity-75"
            aria-label={slide.cta}
          >
            {isCompleting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>{slide.cta}</span>
                <ArrowRight className="h-5 w-5 stroke-[2.5]" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
}

export default function Onboarding() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isCompleting, setIsCompleting] = useState(false);
  const navigate = useNavigate();

  const completeOnboarding = async () => {
    if (isCompleting) return;

    setIsCompleting(true);
    localStorage.setItem('filterfood_onboarding_completed', 'true');

    try {
      await base44.auth.updateMe({ onboarding_completed: true });
      navigate(createPageUrl('welcome'), { replace: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      showError('Falha ao concluir o onboarding. Por favor, tente novamente.');
      navigate(createPageUrl('welcome'), { replace: true });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNext = () => {
    if (currentScreen < onboardingSlides.length - 1) {
      setDirection(1);
      setCurrentScreen((prev) => prev + 1);
      return;
    }

    completeOnboarding();
  };

  const slide = onboardingSlides[currentScreen];

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#f1f5f9] font-['Poppins']">
      <section
        className="app-phone-shell relative flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden border-x border-slate-200/60 bg-[#ff4a1f]"
        aria-label={`Onboarding FilterFood: ${slide.topChip}`}
      >
        <HeroStage slide={slide} direction={direction} />
        <BottomCard
          slide={slide}
          currentIndex={currentScreen}
          isCompleting={isCompleting}
          onSkip={completeOnboarding}
          onNext={handleNext}
        />
      </section>
    </main>
  );
}
