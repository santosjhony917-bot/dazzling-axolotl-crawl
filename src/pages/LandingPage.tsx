import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Database,
  Eye,
  Globe2,
  Heart,
  Layers3,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react';
import { InteractiveAiDemo } from '@/components/landing/InteractiveAiDemo';
import { trackLandingEvent } from '@/lib/landingAnalytics';

const navItems = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Por que é diferente', href: '#diferenca' },
  { label: 'Para restaurantes', href: '#restaurantes' },
  { label: 'Dúvidas', href: '#duvidas' },
];

const faqs = [
  {
    question: 'Onde o FilterFood está disponível?',
    answer:
      'O mapeamento inicial está concentrado em João Pessoa. A cobertura consultável é informada por região dentro do aplicativo e cresce conforme novos cardápios passam por validação e publicação.',
  },
  {
    question: 'A busca é gratuita para quem quer comer?',
    answer:
      'Sim. Você pode experimentar a demonstração da busca sem cadastro. Opções reais só aparecem quando o aplicativo confirma cobertura publicada para a região; salvar escolhas e continuar no aplicativo podem solicitar uma conta.',
  },
  {
    question: 'Os preços e cardápios estão sempre atualizados?',
    answer:
      'O FilterFood organiza informações encontradas nas fontes disponíveis e sinaliza o contexto da resposta. Como restaurantes podem alterar preço, item ou horário, confirme a condição final no canal oficial antes de pedir ou visitar.',
  },
  {
    question: 'O FilterFood faz entrega ou recebe pedidos?',
    answer:
      'Não é uma plataforma de entrega. O FilterFood ajuda você a descobrir, comparar e chegar ao canal oficial do restaurante quando esse contato estiver identificado.',
  },
  {
    question: 'A IA pode errar uma recomendação?',
    answer:
      'Pode. A IA ajuda a organizar a decisão, mas a disponibilidade e as condições finais pertencem ao restaurante. Por isso, a experiência destaca fonte, atualização e contato quando disponíveis.',
  },
  {
    question: 'Como meus dados são tratados?',
    answer:
      'A busca usa o texto informado para gerar a experiência. Para detalhes sobre conta, retenção e direitos do usuário, consulte os Termos e a Política de Privacidade do FilterFood.',
  },
  {
    question: 'Reivindicar um restaurante é gratuito?',
    answer:
      'A reivindicação do perfil pode ser iniciada gratuitamente. O responsável identifica o estabelecimento, comprova o vínculo e passa a revisar as informações liberadas para gestão.',
  },
  {
    question: 'O que o restaurante ganha ao manter o perfil correto?',
    answer:
      'Um perfil claro aumenta a chance de aparecer quando alguém procura exatamente o que o estabelecimento oferece e facilita o contato pelo canal oficial informado.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'FilterFood',
  url: 'https://www.filterfood.com.br/',
  description: 'Demonstração da busca inteligente de pratos, preços, cardápios e restaurantes, com mapeamento inicial em João Pessoa.',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://www.filterfood.com.br/search?q={search_term_string}',
    'query-input': 'required name=search_term_string',
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'FilterFood',
  url: 'https://www.filterfood.com.br/',
  email: 'suporte@filterfood.com.br',
};

function BrandWordmark({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <span
      className={`font-['Lobster'] font-normal leading-none ${compact ? 'text-[30px]' : 'text-[34px]'} ${
        light ? 'text-white' : 'text-[var(--ff-primary)]'
      }`}
    >
      FilterFood
    </span>
  );
}

function SectionEyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <span className={`text-sm font-bold uppercase tracking-[0.13em] ${light ? 'text-[#82F3EE]' : 'text-[var(--ff-primary)]'}`}>
      {children}
    </span>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  const demoInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const openRestaurantArea = (source: string) => {
    trackLandingEvent('restaurant_cta_click', { source, destination: 'restaurant-area-hub' });
    navigate('/restaurant-area-hub');
  };

  const claimRestaurant = (source: string) => {
    trackLandingEvent('restaurant_cta_click', { source, destination: 'claim' });
    navigate('/restaurant-area/claim');
  };

  const scrollToDemo = (source: string) => {
    setMobileMenuOpen(false);
    trackLandingEvent('cta_click', { source, destination: 'demo' });
    document.querySelector('#demo-ia')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    window.setTimeout(() => demoInputRef.current?.focus(), reduceMotion ? 0 : 520);
  };

  const followAnchor = (href: string, label: string) => {
    setMobileMenuOpen(false);
    trackLandingEvent('navigation_click', { label, destination: href });
    document.querySelector(href)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--ff-background)] font-['Poppins'] text-[var(--ff-text-primary)] selection:bg-[var(--ff-primary)] selection:text-white">
      <Helmet>
        <title>FilterFood | A IA dos cardápios</title>
        <meta
          name="description"
          content="Descreva o que quer comer, seu orçamento e a ocasião. Veja como o FilterFood organiza pratos, preços e cardápios disponíveis."
        />
        <link rel="canonical" href="https://www.filterfood.com.br/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:site_name" content="FilterFood" />
        <meta property="og:title" content="FilterFood | A IA dos cardápios" />
        <meta property="og:description" content="Uma pergunta para comparar pratos, preços e restaurantes dentro do seu orçamento." />
        <meta property="og:url" content="https://www.filterfood.com.br/" />
        <meta property="og:image" content="https://www.filterfood.com.br/images/filterfood_welcome_food_hero.png" />
        <meta property="og:image:secure_url" content="https://www.filterfood.com.br/images/filterfood_welcome_food_hero.png" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content="Mesa com pizza, sushi, ramen e massa representando opções de comida no FilterFood" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FilterFood | A IA dos cardápios" />
        <meta name="twitter:description" content="Veja como consultar cardápios disponíveis usando linguagem natural." />
        <meta name="twitter:image" content="https://www.filterfood.com.br/images/filterfood_welcome_food_hero.png" />
        <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[60] -translate-y-24 rounded-full bg-white px-5 py-3 text-sm font-bold text-[var(--ff-primary)] shadow-[var(--ff-shadow-floating)] transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-[var(--ff-primary)]"
      >
        Ir para o conteúdo
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--ff-border-soft)] bg-[var(--ff-background)]/96 shadow-[0_8px_24px_rgba(15,23,42,0.035)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link
            to="/landing"
            className="inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35 focus-visible:ring-offset-4"
            aria-label="Página inicial do FilterFood"
          >
            <BrandWordmark compact />
          </Link>

          <nav className="hidden items-center gap-5 lg:flex" aria-label="Navegação principal">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(event) => {
                  event.preventDefault();
                  followAnchor(item.href, item.label);
                }}
                className="inline-flex min-h-11 items-center rounded-full px-2 text-sm font-semibold text-[#5E6675] transition-colors duration-200 hover:text-[var(--ff-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/30"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={() => scrollToDemo('header')}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--ff-primary)] px-6 text-sm font-bold text-white shadow-[var(--ff-shadow-button)] transition-colors duration-200 hover:bg-[var(--ff-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35 focus-visible:ring-offset-2"
            >
              Encontrar onde comer <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ff-orange-soft)] text-[var(--ff-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35 lg:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              id="landing-mobile-menu"
              initial={reduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="border-t border-[var(--ff-border-soft)] bg-white px-5 py-4 shadow-[var(--ff-shadow-floating)] lg:hidden"
            >
              <nav className="mx-auto flex max-w-lg flex-col gap-1" aria-label="Navegação para celular">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={(event) => {
                      event.preventDefault();
                      followAnchor(item.href, item.label);
                    }}
                    className="flex min-h-12 items-center rounded-2xl px-3 text-base font-semibold text-[#4F5663] hover:bg-[var(--ff-surface-warm)] hover:text-[var(--ff-primary)]"
                  >
                    {item.label}
                  </a>
                ))}
                <button
                  type="button"
                  onClick={() => scrollToDemo('mobile_menu')}
                  className="mt-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--ff-primary)] px-5 font-bold text-white"
                >
                  Encontrar onde comer <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main id="main-content" className="pt-[76px]">
        <section className="relative mx-auto max-w-[1480px] px-0 lg:px-5 lg:pt-5">
          <div className="relative isolate overflow-visible px-5 pb-16 pt-12 text-white sm:px-8 sm:pb-20 sm:pt-16 lg:px-14 lg:py-20">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-[linear-gradient(rgba(91,31,10,0.08),rgba(91,31,10,0.08)),radial-gradient(circle_at_76%_20%,#ff9b56_0%,#ff5a2a_40%,var(--ff-primary)_100%)] lg:rounded-[44px]" aria-hidden="true">
              <div className="absolute right-[-140px] top-[-190px] h-[520px] w-[520px] rounded-full border border-white/12" />
            </div>

            <div className="mx-auto grid max-w-[1340px] items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-10">
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-30 text-center lg:text-left"
              >
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-white/90">
                  <MapPin className="h-4 w-4 text-[#8FF8F3]" aria-hidden="true" /> Mapeamento em João Pessoa
                </div>
                <h1 className="mx-auto mt-6 max-w-[680px] text-balance text-[2.6rem] font-bold leading-[1.04] tracking-[-0.045em] sm:text-[3.7rem] lg:mx-0 lg:text-[4.15rem]">
                  A IA que consulta cardápios disponíveis para a sua fome e o seu bolso.
                </h1>
                <p className="mx-auto mt-6 max-w-xl text-base font-normal leading-7 text-white/92 sm:text-lg sm:leading-8 lg:mx-0">
                  Conte o prato, o bairro, a ocasião e quanto quer gastar. O FilterFood consulta o catálogo publicado e organiza opções para você decidir sem abrir dezenas de cardápios.
                </p>
                <div className="mt-8 flex justify-center lg:justify-start">
                  <button
                    type="button"
                    onClick={() => scrollToDemo('hero')}
                    className="group inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-7 text-base font-bold text-[var(--ff-primary-dark)] shadow-[0_18px_34px_rgba(91,31,10,0.18)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 sm:w-auto"
                  >
                    Encontrar onde comer <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </button>
                </div>
                <p className="mt-4 text-sm font-medium text-white/85">Demonstração ilustrativa sem cadastro.</p>
              </motion.div>

              <div className="relative z-20 mx-auto w-full max-w-[760px]">
                <InteractiveAiDemo reduceMotion={reduceMotion} inputRef={demoInputRef} />
                <div className="pointer-events-none absolute -bottom-16 -right-44 z-10 hidden h-[440px] w-[440px] 2xl:block">
                  <span className="absolute bottom-[2.5%] left-1/2 h-[5.5%] w-[44%] -translate-x-1/2 rounded-[50%] border border-[#67E8E3]/70 bg-[#14c8c3]/15 shadow-[0_0_28px_rgba(20,200,195,0.48)]" aria-hidden="true" />
                  <img
                    src="/images/filterfood_avatar_city_clean.webp"
                    alt="Assistente do FilterFood apresentando a busca"
                    className="relative z-10 h-full w-full object-contain drop-shadow-[0_30px_52px_rgba(91,31,10,0.25)]"
                    style={{
                      WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 88%, rgba(0,0,0,0.72) 95%, transparent 100%)',
                      maskImage: 'linear-gradient(to bottom, #000 0%, #000 88%, rgba(0,0,0,0.72) 95%, transparent 100%)',
                    }}
                    width="1123"
                    height="1434"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-30 mx-5 mt-6 rounded-[24px] border border-[var(--ff-border-soft)] bg-white p-5 lg:mx-auto lg:max-w-6xl lg:p-6">
            <div className="grid grid-cols-3 gap-2 sm:gap-5">
              {[
                ['6.314', 'estabelecimentos mapeados'],
                ['4.611', 'com canal identificado'],
                ['13 jul 2026', 'leitura atualizada'],
              ].map(([value, label]) => (
                <div key={value} className="border-r border-[var(--ff-border-soft)] px-1 text-center last:border-r-0 sm:px-3">
                  <p className="text-lg font-bold leading-tight text-[#252228] sm:text-3xl">{value}</p>
                  <p className="mx-auto mt-2 max-w-xs text-sm font-normal leading-5 text-[var(--ff-text-secondary)]">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-[var(--ff-border-soft)] pt-4 text-center text-sm leading-5 text-[#626A77]">
              Leitura da base interna. <strong>Mapeado não significa cardápio auditado, restaurante ativo ou parceiro.</strong>
            </p>
          </div>
        </section>

        <section id="como-funciona" className="scroll-mt-24 px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="relative mx-auto w-full max-w-[540px] overflow-hidden rounded-[32px] bg-[#E7ECEB] shadow-[var(--ff-shadow-floating)]">
              <img
                src="/images/filterfood_welcome_food_hero.webp"
                alt="Mesa com sushi, pizza, ramen e massa representando a variedade de escolhas"
                className="aspect-[4/3] h-full w-full object-cover sm:aspect-[4/4.6]"
                loading="lazy"
                width="910"
                height="1638"
              />
              <div className="absolute inset-x-5 bottom-5 rounded-[22px] bg-[#252228]/88 p-4 text-white backdrop-blur-md">
                <p className="text-sm font-semibold uppercase tracking-[0.1em] text-[#82F3EE]">Uma pergunta, várias cozinhas</p>
                <p className="mt-1 text-base font-medium">Lanches, regional, japonês, pizza, massas e muito mais.</p>
              </div>
            </div>

            <div>
              <SectionEyebrow>Como funciona</SectionEyebrow>
              <h2 className="mt-4 max-w-3xl text-balance text-3xl font-bold leading-tight tracking-[-0.035em] text-[#252228] sm:text-5xl">
                Da intenção à escolha em três passos claros.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-normal leading-7 text-[var(--ff-text-secondary)] sm:text-lg sm:leading-8">
                O FilterFood não começa pelo nome do restaurante. Começa pelo que você realmente precisa naquele momento.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  [Search, '1. Descreva a situação', 'Prato, orçamento, bairro, número de pessoas ou ocasião.'],
                  [Layers3, '2. Compare com contexto', 'Veja combinações, preços, itens e o estabelecimento em uma mesma resposta.'],
                  [MessageCircle, '3. Confirme no canal oficial', 'Quando disponível, siga para o contato do restaurante e confirme as condições finais.'],
                ].map(([Icon, title, text]) => {
                  const StepIcon = Icon as typeof Search;
                  return (
                    <div key={title as string} className="flex gap-4 rounded-[24px] border border-[var(--ff-border-soft)] bg-white p-5 shadow-[var(--ff-shadow-card)]">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ff-orange-soft)] text-[var(--ff-primary)]">
                        <StepIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-[#252228]">{title as string}</h3>
                        <p className="mt-1.5 text-base font-normal leading-6 text-[var(--ff-text-secondary)]">{text as string}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => scrollToDemo('how_it_works')}
                className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--ff-primary)] px-6 text-sm font-bold text-white shadow-[var(--ff-shadow-button)] transition-colors hover:bg-[var(--ff-primary-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35"
              >
                Encontrar onde comer <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <section id="diferenca" className="scroll-mt-24 bg-[#FFFBF8] px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <SectionEyebrow>Por que é diferente</SectionEyebrow>
              <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-[-0.035em] text-[#252228] sm:text-5xl">
                Não é mais um lugar para abrir cardápios. É uma forma de decidir.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base font-normal leading-7 text-[var(--ff-text-secondary)] sm:text-lg sm:leading-8">
                Cada ferramenta resolve uma parte da jornada. O FilterFood conecta intenção, comparação e contato.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-4 xl:grid-cols-4">
              {[
                [Globe2, 'Busca comum', 'Ajuda a encontrar páginas e nomes para você investigar.'],
                [Store, 'App de entrega', 'Organiza catálogo e pedido dentro da própria plataforma.'],
                [Eye, 'Redes sociais', 'Mostram posts, destaques e a comunicação do estabelecimento.'],
                [Sparkles, 'FilterFood', 'Parte do que você quer, cruza contexto e organiza opções para comparar.'],
              ].map(([Icon, title, text], index) => {
                const ItemIcon = Icon as typeof Search;
                const highlighted = index === 3;
                return (
                  <article
                    key={title as string}
                    className={`rounded-[26px] border p-6 ${
                      highlighted
                        ? 'border-[var(--ff-primary)] bg-[var(--ff-primary)] text-white shadow-[var(--ff-shadow-button)]'
                        : 'border-[var(--ff-border-soft)] bg-white text-[#252228] shadow-[var(--ff-shadow-card)]'
                    }`}
                  >
                    <span className={`flex h-12 w-12 items-center justify-center rounded-full ${highlighted ? 'bg-white/16 text-white' : 'bg-[var(--ff-orange-soft)] text-[var(--ff-primary)]'}`}>
                      <ItemIcon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 text-lg font-bold">{title as string}</h3>
                    <p className={`mt-3 text-base font-normal leading-7 ${highlighted ? 'text-white/90' : 'text-[var(--ff-text-secondary)]'}`}>{text as string}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-[32px] bg-[#3C2F2F] p-7 text-white sm:p-10">
                <SectionEyebrow light>Transparência antes da promessa</SectionEyebrow>
                <h2 className="mt-4 text-balance text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">
                  Uma boa recomendação mostra de onde vem a confiança.
                </h2>
                <p className="mt-5 text-base font-normal leading-7 text-white/78">
                  Nem todo item encontrado está pronto para ser recomendado. O FilterFood separa descoberta, validação e publicação para reduzir respostas enganosas.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  [Database, 'Fonte identificada', 'O cardápio precisa estar ligado a uma origem consultável.'],
                  [Clock3, 'Atualização contextualizada', 'Datas e sinais de revisão ajudam a avaliar a informação.'],
                  [BadgeCheck, 'Contato reconhecido', 'O canal oficial reduz desvios entre a escolha e o restaurante.'],
                ].map(([Icon, title, text]) => {
                  const TrustIcon = Icon as typeof Database;
                  return (
                    <article key={title as string} className="rounded-[28px] border border-[var(--ff-border-soft)] bg-white p-6 shadow-[var(--ff-shadow-card)]">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--ff-tech-soft)] text-[var(--ff-tech-teal-dark)]">
                        <TrustIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="mt-5 text-lg font-bold text-[#252228]">{title as string}</h3>
                      <p className="mt-3 text-base font-normal leading-7 text-[var(--ff-text-secondary)]">{text as string}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="restaurantes" className="scroll-mt-24 px-5 py-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-[#3C2F2F] text-white shadow-[var(--ff-shadow-floating)]">
            <div className="grid items-center gap-10 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1fr_0.9fr] lg:px-14 lg:py-16">
              <div>
                <SectionEyebrow light>Para restaurantes</SectionEyebrow>
                <h2 className="mt-4 max-w-3xl text-balance text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-5xl">
                  Apareça quando alguém procura exatamente o que você vende.
                </h2>
                <p className="mt-5 max-w-2xl text-base font-normal leading-7 text-white/78 sm:text-lg sm:leading-8">
                  Reivindique o estabelecimento, revise cardápio, horário, fotos e canais oficiais. Um perfil completo facilita a descoberta por intenção — não apenas por nome.
                </p>
                <div className="mt-7 rounded-[22px] border border-white/12 bg-white/7 p-5">
                  <p className="font-semibold text-white">Como funciona a reivindicação</p>
                  <ol className="mt-4 grid gap-3 text-sm font-normal leading-6 text-white/78 sm:grid-cols-3">
                    <li><strong className="block text-[#82F3EE]">1. Identifique</strong> Encontre o perfil do estabelecimento.</li>
                    <li><strong className="block text-[#82F3EE]">2. Comprove</strong> Informe o vínculo com o negócio.</li>
                    <li><strong className="block text-[#82F3EE]">3. Revise</strong> Atualize os dados liberados para gestão.</li>
                  </ol>
                </div>
                <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-white/78">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#82F3EE]" aria-hidden="true" />
                  O início da reivindicação é gratuito. Recursos adicionais podem depender das condições apresentadas na área do restaurante.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => claimRestaurant('restaurant_section')}
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[var(--ff-primary)] px-7 font-bold text-white shadow-[var(--ff-shadow-button)] transition-colors hover:bg-[#F05A28] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82F3EE]"
                  >
                    Reivindicar meu restaurante <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openRestaurantArea('restaurant_section')}
                    className="min-h-14 rounded-full border border-white/24 px-7 font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82F3EE]"
                  >
                    Conhecer a área do restaurante
                  </button>
                </div>
              </div>

              <div className="relative mx-auto hidden w-full max-w-[470px] rounded-[30px] bg-[var(--ff-surface-warm)] p-5 text-[var(--ff-text-primary)] sm:block">
                <div className="flex items-center justify-between border-b border-[var(--ff-border-warm)] pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ff-orange-soft)] text-[var(--ff-primary)]"><Store className="h-5 w-5" aria-hidden="true" /></span>
                    <div><p className="font-bold">Seu restaurante</p><p className="mt-0.5 text-sm font-normal text-[var(--ff-text-secondary)]">Perfil no FilterFood</p></div>
                  </div>
                  <span className="rounded-full bg-[var(--ff-success-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--ff-success-dark)]">Identificado</span>
                </div>
                <div className="mt-5 rounded-[24px] border border-[var(--ff-border-warm)] bg-white p-5 shadow-[var(--ff-shadow-card)]">
                  <div className="mb-4 flex items-center gap-3"><BookOpen className="h-5 w-5 text-[var(--ff-primary)]" aria-hidden="true" /><span className="font-semibold">Perfil preparado para busca</span></div>
                  <div className="space-y-3">
                    {[
                      ['Cardápio com fonte', UtensilsCrossed],
                      ['Horários revisados', Clock3],
                      ['Contato reconhecido', MessageCircle],
                    ].map(([text, Icon]) => {
                      const StatusIcon = Icon as typeof Check;
                      return (
                        <div key={text as string} className="flex items-center gap-3 text-base font-normal text-[#555B66]">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ff-tech-soft)] text-[var(--ff-tech-teal-dark)]"><StatusIcon className="h-4 w-4" aria-hidden="true" /></span>
                          {text as string}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-[20px] bg-[var(--ff-tech-soft)] px-4 py-3 text-sm font-semibold text-[var(--ff-tech-teal-dark)]"><Sparkles className="h-4 w-4" aria-hidden="true" /> Pronto para entrar em buscas compatíveis</div>
              </div>
            </div>
          </div>
        </section>

        <section id="duvidas" className="scroll-mt-24 bg-[var(--ff-surface-warm)] px-5 py-20 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <div>
              <SectionEyebrow>Dúvidas frequentes</SectionEyebrow>
              <h2 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.035em] text-[#252228] sm:text-4xl">Confiança também se constrói respondendo o que é difícil.</h2>
              <p className="mt-4 text-base font-normal leading-7 text-[var(--ff-text-secondary)]">Cobertura, atualização, erros da IA, privacidade e relação com o restaurante — sem letras pequenas.</p>
              <Link
                to="/help-center"
                onClick={() => trackLandingEvent('navigation_click', { label: 'Central de Ajuda', destination: '/help-center' })}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full font-bold text-[var(--ff-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/30"
              >
                Visitar Central de Ajuda <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="divide-y divide-[var(--ff-border-warm)] border-y border-[var(--ff-border-warm)]">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div key={faq.question}>
                    <h3>
                      <button
                        type="button"
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex min-h-[76px] w-full items-center justify-between gap-4 py-5 text-left text-base font-semibold text-[#252228] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/30"
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${index}`}
                      >
                        {faq.question}
                        <ChevronDown className={`h-5 w-5 shrink-0 text-[var(--ff-primary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`faq-panel-${index}`}
                          initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={reduceMotion ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="max-w-2xl pb-6 pr-8 text-base font-normal leading-7 text-[var(--ff-text-secondary)]">{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-[30px] border border-[var(--ff-border-soft)] bg-white p-7 text-center shadow-[var(--ff-shadow-card)] sm:p-9 lg:flex-row lg:text-left">
            <div className="flex items-start gap-4">
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--ff-tech-soft)] text-[var(--ff-tech-teal-dark)] sm:flex"><Mail className="h-5 w-5" aria-hidden="true" /></span>
              <div>
                <h2 className="text-2xl font-bold text-[#252228]">Ainda não quer criar uma conta?</h2>
                <p className="mt-2 max-w-2xl text-base font-normal leading-7 text-[var(--ff-text-secondary)]">Envie um e-mail e peça para receber novidades sobre cobertura e expansão. Sem fingir que existe uma inscrição automática.</p>
              </div>
            </div>
            <a
              href="mailto:suporte@filterfood.com.br?subject=Quero%20receber%20novidades%20do%20FilterFood"
              onClick={() => trackLandingEvent('newsletter_intent', { source: 'secondary_conversion', channel: 'email' })}
              className="inline-flex min-h-12 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-[var(--ff-primary)]/25 px-6 font-bold text-[var(--ff-primary)] transition-colors hover:bg-[var(--ff-orange-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/30 sm:w-auto"
            >
              Receber novidades <Mail className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        <section className="bg-[radial-gradient(circle_at_75%_15%,#ff9b56_0%,#ff5a2a_42%,var(--ff-primary)_100%)] px-5 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 text-center lg:flex-row lg:text-left">
            <div>
              <BrandWordmark light />
              <h2 className="mt-4 max-w-3xl text-balance text-3xl font-bold leading-tight tracking-[-0.035em] sm:text-4xl">Diga o que quer comer. A IA organiza o caminho até a escolha.</h2>
              <p className="mt-3 max-w-2xl text-base font-normal leading-7 text-white/88">Faça a primeira pergunta aqui mesmo e continue no aplicativo somente quando fizer sentido.</p>
            </div>
            <button
              type="button"
              onClick={() => scrollToDemo('final_cta')}
              className="group inline-flex min-h-14 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-white px-7 font-bold text-[var(--ff-primary-dark)] shadow-[0_18px_34px_rgba(91,31,10,0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 sm:w-auto"
            >
              Encontrar onde comer <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>

      <footer className="bg-[#3C2F2F] px-5 py-12 text-white/75 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 border-b border-white/12 pb-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <BrandWordmark light compact />
              <p className="mt-5 max-w-sm text-sm font-normal leading-6 text-white/75">Busca inteligente para descobrir pratos e cardápios disponíveis, com mapeamento inicial em João Pessoa.</p>
            </div>
            <div>
              <h2 className="font-semibold text-white">Explore</h2>
              <ul className="mt-2 text-sm font-normal text-white/75">
                <li><button type="button" onClick={() => scrollToDemo('footer')} className="inline-flex min-h-11 items-center hover:text-white">Encontrar onde comer</button></li>
                <li><Link to="/restaurant-area-hub" className="inline-flex min-h-11 items-center hover:text-white">Área do restaurante</Link></li>
                <li><Link to="/restaurant-area/claim" className="inline-flex min-h-11 items-center hover:text-white">Reivindicar perfil</Link></li>
              </ul>
            </div>
            <div>
              <h2 className="font-semibold text-white">Informações</h2>
              <ul className="mt-2 text-sm font-normal text-white/75">
                <li><Link to="/help-center" className="inline-flex min-h-11 items-center hover:text-white">Central de Ajuda</Link></li>
                <li><Link to="/legal" className="inline-flex min-h-11 items-center hover:text-white">Termos e privacidade</Link></li>
                <li><a href="mailto:suporte@filterfood.com.br" className="inline-flex min-h-11 items-center hover:text-white">suporte@filterfood.com.br</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-7 text-sm font-normal text-white/65 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} FilterFood. Todos os direitos reservados.</p>
            <p>Informação organizada para decisões mais simples.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
