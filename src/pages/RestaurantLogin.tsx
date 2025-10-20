import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { createPageUrl } from "@/utils/url";
import { motion } from "framer-motion";

export default function RestaurantLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }
      
      const userId = data.user?.id;
      if (!userId) {
        throw new Error("Usuário logado, mas ID não encontrado.");
      }

      // 1. Tenta vincular o restaurante mockado ao ID do usuário logado
      // Isso simula o processo de atribuição de propriedade após o login/cadastro.
      const MOCK_RESTAURANT_ID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
      
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ user_id: userId })
        .eq('id', MOCK_RESTAURANT_ID);

      if (updateError) {
        // Se falhar, apenas logamos o erro, mas permitimos o acesso para fins de teste
        console.error("Falha ao vincular restaurante mockado ao usuário:", updateError);
      }

      showSuccess("Login realizado com sucesso! Redirecionando para o painel.");
      navigate("/restaurant-area/home"); 

    } catch (error) {
      showError((error as Error).message || "Ocorreu um erro ao fazer login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-[#f5f7f8] p-4 font-sans antialiased">
      
      {/* Header/Botão Voltar */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">Login</h2>
        </div>
        <div className="w-10"></div> {/* Placeholder para alinhamento */}
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Icon and Title (Padrão Consistente) */}
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-[#022D68]/10 rounded-full mx-auto mb-4">
              <Utensils className="w-8 h-8 text-[#022D68]" />
            </div>
            <h1 className="text-[#022D68] tracking-tight text-3xl font-bold leading-tight">
              Acesse sua conta
            </h1>
            <p className="text-gray-600 text-base mt-1">
              Gerencie seu restaurante!
            </p>
          </div>

          <Card className="w-full shadow-xl border-none rounded-xl">
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  className="h-14 text-base rounded-full border-gray-200 focus:border-[#E47948] focus:ring-[#E47948]"
                  placeholder="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="relative">
                  <Input
                    className="h-14 text-base pr-12 rounded-full border-gray-200 focus:border-[#E47948] focus:ring-[#E47948]"
                    placeholder="Senha"
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-[#022D68] transition-colors"
                    type="button"
                  >
                    {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-[#022D68] hover:underline"
                  >
                    Esqueceu sua senha?
                  </Link>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-full h-12 bg-[#E47948] hover:bg-[#E47948]/90 text-white gap-1 text-base font-bold shadow-lg transition-all hover:shadow-xl"
                >
                  <span className="truncate">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar"}
                  </span>
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </Button>
              </form>
              
              <p className="pt-6 text-center text-base text-gray-600">
                Não tem uma conta?
                <Link
                  to={createPageUrl('restaurant-signup')}
                  className="font-bold text-[#E47948] hover:underline ml-1"
                >
                  Crie uma agora
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <p className="text-gray-500 text-sm font-medium">Termos</p>
          <p className="text-gray-500 text-sm font-medium">Privacidade (LGPD)</p>
        </div>
      </footer>
    </div>
  );
}