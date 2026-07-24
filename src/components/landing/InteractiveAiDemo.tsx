import { useEffect, useMemo, useState, type FormEvent, type RefObject } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bot, Check, SendHorizontal, Sparkles, Store } from 'lucide-react';
import { trackLandingEvent } from '@/lib/landingAnalytics';

type DemoCombo = {
  restaurant: string;
  name: string;
  items: string;
  price: string;
};

type DemoScenario = {
  id: string;
  prompt: string;
  answer: string;
  combos: DemoCombo[];
  triggers: string[];
};

const scenarios: DemoScenario[] = [
  {
    id: 'lanche-casal',
    prompt: 'Quero lanchar com minha esposa e gastar até R$ 100',
    answer: 'Separei duas combinações para o casal sem ultrapassar R$ 100.',
    triggers: ['lanche', 'hamburg', 'casal', 'esposa', 'sanduiche'],
    combos: [
      {
        restaurant: 'Hamburgueria — exemplo',
        name: 'Combo casal',
        items: '2 sanduíches + batata + 2 bebidas',
        price: 'R$ 94',
      },
      {
        restaurant: 'Lanchonete — exemplo',
        name: 'Lanche para dois',
        items: '2 tapiocas + sucos + sobremesa',
        price: 'R$ 88',
      },
    ],
  },
  {
    id: 'jantar-japones',
    prompt: 'Jantar japonês para duas pessoas até R$ 120',
    answer: 'Encontrei exemplos japoneses para duas pessoas dentro do limite informado.',
    triggers: ['japones', 'sushi', 'temaki', 'yakisoba', 'combinado'],
    combos: [
      {
        restaurant: 'Restaurante japonês — exemplo',
        name: 'Combinado para dois',
        items: '28 peças + 2 bebidas',
        price: 'R$ 112',
      },
      {
        restaurant: 'Cozinha oriental — exemplo',
        name: 'Yakisoba compartilhado',
        items: 'Yakisoba grande + 2 entradas',
        price: 'R$ 98',
      },
    ],
  },
  {
    id: 'pizza-amigos',
    prompt: 'Pizza para quatro amigos gastando até R$ 150',
    answer: 'Organizei duas opções de pizza para quatro pessoas sem passar de R$ 150.',
    triggers: ['pizza', 'quatro', 'amigos', 'pizzaria'],
    combos: [
      {
        restaurant: 'Pizzaria — exemplo',
        name: 'Pizza família',
        items: 'Pizza grande + refrigerante de 2 L',
        price: 'R$ 126',
      },
      {
        restaurant: 'Forneria — exemplo',
        name: 'Duas pizzas médias',
        items: '2 sabores + 4 bebidas',
        price: 'R$ 148',
      },
    ],
  },
];

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function resolveScenario(prompt: string): DemoScenario {
  const normalizedPrompt = normalize(prompt);
  const matched = scenarios.find((scenario) =>
    scenario.triggers.some((trigger) => normalizedPrompt.includes(trigger)),
  );

  if (matched) return { ...matched, prompt };

  return {
    id: 'busca-personalizada',
    prompt,
    answer:
      'Entendi a intenção. Nesta demonstração, mostro como a resposta seria organizada; no aplicativo, a busca consulta a base disponível.',
    triggers: [],
    combos: [
      {
        restaurant: 'Restaurante próximo — exemplo',
        name: 'Opção compatível',
        items: 'Itens, preço, distância e canal oficial',
        price: 'Sob consulta',
      },
      {
        restaurant: 'Outra alternativa — exemplo',
        name: 'Opção para comparar',
        items: 'Cardápio, horário e contato identificado',
        price: 'Sob consulta',
      },
    ],
  };
}

type InteractiveAiDemoProps = {
  reduceMotion: boolean | null;
  inputRef: RefObject<HTMLInputElement | null>;
};

export function InteractiveAiDemo({ reduceMotion, inputRef }: InteractiveAiDemoProps) {
  const [input, setInput] = useState('');
  const [scenario, setScenario] = useState<DemoScenario>(scenarios[0]);
  const [isThinking, setIsThinking] = useState(false);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (!isThinking || reduceMotion) return;
    const timer = window.setTimeout(() => setIsThinking(false), 520);
    return () => window.clearTimeout(timer);
  }, [isThinking, reduceMotion, runId]);

  const visibleScenario = useMemo(() => scenario, [scenario]);

  const runDemo = (prompt: string, source: 'suggestion' | 'input') => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    const nextScenario = resolveScenario(cleanPrompt);
    setInput('');
    setScenario(nextScenario);
    setRunId((current) => current + 1);
    setIsThinking(!reduceMotion);
    trackLandingEvent(source === 'suggestion' ? 'demo_suggestion' : 'demo_submit', {
      scenario: nextScenario.id,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    runDemo(input, 'input');
  };

  return (
    <div id="demo-ia" className="relative z-20 w-full max-w-[580px] scroll-mt-28">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden rounded-[var(--ff-radius-sheet)] border border-white/80 bg-white text-[var(--ff-text-primary)] shadow-[var(--ff-shadow-hero)]"
      >
        <div className="flex items-center border-b border-[var(--ff-border-warm)] bg-white px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--ff-primary)] text-white shadow-[var(--ff-shadow-button)]">
              <Bot className="h-5 w-5" aria-hidden="true" />
              <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-[var(--ff-tech-teal)]" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-bold leading-tight">IA do FilterFood</p>
              <p className="mt-0.5 text-sm font-medium text-[var(--ff-tech-teal-dark)]">Demonstração sem cadastro</p>
            </div>
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,var(--ff-surface-warm)_0%,#fff_100%)] p-4" aria-live="polite" aria-busy={isThinking}>
          <div className="flex justify-end">
            <motion.div
              key={`user-${runId}`}
              initial={reduceMotion ? false : { opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22 }}
              className="max-w-[92%] rounded-[18px] rounded-br-md bg-[var(--ff-primary-dark)] px-4 py-2.5 text-left text-sm font-semibold leading-5 text-white"
            >
              {visibleScenario.prompt}
            </motion.div>
          </div>

          <div className="mt-3 flex items-start gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ff-tech-soft)] text-[var(--ff-tech-teal-dark)]">
              <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                {isThinking ? (
                  <motion.div
                    key={`thinking-${runId}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex min-h-12 items-center gap-2 rounded-[18px] rounded-tl-md border border-[var(--ff-tech-border)] bg-white px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-[var(--ff-tech-teal-dark)]">Organizando a intenção</span>
                    <span className="flex gap-1" aria-hidden="true">
                      {[0, 1, 2].map((dot) => (
                        <motion.span
                          key={dot}
                          animate={reduceMotion ? undefined : { opacity: [0.35, 1, 0.35] }}
                          transition={{ duration: 0.65, repeat: Infinity, delay: dot * 0.1 }}
                          className="h-1.5 w-1.5 rounded-full bg-[var(--ff-tech-teal)]"
                        />
                      ))}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`answer-${runId}`}
                    data-demo-results
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                  >
                    <div className="rounded-[16px] rounded-tl-md border border-[var(--ff-tech-border)] bg-white px-3.5 py-2.5 text-sm font-medium leading-5">
                      {visibleScenario.answer}
                    </div>
                    <div className="mt-2.5 grid gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const combo = visibleScenario.combos[0];
                          trackLandingEvent('demo_result_click', { scenario: visibleScenario.id, restaurant: combo.restaurant });
                          runDemo(visibleScenario.prompt, 'suggestion');
                        }}
                        aria-label="Usar esta pergunta na demonstração"
                        className="group grid min-h-[124px] cursor-pointer grid-cols-[1fr_auto] gap-x-3 rounded-[18px] border border-[var(--ff-border-warm)] bg-white p-3.5 text-left transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--ff-primary)]/45 hover:shadow-[var(--ff-shadow-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--ff-text-secondary)]"><Store className="h-4 w-4 shrink-0 text-[var(--ff-primary)]" aria-hidden="true" />{visibleScenario.combos[0].restaurant}</span>
                          <span className="mt-1.5 block text-base font-bold leading-5 text-[#252228]">{visibleScenario.combos[0].name}</span>
                          <span className="mt-1 block text-sm font-normal leading-5 text-[#555B66]">{visibleScenario.combos[0].items}</span>
                        </span>
                        <span className="h-fit shrink-0 self-start rounded-full bg-[var(--ff-success-soft)] px-2.5 py-1.5 text-sm font-bold tabular-nums text-[var(--ff-success-dark)]">{visibleScenario.combos[0].price}</span>
                        <span className="col-span-2 mt-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-[var(--ff-primary-dark)] px-4 text-sm font-bold text-white">Usar esta pergunta <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const combo = visibleScenario.combos[1];
                          trackLandingEvent('demo_result_click', { scenario: visibleScenario.id, restaurant: combo.restaurant });
                          runDemo(visibleScenario.prompt, 'suggestion');
                        }}
                        className="group flex min-h-16 items-center justify-between gap-3 rounded-2xl border border-[var(--ff-border-warm)] bg-white px-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/35"
                        aria-label="Usar esta pergunta na demonstração"
                      >
                        <span className="min-w-0 text-sm"><span className="block truncate font-semibold text-[var(--ff-text-secondary)]">{visibleScenario.combos[1].restaurant}</span><span className="font-bold text-[#252228]">{visibleScenario.combos[1].name}</span></span>
                        <span className="flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--ff-primary-dark)]"><span className="text-[var(--ff-success-dark)]">{visibleScenario.combos[1].price}</span><span className="hidden sm:inline">Usar pergunta</span><ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-[var(--ff-border-warm)] bg-white p-4">
          <label htmlFor="landing-ai-question" className="sr-only">O que você quer comer?</label>
          <div className="flex min-h-12 items-center gap-2 rounded-full border border-[var(--ff-border-warm)] bg-[var(--ff-surface-warm)] pl-4 pr-1.5 focus-within:border-[var(--ff-primary)] focus-within:ring-2 focus-within:ring-[var(--ff-primary)]/15">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--ff-primary)]" aria-hidden="true" />
            <input
              ref={inputRef}
              id="landing-ai-question"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="min-w-0 flex-1 bg-transparent py-3 text-base font-medium text-[var(--ff-text-primary)] outline-none placeholder:text-[#7A808B]"
              placeholder="Pergunte prato, bairro ou orçamento..."
              autoComplete="off"
              enterKeyHint="send"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ff-primary)] text-white transition-transform duration-150 active:scale-95 disabled:cursor-wait disabled:opacity-50"
              aria-label={isThinking ? 'A IA está organizando a pergunta' : 'Enviar pergunta'}
            >
              <SendHorizontal className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
            {scenarios.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => runDemo(suggestion.prompt, 'suggestion')}
                className="min-h-11 shrink-0 cursor-pointer rounded-full bg-[var(--ff-orange-soft)] px-4 text-sm font-semibold text-[var(--ff-primary-dark)] transition-colors duration-200 hover:bg-[#FFE3D8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-primary)]/30"
              >
                {suggestion.id === 'lanche-casal' ? 'Lanche casal' : suggestion.id === 'jantar-japones' ? 'Japonês' : 'Pizza para 4'}
              </button>
            ))}
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-sm leading-5 text-[#5E6675]"><Check className="h-4 w-4 shrink-0 text-[var(--ff-tech-teal-dark)]" aria-hidden="true" /><span><strong>Resultados ilustrativos.</strong> Confirme preço e disponibilidade.</span></p>
        </form>
      </motion.div>
    </div>
  );
}
