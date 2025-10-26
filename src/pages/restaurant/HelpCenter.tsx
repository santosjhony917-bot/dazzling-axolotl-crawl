import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, ChevronUp, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import RestaurantAreaHeader from '@/components/restaurant/RestaurantAreaHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils/url';

// Dados Mock de FAQ
const faqData = [
  {
    id: 1,
    question: "Como faço para atualizar meu cardápio?",
    answer: "Você pode atualizar seu cardápio acessando a aba 'Cardápio' no menu inferior. Lá, você pode adicionar, editar ou remover categorias e itens.",
    tags: ["cardápio", "menu", "edição"],
  },
  {
    id: 2,
    question: "Como mudo meu plano de Free para Premium?",
    answer: "Vá para a aba 'Perfil' e clique em 'Ativar Premium' na seção 'Plano e Assinatura'. Você será redirecionado para a página de upgrade.",
    tags: ["plano", "premium", "assinatura"],
  },
  {
    id: 3,
    question: "Onde edito o endereço e horário de funcionamento?",
    answer: "Na aba 'Perfil', na seção 'Detalhes do Estabelecimento', clique em 'Editar' para abrir os diálogos de edição de endereço e horários.",
    tags: ["endereço", "horário", "perfil"],
  },
  {
    id: 4,
    question: "Como faço para sair da minha conta?",
    answer: "Na aba 'Perfil', role até o final da página e clique no botão 'Sair da conta'.",
    tags: ["conta", "logout", "sair"],
  },
  {
    id: 5,
    question: "Posso ter mais de uma filial cadastrada?",
    answer: "Sim, o FilterFood suporta múltiplas filiais. Você pode gerenciar as localizações na sua área de cadastro inicial ou entrando em contato com o suporte para planos empresariais.",
    tags: ["filial", "localização", "cadastro"],
  },
];

// Componente de Item de FAQ
interface FaqItemProps {
  question: string;
  answer: string;
}

const FaqItem: React.FC<FaqItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        className="flex w-full items-center justify-between py-4 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-base font-semibold text-primary dark:text-white">{question}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-highlight" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden pb-4"
          >
            <p className="text-sm text-gray-700 dark:text-gray-300">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredFaqs = faqData.filter(faq =>
    faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    faq.tags.some(tag => tag.includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      
      {/* Header */}
      <RestaurantAreaHeader title="Central de Ajuda" icon={Utensils} backPath="restaurant-area/profile-menu" />

      <main className="flex-1 w-full max-w-md p-4">
        
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Pesquisar por palavra-chave (ex: cardápio, premium)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-xl border-gray-300 focus:border-highlight focus:ring-highlight text-base shadow-sm"
            />
          </div>
        </div>

        {/* FAQ List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <h2 className="text-xl font-bold text-primary dark:text-white mb-4">Perguntas Frequentes</h2>
          
          {filteredFaqs.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredFaqs.map(faq => (
                <FaqItem key={faq.id} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Nenhum resultado encontrado para "{searchTerm}".</p>
          )}
        </div>
      </main>
    </div>
  );
}