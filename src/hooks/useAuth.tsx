import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";

export function useAuth() {
  const navigate = useNavigate();

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      // Redireciona para a tela de boas-vindas ou login
      navigate(createPageUrl('welcome'));
    }
    return { error };
  };

  // Mock de dados do usuário para fins de demonstração
  const user = {
    id: "mock-user-123",
    email: "joao.dias@email.com",
    name: "João Dias",
    avatarUrl: "",
    role: "customer",
  };

  return {
    user,
    isLoading: false,
    signOut,
  };
}