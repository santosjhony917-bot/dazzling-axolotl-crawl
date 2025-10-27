import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Utensils, LogIn, UserPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl, PathKey } from '@/utils/url';

interface Option {
  title: string;
  description: string;
  icon: React.ElementType;
  path: PathKey;
}

export default function RestaurantAreaHub() {
  const navigate = useNavigate();

  const options: Option[] = [
    { 
      title: "Fazer Login", 
      description: "Acesse seu painel de controle.", 
      icon: LogIn, 
      path: 'restaurant-login' 
    },
    { 
      title: "Cadastrar Restaurante", 
      description: "Crie sua conta e adicione seu estabelecimento.", 
      icon: UserPlus, 
      path: 'restaurant-signup' 
    },
    { 
      title: "Reivindicar Restaurante", 
      description: "Use o código de acesso fornecido pela FilterFood.", 
      icon: FileText, 
      path: 'claim-restaurant' 
    },
  ];

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center p-4">
      
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('welcome'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">Área do Restaurante</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Icon and Title */}
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-[#E47948]/10 rounded-xl mx-auto mb-4">
              <Utensils className="w-8 h-8 text-[#E47948]" />
            </div>
            <h1 className="text-[#022D68] tracking-tight text-3xl font-bold leading-tight">
              Gerencie seu Negócio
            </h1>
            <p className="text-gray-600 text-base mt-1">
              Escolha a opção para acessar ou criar sua conta.
            </p>
          </div>

          <Card className="w-full shadow-soft-xl border-none rounded-2xl p-4 space-y-3">
            {options.map((option, index) => {
              const Icon = option.icon;
              return (
                <Link key={index} to={createPageUrl(option.path)}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center p-4 bg-[#f5f7f8] rounded-xl hover:bg-gray-100 transition-colors cursor-pointer shadow-soft-sm"
                  >
                    <div className="size-10 rounded-xl bg-[#022D68]/10 flex items-center justify-center mr-4">
                      <Icon className="w-5 h-5 text-[#022D68]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#022D68]">{option.title}</h3>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-gray-500 rotate-180" />
                  </motion.div>
                </Link>
              );
            })}
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Termos</Link>
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Privacidade (LGPD)</Link>
        </div>
      </footer>
    </div>
  );
}