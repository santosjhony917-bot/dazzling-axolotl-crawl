import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, ArrowRight, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { createPageUrl } from "@/utils/url";
import { motion } from "framer-motion";
import { useAuthContext } from "@/context/AuthContext"; // Importando o contexto

const ADMIN_EMAIL = "joaoedasilva018@gmail.com";
const ADMIN_PASSWORD = "password";

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refetchProfile } = useAuthContext(); // Usando refetchProfile
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Tenta fazer login
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Se o erro for de credenciais inválidas, tentamos criar o usuário com o metadado de admin
        if (error.message.includes('Invalid login credentials')) {
            
            // Tenta criar o usuário com o metadado de admin
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        role: 'admin' 
                    }
                }
            });
            
            if (signUpError) {
                // Se o erro for 'User already exists', significa que a senha está errada
                if (signUpError.message.includes('User already exists')) {
                    throw new Error("Usuário já existe. Verifique a senha.");
                }
                throw signUpError;
            }
            
            // Se o cadastro for bem-sucedido, o Supabase loga automaticamente.
            
        } else {
            throw error;
        }
      }
      
      // 2. Força o AuthContext a recarregar o perfil e os papéis
      // Não precisamos aguardar o refetch aqui, pois a navegação forçará a montagem do AdminLayout
      refetchProfile();
      
      // 3. Mostra sucesso e navega para a rota base /admin
      showSuccess("Login de Administrador realizado com sucesso!");
      navigate(createPageUrl("admin/dashboard"), { replace: true }); 

    } catch (error) {
      const msg = (error as Error).message || "Falha no login de Administrador. Verifique as credenciais.";
      console.error("ADMIN LOGIN ERROR:", msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-background-light p-4 font-sans antialiased">
      
      <main className="flex-1 flex flex-col justify-center w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Icon and Title */}
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-primary/10 rounded-xl mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              Acesso Administrativo
            </h1>
            <p className="text-text-secondary text-base mt-1">
              Acesso restrito. Use suas credenciais de administrador.
            </p>
          </div>

          <Card className="w-full shadow-xl border-none rounded-xl">
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  className="h-14 text-base rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight"
                  placeholder="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="relative">
                  <Input
                    className="h-14 text-base pr-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight"
                    placeholder="Senha"
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
                    type="button"
                  >
                    {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="highlight"
                  className="flex w-full items-center justify-center rounded-xl h-12 gap-1 text-base font-bold shadow-lg transition-all hover:shadow-xl"
                >
                  <span className="truncate">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Entrar como Admin"}
                  </span>
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </Button>
              </form>
              
              <p className="pt-6 text-center text-base text-gray-600">
                <Link
                  to={createPageUrl('restaurant-login')}
                  className="font-bold text-highlight hover:underline ml-1"
                >
                  Voltar para Login do Restaurante
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}