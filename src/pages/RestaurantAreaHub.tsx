import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Utensils, LogIn, UserPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl, PathKey } from '@/utils/url';
import Header from '@/components/Header';

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
    <div className="min-h-screen bg-[#f1f5f9] w-full flex flex-col">
      <div className="relative bg-background-light font-sans antialiased flex min-h-screen w-full max-w-md mx-auto flex-col border-x border-slate-200/60 overflow-x-hidden">
        
        {/* Unified Header */}
        <Header 
          title="Área do Restaurante" 
          leftAction={{ icon: ArrowLeft, onClick: () => navigate(createPageUrl('welcome')) }}
        />

        <main className="flex-grow flex flex-col justify-center w-full px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            {/* Icon and Title */}
            <div className="flex flex-col items-center justify-center pb-8 w-full text-center">
              <div className="flex items-center justify-center size-16 bg-highlight/10 rounded-2xl mx-auto mb-4">
                <Utensils className="w-8 h-8 text-highlight" />
              </div>
              <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
                Gerencie seu Negócio
              </h1>
              <p className="text-text-secondary text-base mt-1">
                Escolha a opção para acessar ou criar sua conta.
              </p>
            </div>

            <div className="space-y-4">
              {options.map((option, index) => {
                const Icon = option.icon;
                return (
                  <Link key={index} to={createPageUrl(option.path)} className="block">
                    <motion.div
                      whileHover={{ scale: 1.015, y: -2 }}
                      whileTap={{ scale: 0.985 }}
                      className="flex items-center p-5 bg-white rounded-2xl shadow-soft border border-slate-100/50 hover:border-highlight/35 hover:bg-slate-50/20 transition-all duration-300 cursor-pointer group"
                    >
                      <div className="size-12 rounded-2xl bg-primary/5 flex items-center justify-center mr-4 group-hover:bg-highlight/10 transition-colors shrink-0">
                        <Icon className="w-6 h-6 text-primary group-hover:text-highlight transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h3 className="font-bold text-primary text-base leading-tight transition-colors truncate">
                          {option.title}
                        </h3>
                        <p className="text-text-secondary text-sm font-normal mt-1 leading-normal">
                          {option.description}
                        </p>
                      </div>
                      <ArrowLeft className="w-5 h-5 text-slate-400 rotate-180 group-hover:text-highlight group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                    </motion.div>
                  </Link>
                );
              })}
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
      </div>
    </div>
  );
}