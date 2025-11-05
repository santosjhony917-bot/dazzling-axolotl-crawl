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
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
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
          className="mb-6 text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>

        {/* Card Principal */}
        <div className="bg-white rounded-xl shadow-soft-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-24 h-auto">
              <svg viewBox="125 -5 100 110" className="w-full h-auto">
                <g transform="matrix(-1.022,0,0,1.022,227.94,-1.794)" fill="#022D68">
                  <path d="M51.798,25.546c-5.767,0-10.458,4.692-10.458,10.459c0,4.981,3.971,14.129,10.458,14.129  c6.488,0,10.458-9.147,10.458-14.129C62.256,30.239,57.564,25.546,51.798,25.546z M51.798,44.633c-1.992,0-4.956-5.162-4.956-8.627  c0-2.732,2.224-4.957,4.956-4.957s4.957,2.225,4.957,4.957C56.755,39.471,53.79,44.633,51.798,44.633z"></path>
                  <path d="M82.882,50.348c2.082-4.465,3.162-9.322,3.162-14.342c0-18.886-15.363-34.251-34.246-34.251  c-18.882,0-34.245,15.365-34.245,34.251c0,4.167,0.753,8.22,2.198,12.034c0.645,1.572,3.26,7.376,8.777,13.01  c0.22,0.206,0.422,0.43,0.646,0.628l19.662,20.885c0.03,0.033,3.075,3.029,5.928-0.001l3.655-3.883h10.836  c0.903,0.112,2.088,0.546,2.644,2.031c0.003,0.009,0.007,0.012,0.009,0.019l2.966,7.907H74.87c0,0,0.003,0.009,0.003,0.01  l0.219,0.568c0.317,1.13,0.398,3.528-4.688,3.528H31.886c-4.293,0-3.763-2.433-3.555-3.059l3.068-8.18  c0.057-0.113,0.114-0.233,0.173-0.392c0.676-1.76,1.363-2.29,1.834-2.434h2.09c3.04,0,0.711-2.465,0.711-2.465h0.002l-1.082-1.147  c0-0.003-0.002-0.003-0.003-0.004c-1.411-1.496-3.1-1.825-4.066-1.886h-0.963c-0.645,0.116-1.703,0.681-2.563,2.966l-6.275,16.733  c-0.009,0.03-1.386,5.368,7.131,5.368h46.542c0,0,8.987-1.14,6.504-7.775L76.254,76.66c0-0.005-0.004-0.01-0.004-0.015  c-1.331-3.548-5.043-3.469-5.043-3.469h-7.61L74.515,61.58l3.555-3.793C80.358,54.923,81.921,52.239,82.882,50.348z M54.487,74.825  c-0.003,0.003-0.004,0.003-0.007,0.009c-2.351,2.497-4.419,0.939-5.114,0.267l-0.242-0.257c-0.002-0.004-0.009-0.01-0.009-0.01  L33.089,57.81l-0.191-0.186c-1.336-1.168-2.575-2.473-3.68-3.882l-0.271-0.354c-3.854-5.062-5.89-11.07-5.89-17.38  c0-15.852,12.895-28.749,28.742-28.749c15.85,0,28.742,12.896,28.742,28.749c0,6.31-2.035,12.32-5.891,17.38L54.487,74.825z"></path>
                </g>
              </svg>
            </div>
          </div>

          {!success ? (
            <>
              {/* Título */}
              <div className="text-center mb-8">
                <h1 className="text-primary text-3xl font-bold mb-3">
                  Esqueceu sua senha?
                </h1>
                <p className="text-text-secondary text-base">
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
                    className="h-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight text-base shadow-soft-sm"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="highlight"
                  className="w-full h-12 rounded-xl text-lg font-bold shadow-highlight-glow transition-all duration-300 hover:shadow-xl"
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
              <h2 className="text-primary text-2xl font-bold mb-3">
                E-mail enviado!
              </h2>
              <p className="text-text-secondary text-base mb-6">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
              </p>
              <Button
                onClick={() => navigate(createPageUrl("auth"))}
                variant="outline"
                className="border-2 border-highlight text-highlight hover:bg-highlight/5 rounded-xl font-bold"
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
              className="text-highlight font-semibold hover:underline"
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
              className="text-highlight font-semibold hover:underline"
            >
              Voltar para o login
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
}