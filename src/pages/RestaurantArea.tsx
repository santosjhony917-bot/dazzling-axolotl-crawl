import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Utensils, ChevronRight, Plus, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';

// Componente auxiliar para os cards de ação
interface ActionCardProps {
  title: string;
  description: string;
  icon: React.ElementType<any>;
  iconColor: string;
  bgColor: string;
  textColor: string;
  onClick: () => void;
}

const ActionCard: React.FC<ActionCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor,
  bgColor,
  textColor,
  onClick,
}) => {
  return (
    <div 
      className={`flex items-center gap-4 p-4 rounded-full shadow-md cursor-pointer transition-all hover:shadow-lg ${bgColor}`}
      onClick={onClick}
    >
      <div className="shrink-0">
        <div className={`flex size-10 items-center justify-center rounded-full ${iconColor} ${bgColor === 'bg-white' ? 'bg-[#022D68]/10' : ''}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="flex flex-col justify-center text-left flex-grow">
        <p className={`text-base font-bold leading-normal line-clamp-1 ${textColor}`}>{title}</p>
        <p className={`text-sm font-normal leading-normal line-clamp-2 ${textColor}/80`}>{description}</p>
      </div>
      <ChevronRight className={`w-5 h-5 shrink-0 ${textColor}`} />
    </div>
  );
};


export default function RestaurantArea() {
  const navigate = useNavigate();

  const handleBack = () => navigate(-1);
  const handleGoHome = () => navigate(createPageUrl('welcome'));
  
  // Ações de navegação
  const handleClaimRestaurant = () => navigate(createPageUrl('restaurant-login'));
  const handleRegisterRestaurant = () => navigate(createPageUrl('restaurant-signup'));
  const handleEmailLogin = () => navigate(createPageUrl('restaurant-login'));

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-[#f5f7f8] font-sans antialiased">
      
      {/* Botão Voltar */}
      <div className="absolute top-4 left-4 z-10">
        <Button variant="ghost" size="icon" onClick={handleBack} className="text-[#022D68] hover:bg-[#022D68]/5">
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      <main className="flex-grow flex flex-col items-center justify-center px-4 pt-16 pb-4 text-center">
        
        {/* Icon and Title */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="flex items-center justify-center size-24 bg-[#022D68]/10 rounded-full mx-auto mb-6">
            <Utensils className="text-[#022D68] w-10 h-10" />
          </div>
          <h1 className="text-[#022D68] tracking-tight text-3xl font-bold leading-tight">Área do Restaurante</h1>
          <p className="text-gray-600 text-base font-normal leading-normal pt-1">Gerencie seu estabelecimento</p>
        </motion.div>
        
        {/* Action Cards */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full max-w-md mt-10 space-y-4"
        >
          
          {/* Login com e-mail (Priorizando o login direto) */}
          <ActionCard
            title="Acessar minha conta"
            description="Login com e-mail e senha"
            icon={Mail}
            iconColor="text-white"
            bgColor="bg-[#E47948]"
            textColor="text-white"
            onClick={handleEmailLogin}
          />

          {/* Cadastrar restaurante */}
          <ActionCard
            title="Cadastrar novo restaurante"
            description="Crie uma conta para seu estabelecimento"
            icon={Plus}
            iconColor="text-[#022D68]"
            bgColor="bg-white"
            textColor="text-[#022D68]"
            onClick={handleRegisterRestaurant}
          />
          
          {/* Reivindicar restaurante (Mantido, mas com menor destaque) */}
          <ActionCard
            title="Reivindicar restaurante existente"
            description="Atualizar cardápio e acesso"
            icon={Utensils}
            iconColor="text-[#022D68]"
            bgColor="bg-white"
            textColor="text-[#022D68]"
            onClick={handleClaimRestaurant}
          />
        </motion.div>
      </main>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="p-4 pt-8 w-full max-w-md mx-auto"
      >
        <button 
          onClick={handleGoHome}
          className="text-[#022D68] text-center block text-base font-medium leading-normal w-full hover:underline"
        >
          Voltar para o início
        </button>
      </motion.footer>
    </div>
  );
}