import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';

export default function HelpCenter() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 md:max-w-md md:mx-auto">
      <header className="flex items-center p-4 bg-white shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="flex-grow text-center text-xl font-semibold text-primary">Central de Ajuda</h1>
        <div className="w-10"></div> {/* Placeholder para alinhar o título */}
      </header>

      <main className="p-4 space-y-6">
        <section className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-primary mb-3">Perguntas Frequentes</h2>
          <div className="space-y-2 text-text-secondary">
            <p><strong>Como faço para cadastrar meu restaurante?</strong></p>
            <p>Você pode cadastrar seu restaurante através da opção "Sou restaurante" na tela de boas-vindas.</p>
            <p><strong>Como altero meu plano?</strong></p>
            <p>Para alterar seu plano, acesse a área do restaurante e vá em "Métricas e Promoções".</p>
          </div>
        </section>

        <section className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-primary mb-3">Fale Conosco</h2>
          <div className="space-y-3">
            <a href="mailto:suporte@filterfood.com" className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors">
              <Mail className="h-5 w-5" />
              <span>suporte@filterfood.com</span>
            </a>
            <a href="tel:+5511987654321" className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors">
              <Phone className="h-5 w-5" />
              <span>(11) 98765-4321</span>
            </a>
            <a href="#" className="flex items-center gap-3 text-text-secondary hover:text-primary transition-colors">
              <HelpCircle className="h-5 w-5" />
              <span>Chat Online (em breve)</span>
            </a>
          </div>
        </section>

        <div className="text-center pt-4">
          <p className="text-text-secondary mb-4">
            Se você é um restaurante, pode gerenciar suas informações na sua área.
          </p>
          <Button onClick={() => navigate(createPageUrl('restaurant-area-profile-menu'))}>
            Voltar ao Perfil
          </Button>
        </div>
      </main>
    </div>
  );
}