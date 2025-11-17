import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, MessageSquare, Crown, LogOut, Trash2 } from 'lucide-react'; // CORRIGIDO: HelpCenter -> HelpCircle
import { createPageUrl } from '@/utils/url';
import NavCardItem from '@/components/NavCardItem';
import { useAuthData } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface SubscriptionSupportSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ navigate, isPremium }) => {
  const { signOut } = useAuthData();
  
  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  const handleSignOut = async () => {
    await signOut();
    showSuccess("Você saiu da sua conta.");
    // Redireciona para a tela de boas-vindas após o logout
    navigate(createPageUrl('welcome'), { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Tem certeza que deseja excluir sua conta? Esta ação é permanente e não pode ser desfeita.")) {
      try {
        // Call Supabase function to delete user account
        const { error } = await supabase.rpc('delete_user_account');
        
        if (error) {
          console.error('Error deleting account:', error);
          showError("Erro ao excluir conta: " + error.message);
          return;
        }

        showSuccess("Conta excluída com sucesso.");
        // Sign out after deletion
        await supabase.auth.signOut();
        navigate(createPageUrl('welcome'));
      } catch (error) {
        console.error('Unexpected error deleting account:', error);
        showError("Erro inesperado ao excluir conta.");
      }
    }
  };
  
  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Suporte</h2>
      
      <NavCardItem 
        icon={HelpCircle} // CORRIGIDO
        title="Central de Ajuda"
        description="Encontre respostas rápidas e tutoriais."
        onClick={() => handleNavigate(createPageUrl('helpCenter'))}
      />
      
      <NavCardItem 
        icon={MessageSquare}
        title="Falar com Suporte"
        description="Entre em contato direto com nossa equipe."
        onClick={() => {
          // Ação para abrir chat ou link de contato (ex: WhatsApp)
          alert("Abrindo chat de suporte...");
        }}
        isPremium={isPremium}
        premiumDescription="Suporte prioritário 24h"
      />
      
      {/* REMOVIDO: Botão "Gerenciar Assinatura" */}
      
      {/* NOVO: Botão de Sair */}
      <NavCardItem 
        icon={LogOut}
        title="Sair da Conta"
        description="Desconectar-se do painel do restaurante."
        onClick={handleSignOut} // Usando o novo handler
      />

      <NavCardItem 
        icon={Trash2}
        title="Excluir Conta"
        description="Remover permanentemente sua conta e dados."
        onClick={handleDeleteAccount}
      />
    </div>
  );
};

export default SubscriptionSupportSection;