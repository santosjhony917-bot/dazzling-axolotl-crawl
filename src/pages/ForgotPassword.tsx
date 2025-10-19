import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils/url";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";

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
        subject: "Recuperação de Senha - FilterFood",
        body: `Olá! Recebemos uma solicitação para recuperar sua senha. Clique no link abaixo para redefinir sua senha.`
      });
      
      setSuccess(true);
    } catch (error) {
      console.error("Erro ao enviar email:", error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Botão Voltar */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>

        {/* Card Principal */}
        <div className="bg-white rounded-3xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68f421ed243cc437dccd3b9e/be0286f54_image.png"
              alt="FilterFood"
              className="w-24 h-auto"
            />
          </div>

          {!success ? (
            <>
              {/* Título */}
              <div className="text-center mb-8">
                <h1 className="text-[#022D68] text-3xl font-bold mb-3">
                  Esqueceu sua senha?
                </h1>
                <p className="text-[#5f728c] text-base">
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
                    className="h-14 rounded-xl border-gray-200 focus:border-[#E47948] focus:ring-[#E47948] text-base"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-[#E47948] hover:bg-[#E47948]/90 text-white rounded-full text-lg font-bold shadow-lg transition-all duration-300 hover:shadow-xl"
                >
                  {loading ? "Enviando..." : "Enviar instruções"}
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg 
                  className="w-10 h-10 text-green-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M5 13l4 4L19 7" 
                  />
                </svg>
              </div>
              <h2 className="text-[#022D68] text-2xl font-bold mb-3">
                E-mail enviado!
              </h2>
              <p className="text-[#5f728c] text-base mb-6">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("customer-login"))}
                variant="outline"
                className="border-2 border-[#E47948] text-[#E47948] hover:bg-[#E47948]/5 rounded-full font-bold"
              >
                Voltar para o login
              </Button>
            </motion.div>
          )}
        </div>

        {/* Link de ajuda */}
        {!success && (
          <p className="text-center text-[#5f728c] text-sm mt-6">
            Lembrou sua senha?{" "}
            <button
              onClick={() => navigate(createPageUrl("customer-login"))}
              className="text-[#E47948] font-semibold hover:underline"
            >
              Fazer login
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}