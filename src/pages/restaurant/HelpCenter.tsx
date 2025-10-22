import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from '@/components/ui/button';

const faqItems = [
  {
    question: "Como adiciono meu cardápio?",
    answer: "Você pode adicionar e gerenciar seu cardápio na seção 'Cardápio' do seu painel. Lá você pode adicionar itens, categorias, preços e descrições."
  },
  {
    question: "Como funciona o plano Premium?",
    answer: "O plano Premium oferece vantagens como destaque nas buscas, estatísticas avançadas, branding profissional e muito mais. Você pode ver todos os benefícios e assinar na tela de 'Upgrade'."
  },
  {
    question: "Posso alterar meu cardápio a qualquer momento?",
    answer: "Sim! Seu cardápio é totalmente flexível. Você pode editar, adicionar ou remover itens e categorias sempre que precisar, e as alterações são refletidas em tempo real."
  },
  {
    question: "Quais são os métodos de pagamento aceitos?",
    answer: "Aceitamos os principais cartões de crédito e débito para o pagamento da assinatura do plano Premium. Todo o processo é feito de forma segura através da nossa plataforma."
  },
  {
    question: "Como entro em contato com o suporte?",
    answer: "Você pode entrar em contato com nosso suporte clicando no botão 'Falar com suporte' nesta página ou através do link na sua tela de perfil. Nossa equipe está disponível para ajudar!"
  }
];

const HelpCenter = () => {
  const navigate = useNavigate();

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <header className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-text-primary dark:text-white">
          <ArrowLeft />
        </Button>
        <h1 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
          Central de Ajuda
        </h1>
      </header>
      <main className="flex-1 px-4 py-6 pb-24">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-primary dark:text-white">Perguntas Frequentes (FAQ)</h2>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg px-2">
                <AccordionTrigger className="p-4 font-medium text-left text-text-primary dark:text-white hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="p-4 pt-0 text-text-secondary dark:text-gray-400">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <div className="mt-8 rounded-xl bg-primary p-6 text-center text-white">
          <h3 className="text-xl font-bold">Não encontrou o que procura?</h3>
          <p className="mt-2 text-sm text-blue-200">Nossa equipe está pronta para ajudar você.</p>
          <Button className="mt-4 w-full rounded-full bg-white py-3 h-auto font-bold text-primary transition-colors hover:bg-gray-100">
            Falar com suporte
          </Button>
        </div>
      </main>
    </div>
  );
};

export default HelpCenter;