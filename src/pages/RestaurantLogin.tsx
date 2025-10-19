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
import { mockLoginWithRole } from "@/utils/auth-mock"; // Importando a função mock

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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message || "Ocorreu um erro ao fazer login.");
    } else {
      // TODO: Add logic to check if user is a restaurant owner before redirecting
      navigate("/restaurant-dashboard");
    }
    setLoading(false);
  };
  
  const handleMockLogin = async () => {
    setLoading(true);
    try {
      // Usamos o role 'free_restaurant' como padrão para o login mock
      await mockLoginWithRole('free_restaurant');
      showSuccess("Login de Restaurante (Mock) realizado com sucesso!");
      navigate("/restaurant-dashboard");
    } catch (error) {
      showError((error as Error).message || "Falha no login mock.");
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
              
              {/* Novo Botão de Login Rápido (Mock) */}
              <div className="pt-4 border-t border-gray-200 mt-6">
                <Button
                  onClick={handleMockLogin}
                  disabled={loading}
                  variant="secondary"
                  className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-full h-12 font-bold"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Login Rápido (Mock)"}
                </Button>
              </div>

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