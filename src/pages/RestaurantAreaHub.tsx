import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, FileText, Loader2, LogIn, Store, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPageUrl, PathKey } from '@/utils/url';
import Header from '@/components/Header';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { AppleIcon } from '@/components/icons/AppleIcon';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { toast } from 'react-hot-toast';
import PhoneShell from '@/components/layout/PhoneShell';
import { FFActionCard, FFIconBadge } from '@/components/filterfood/FilterFoodUI';

interface Option {
  title: string;
  description: string;
  icon: LucideIcon;
  path: PathKey;
}

export default function RestaurantAreaHub() {
  const navigate = useNavigate();
  const [activeOption, setActiveOption] = React.useState<Option | null>(null);

  const options: Option[] = [
    { 
      title: "Fazer Login", 
      description: "Entre para atualizar cardápio, fotos e contatos.", 
      icon: LogIn, 
      path: 'restaurant-login' 
    },
    { 
      title: "Cadastrar Restaurante", 
      description: "Publique seu perfil e comece a aparecer nas buscas.", 
      icon: UserPlus, 
      path: 'restaurant-signup' 
    },
    { 
      title: "Meu restaurante já aparece", 
      description: "Use o código da FilterFood para assumir o perfil.", 
      icon: FileText, 
      path: 'claim-restaurant' 
    },
  ];
  const optionButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const activeOptionIndex = activeOption ? options.findIndex((option) => option.path === activeOption.path) : -1;

  return (
    <PhoneShell shellClassName="relative flex flex-col bg-[var(--ff-surface-warm)] font-sans antialiased">
        
        {/* Unified Header */}
        <Header 
          title={<span className="text-lg font-medium tracking-tight text-[#3C2F2F]">Área do restaurante</span>} 
          leftAction={{ icon: ArrowLeft, onClick: () => navigate(createPageUrl('welcome')) }}
          sticky={false}
        />

        <main className="flex w-full flex-grow flex-col justify-center px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            <div className="flex w-full flex-col items-center justify-center pb-8 text-center">
              <FFIconBadge icon={Store} className="mx-auto mb-3 h-12 w-12" />
              <h1 className="text-[#3C2F2F] tracking-tight text-[22px] font-semibold leading-tight">
                Controle sua presença no <span className="text-highlight">FilterFood</span>
              </h1>
              <p className="text-text-secondary text-sm mt-2 leading-relaxed">
                Edite cardápio, horários, fotos e receba clientes direto pelo WhatsApp.
              </p>
            </div>

            <div className="space-y-4">
              {options.map((option, index) => (
                <FFActionCard
                  key={index}
                  type="button"
                  ref={(element) => {
                    optionButtonRefs.current[index] = element;
                  }}
                  onClick={() => setActiveOption(option)}
                  icon={option.icon}
                  title={option.title}
                  description={option.description}
                  trailing={<ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-[var(--ff-primary)]" />}
                  className="p-5"
                />
              ))}
            </div>
          </motion.div>
        </main>

        {/* Footer */}
        <footer className="w-full py-6">
          <div className="flex justify-center items-center gap-6">
            <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Termos</Link>
            <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Privacidade (LGPD)</Link>
          </div>
        </footer>

        <AnimatePreview
          option={activeOption}
          onClose={() => setActiveOption(null)}
          onForgotPassword={() => navigate(createPageUrl('forgotPassword'))}
          returnFocus={() => {
            if (activeOptionIndex >= 0) {
              optionButtonRefs.current[activeOptionIndex]?.focus();
            }
          }}
        />
    </PhoneShell>
  );
}

function AnimatePreview({
  option,
  onClose,
  onForgotPassword,
  returnFocus,
}: {
  option: Option | null;
  onClose: () => void;
  onForgotPassword: () => void;
  returnFocus: () => void;
}) {
  const navigate = useNavigate();
  const { signInWithMock } = useAuthData();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const initialFocusRef = React.useRef<HTMLButtonElement | null>(null);

  const closePreview = React.useCallback(() => {
    onClose();
    window.setTimeout(returnFocus, 0);
  }, [onClose, returnFocus]);

  React.useEffect(() => {
    setEmail('');
    setPassword('');
    setLastError(null);
    setLoading(false);
  }, [option?.path]);

  React.useEffect(() => {
    if (!option) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => initialFocusRef.current?.focus(), 0);

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [option]);

  if (!option) return null;

  const Icon = option.icon;
  const isLogin = option.path === 'restaurant-login';
  const isSignup = option.path === 'restaurant-signup';

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setLastError(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !password) {
      const msg = 'Informe e-mail e senha para entrar no painel.';
      setLastError(msg);
      toast.error(msg);
      setLoading(false);
      return;
    }

    if (
      cleanEmail.includes('premium') ||
      cleanEmail.includes('free') ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('cliente') ||
      cleanEmail.includes('customer') ||
      cleanEmail.includes('user')
    ) {
      if (signInWithMock) {
        const success = signInWithMock(cleanEmail);
        if (success) {
          toast.success('Login de teste realizado com sucesso!');
          setLoading(false);
          onClose();
          navigate(cleanEmail.includes('admin') ? createPageUrl('adminDashboard') : createPageUrl('home'));
          return;
        }
      }
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) throw error;
      toast.success('Login realizado com sucesso!');
      onClose();
      navigate(createPageUrl('home'));
    } catch (error) {
      const msg = (error as Error).message || 'Ocorreu um erro ao entrar no painel.';
      setLastError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setLastError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + createPageUrl('home'),
        },
      });
      if (error) throw error;
    } catch (error) {
      const msg = (error as Error).message || 'Ocorreu um erro ao fazer login com o provedor social.';
      setLastError(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-slate-950/25 px-4 py-4 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={closePreview}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closePreview();
          return;
        }

        if (event.key !== 'Tab') return;

        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusable = Array.from(focusableElements ?? []).filter((element) => !element.hasAttribute('disabled'));
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="restaurant-area-preview-title"
        aria-describedby="restaurant-area-preview-description"
        initial={{ opacity: 0, y: 32, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={(event) => event.stopPropagation()}
        className="my-auto w-full max-w-sm overflow-hidden rounded-[28px] border border-white/70 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-highlight/10">
              <Icon className="h-5 w-5 text-highlight" />
            </span>
            <div>
              <h2 id="restaurant-area-preview-title" className="text-base font-semibold leading-tight text-[#3C2F2F]">{option.title}</h2>
              <p className="text-xs text-slate-500">Prévia rápida</p>
            </div>
          </div>
          <button
            ref={initialFocusRef}
            type="button"
            onClick={closePreview}
            className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
            aria-label="Fechar prévia"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p id="restaurant-area-preview-description" className="text-sm leading-relaxed text-slate-600">{option.description}</p>

          {isLogin && (
            <form onSubmit={handleLogin} className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <Button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                variant="channel"
                className="h-11 w-full gap-2 rounded-2xl bg-white font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
              >
                <GoogleIcon className="h-5 w-5 shrink-0" />
                Continuar com Google
              </Button>
              <Button
                type="button"
                onClick={() => handleSocialLogin('apple')}
                disabled={loading}
                variant="channel"
                className="h-11 w-full gap-2 rounded-2xl bg-white font-semibold shadow-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
              >
                <AppleIcon className="h-5 w-5 shrink-0 text-black" />
                Continuar com Apple
              </Button>
              <div className="flex items-center gap-3 py-1 text-[11px] uppercase text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                ou
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <Input
                className="h-11 rounded-2xl bg-white focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                placeholder="E-mail do restaurante"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                required
              />
              <Input
                className="h-11 rounded-2xl bg-white focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                placeholder="Senha"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={loading}
                className="block min-h-11 w-full text-right text-xs font-semibold text-highlight transition-colors hover:text-highlight/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
              >
                Esqueceu sua senha?
              </button>
              <Button
                type="submit"
                variant="highlight"
                disabled={loading}
                className="h-11 w-full rounded-2xl font-semibold focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Entrar no painel
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              {lastError && <p className="text-center text-xs font-medium text-red-500">{lastError}</p>}
            </form>
          )}

          {isSignup && (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <Input className="h-11 rounded-2xl bg-white focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2" placeholder="Nome do restaurante" />
              <Input className="h-11 rounded-2xl bg-white focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2" placeholder="WhatsApp comercial" />
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-highlight">
                <span className="rounded-full bg-highlight/10 py-1.5">Perfil</span>
                <span className="rounded-full bg-highlight/10 py-1.5">Cardápio</span>
                <span className="rounded-full bg-highlight/10 py-1.5">Fotos</span>
              </div>
              <Button variant="highlight" className="h-11 w-full rounded-2xl font-semibold focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2">
                Publicar perfil
              </Button>
            </div>
          )}

          {!isLogin && !isSignup && (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4">
              <Input className="h-11 rounded-2xl bg-white uppercase tracking-[0.2em] focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2" placeholder="CÓDIGO FILTERFOOD" />
              <div className="rounded-2xl bg-white p-3 text-sm text-slate-600">
                Ao confirmar, você assume o perfil existente e pode corrigir cardápio, horários e contatos.
              </div>
              <Button variant="highlight" className="h-11 w-full rounded-2xl font-semibold focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2">
                Reivindicar perfil
              </Button>
            </div>
          )}

          <div className="flex justify-center pt-1">
            <Button variant="outline" className="h-11 min-w-[140px] rounded-2xl border-slate-200 font-semibold focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2" onClick={closePreview}>
              Fechar
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
