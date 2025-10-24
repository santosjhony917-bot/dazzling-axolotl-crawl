import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { cn } from '@/lib/utils';

const TermsAndPrivacy: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  const handleBack = () => {
    navigate(-1);
  };

  const termsContent = [
    { id: 1, title: "Aceitação dos Termos", text: "Ao acessar ou usar o FilterFood, você concorda em cumprir estes Termos de Uso." },
    { id: 2, title: "Descrição do Serviço", text: "O FilterFood é uma plataforma que permite aos usuários encontrar e visualizar cardápios de restaurantes, enquanto os restaurantes podem gerenciar suas informações e promoções." },
    { id: 3, title: "Cadastro e Conta", text: "Para acessar certos recursos, você deve se registrar e criar uma conta. Você é responsável por manter a confidencialidade de sua conta e senha." },
    { id: 4, title: "Responsabilidades do Restaurante", text: "Os restaurantes são responsáveis por manter suas informações de cardápio, preços e promoções atualizadas e precisas." },
    { id: 5, title: "Planos e Pagamentos", text: "Oferecemos diferentes planos para restaurantes com vários recursos. Os pagamentos são processados através de um gateway de pagamento seguro." },
    { id: 6, title: "Propriedade Intelectual", text: "Todo o conteúdo do FilterFood, incluindo logotipos, textos e gráficos, é de nossa propriedade ou de nossos licenciadores e é protegido por leis de direitos autorais." },
    { id: 7, title: "Limitação de Responsabilidade", text: "Não nos responsabilizamos por quaisquer imprecisões nas informações do restaurante ou por perdas ou danos resultantes do uso do nosso serviço." },
    { id: 8, title: "Modificações nos Termos", text: "Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos os usuários sobre quaisquer alterações." },
    { id: 9, title: "Contato", text: "Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco em contato@filterfood.com" },
  ];

  const privacyContent = [
    { id: 1, title: "Coleta de Informações", text: "Coletamos informações que você nos fornece diretamente, como nome, e-mail e dados de localização, para fornecer e melhorar nossos serviços." },
    { id: 2, title: "Uso de Dados", text: "Usamos seus dados para personalizar sua experiência, processar transações e enviar comunicações relevantes sobre o serviço." },
    { id: 3, title: "Compartilhamento de Dados", text: "Não compartilhamos suas informações pessoais com terceiros, exceto quando necessário para operar o serviço (ex: gateways de pagamento) ou conforme exigido por lei." },
    { id: 4, title: "Segurança", text: "Implementamos medidas de segurança robustas para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição." },
    { id: 5, title: "Cookies", text: "Utilizamos cookies e tecnologias de rastreamento semelhantes para monitorar a atividade em nosso serviço e armazenar certas informações." },
    { id: 6, title: "Seus Direitos", text: "Você tem o direito de acessar, corrigir ou excluir suas informações pessoais a qualquer momento, entrando em contato conosco." },
  ];

  const currentContent = activeTab === 'terms' ? termsContent : privacyContent;
  const title = activeTab === 'terms' ? 'Termos de Uso' : 'Política de Privacidade';

  const TabButton: React.FC<{ tab: 'terms' | 'privacy', label: string }> = ({ tab, label }) => (
    <button
      className={cn(
        "flex flex-col items-center justify-center border-b-[3px] pb-[13px] pt-4 flex-1 transition-colors duration-200",
        activeTab === tab
          ? "border-b-accent text-primary dark:text-white"
          : "border-b-transparent text-text-secondary dark:text-gray-400 hover:border-b-gray-300 dark:hover:border-b-gray-600"
      )}
      onClick={() => setActiveTab(tab)}
    >
      <p className="text-sm font-bold leading-normal tracking-[0.015em]">{label}</p>
    </button>
  );

  return (
    <div className="relative bg-background-light dark:bg-background-dark font-display flex min-h-screen w-full flex-col overflow-x-hidden">
      
      {/* Header */}
      <header className="flex items-center bg-background-light dark:bg-background-dark p-4 pb-2 justify-between sticky top-0 z-10 border-b border-border-color dark:border-gray-700">
        <button 
          className="text-text-primary dark:text-white flex size-12 shrink-0 items-center justify-center"
          onClick={handleBack}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">FilterFood</h2>
      </header>
      
      <main className="flex-1">
        
        {/* Tabs */}
        <div className="flex border-b border-border-color dark:border-gray-700 px-4 justify-between">
          <TabButton tab="terms" label="Termos de Uso" />
          <TabButton tab="privacy" label="Privacidade" />
        </div>
        
        {/* Content Header */}
        <h1 className="text-primary dark:text-white tracking-light text-[32px] font-bold leading-tight px-4 text-left pb-3 pt-6">{title}</h1>
        <p className="text-text-secondary dark:text-gray-400 text-base font-normal leading-normal pb-3 pt-1 px-4">Última atualização: 01/10/2025</p>
        
        {/* Content Body */}
        <div className="p-4 grid grid-cols-1 gap-y-1">
          {currentContent.map((item) => (
            <div key={item.id} className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-t-border-color dark:border-gray-700 py-5">
              <p className="text-text-secondary dark:text-gray-400 text-sm font-normal leading-normal">{item.id}.</p>
              <div className="flex flex-col gap-1">
                <p className="text-primary dark:text-white text-sm font-bold leading-normal">{item.title}</p>
                <p className="text-text-secondary dark:text-gray-400 text-sm font-normal leading-normal">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default TermsAndPrivacy;