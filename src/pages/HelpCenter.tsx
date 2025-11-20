import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import { useAuthData } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

export default function HelpCenter() {
  const navigate = useNavigate();
  const { signOut } = useAuthData();

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
    <div className="min-h-screen bg-[#f5f7f8] max-w-md mx-auto">
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-[#022D68]" />
          <h2 className="text-[#022D68] text-xl font-bold">Central de Ajuda</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="p-4 text-center">
        <div className="bg-white p-6 rounded-xl shadow-md mt-8">
          <HelpCircle className="w-12 h-12 text-highlight mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">Em Construção</h3>
          <p className="text-gray-600 mb-6">
            Esta é a Central de Ajuda. Em breve, você encontrará tutoriais e respostas para as perguntas mais frequentes aqui.
          </p>
          <Button onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}>
            Voltar ao Perfil
          </Button>
        </div>

        <div className="mt-8 border-t pt-8">
          <h3 className="text-lg font-bold text-red-600 mb-4">Zona de Perigo</h3>
          <Button 
            variant="destructive" 
            className="w-full flex items-center gap-2 justify-center"
            onClick={handleDeleteAccount}
          >
            <Trash2 className="h-4 w-4" />
            Excluir Minha Conta
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Esta ação é irreversível. Todos os seus dados serão apagados.
          </p>
        </div>
      </main>
    </div>
  );
}