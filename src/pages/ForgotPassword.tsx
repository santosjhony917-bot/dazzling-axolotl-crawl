import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import Header from "@/components/Header";
import PhoneShell from "@/components/layout/PhoneShell";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simula o envio de um e-mail de recuperação de senha
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: "Recuperacao de Senha - FilterFood",
        body: `Olá! Recebemos uma solicitação para recuperar sua senha. Clique no link abaixo para redefinir sua senha.`
      });
      
      setSuccess(true);
    } catch (error) {
      console.error("Erro ao enviar email:", error);
    }
    
    setLoading(false);
  };

  return (
    <PhoneShell shellClassName="relative font-sans antialiased flex flex-col bg-[#FAFAFA]">
      <Header 
        title={<span className="text-lg font-semibold tracking-tight text-[#3C2F2F]">Recuperar senha</span>} 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }} 
        sticky={false}
      />

      <main className="flex-grow flex flex-col justify-center w-full px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Card Principal */}
          <div className="rounded-[24px] border border-slate-100/80 bg-white p-5 shadow-soft">
          <div className="flex justify-center mb-4">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>

          {!success ? (
            <>
              {/* Título */}
              <div className="text-center mb-6">
                <h1 className="text-[#3C2F2F] text-[22px] font-semibold mb-3 leading-tight">
                  Esqueceu sua senha?
                </h1>
                <p className="text-text-secondary text-sm leading-relaxed">
                  Digite seu e-mail e enviaremos instruções para redefinir sua senha.
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  className="h-12 rounded-2xl border-slate-200/80 focus:border-highlight focus:ring-highlight text-[15px] shadow-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="highlight"
                  className="w-full h-11 rounded-2xl text-[15px] font-semibold shadow-none transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                >
                  {loading ? "Enviando..." : "Enviar instruções"}
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-5"
            >
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <svg 
                  className="w-9 h-9 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h2 className="text-[#3C2F2F] text-[22px] font-semibold mb-3 leading-tight">
                E-mail enviado!
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("auth"))}
                variant="outline"
                className="border border-slate-200/80 text-highlight hover:bg-highlight/5 rounded-2xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
              >
                Voltar para o login
              </Button>
            </motion.div>
          )}
        </div>

        {/* Link de ajuda */}
        {!success && (
          <p className="text-center text-text-secondary text-sm mt-6">
            Lembrou sua senha?{" "}
            <button
              onClick={() => navigate(createPageUrl("auth"))}
              className="text-highlight font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 rounded"
            >
              Fazer login
            </button>
          </p>
        )}
        {/* Ajustando o link de login para a página de autenticação geral */}
        {success && (
          <p className="text-center text-text-secondary text-sm mt-6">
            <button
              onClick={() => navigate(createPageUrl("auth"))}
              className="text-highlight font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 rounded"
            >
              Voltar para o login
            </button>
          </p>
        )}
      </motion.div>
      </main>
    </PhoneShell>
  );
}
