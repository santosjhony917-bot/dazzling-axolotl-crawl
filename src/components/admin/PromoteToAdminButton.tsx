import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Shield, Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

export const PromoteToAdminButton: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { isAdmin, refetch } = useUserRole();

  const handlePromote = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('promote_to_admin');
      
      if (error) {
        throw new Error(error.message);
      }
      
      showSuccess("Parabéns! Você é agora um administrador.");
      refetch(); // Refetch roles to update UI
    } catch (e) {
      showError(`Falha ao promover: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    return null;
  }

  return (
    <div className="p-4 bg-yellow-100 border border-yellow-300 rounded-lg mt-4">
      <p className="text-sm text-yellow-800 mb-3">
        **Apenas para Desenvolvimento:** Clique abaixo para se promover a administrador e acessar o painel.
      </p>
      <Button 
        onClick={handlePromote} 
        disabled={loading}
        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Shield className="mr-2 h-4 w-4" />
        )}
        Tornar-me Admin
      </Button>
    </div>
  );
};