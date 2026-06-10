import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Users, 
  Utensils, 
  Store, 
  MapPin, 
  TrendingUp, 
  CheckCircle2, 
  ArrowRight, 
  Search, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { useAuthData } from '@/context/AuthContext';

const LOGO_URL = "/assets/filterfood-logo.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuthData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleClientCTA = () => {
    if (user) {
      navigate('/home');
    } else {
      navigate('/auth');
    }
  };

  const handleRestaurantCTA = () => {
    navigate('/restaurant-area-hub');
  };

  const handleClaimCTA = () => {
    navigate('/restaurant-area/claim');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-highlight selection:text-white overflow-x-hidden">
      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <img src={LOGO_URL} alt="GrubGo Logo" className="h-10 w-auto mr-3" />
            <span className="text-xl font-bold tracking-tight text-white hidden sm:block">
              Grub<span className="text-highlight">Go</span>
            </span>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Como Funciona</a>
            <a href="#restaurants" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Para Restaurantes</a>
            <a href="#statistics" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Números</a>
          </nav>

          {/* Nav Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={handleRestaurantCTA}
              className="text-slate-300 hover:text-white transition-all text-sm font-medium px-4 py-2 rounded-lg border border-slate-700 hover:border-slate-500"
            >
              Área do Restaurante
            </button>
            <button 
              onClick={handleClientCTA}
              className="bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white font-semibold text-sm px-5 py-2.5 rounded-2xl transition-all shadow-none hover:shadow-[#EF2A39]/10 flex items-center gap-1.5"
            >
              Acessar Aplicativo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-6 flex flex-col gap-4"
          >
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-300 hover:text-white py-2 text-base font-medium"
            >
              Como Funciona
            </a>
            <a 
              href="#restaurants" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-300 hover:text-white py-2 text-base font-medium"
            >
              Para Restaurantes
            </a>
            <a 
              href="#statistics" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-slate-300 hover:text-white py-2 text-base font-medium"
            >
              Números
            </a>
            <div className="h-px bg-slate-800 my-2" />
            <button 
              onClick={() => { setMobileMenuOpen(false); handleRestaurantCTA(); }}
              className="w-full text-center text-slate-300 hover:text-white py-2.5 rounded-lg border border-slate-700 font-medium"
            >
              Área do Restaurante
            </button>
            <button 
              onClick={() => { setMobileMenuOpen(false); handleClientCTA(); }}
              className="w-full bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white font-semibold py-2.5 rounded-2xl text-center flex items-center justify-center gap-1.5 shadow-none"
            >
              Acessar Aplicativo
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a1428] to-slate-900">
        {/* Ambient Blur Graphics */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-highlight/10 rounded-full blur-[120px] pointer-events-none z-0"></div>
        <div className="absolute top-1/3 left-1/4 -translate-y-1/2 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Heading & Subtext */}
            <div className="lg:col-span-7 text-center lg:text-left flex flex-col items-center lg:items-start">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 bg-highlight/10 border border-highlight/25 px-4 py-1.5 rounded-full text-[#EF2A39] text-sm font-semibold mb-6"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                O buscador inteligente de cardápios de João Pessoa
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6"
              >
                Encontre o prato perfeito pelo <span className="bg-gradient-to-r from-[#EF2A39] to-[#EF2A39]/80 bg-clip-text text-transparent">preço que deseja pagar</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-lg text-slate-300 max-w-2xl mb-8 leading-relaxed"
              >
                Chega de abrir aplicativo por aplicativo. Use nossa Inteligência Artificial para achar combos econômicos no seu orçamento, comparar cardápios reais e organizar Happy Hours com seus amigos.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
              >
                <button
                  onClick={handleClientCTA}
                  className="bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-none hover:shadow-[#EF2A39]/12 flex items-center justify-center gap-2"
                >
                  Buscar Restaurantes
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRestaurantCTA}
                  className="bg-slate-800/80 hover:bg-slate-800 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-all border border-slate-700 hover:border-slate-500 flex items-center justify-center gap-2"
                >
                  Sou Proprietário
                </button>
              </motion.div>

              {/* Search Bar Preview */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="mt-12 p-1.5 bg-slate-800/40 backdrop-blur-sm border border-slate-700 rounded-2xl w-full max-w-xl flex items-center shadow-none"
              >
                <div className="pl-3 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  type="text" 
                  disabled
                  placeholder="Ex: Combo de lanches para casal por até R$ 80" 
                  className="bg-transparent border-none text-slate-300 placeholder:text-slate-500 text-sm focus:outline-none flex-grow px-3 py-2 cursor-default"
                />
                <button 
                  onClick={handleClientCTA}
                  className="bg-slate-700 hover:bg-highlight text-white font-semibold text-xs px-4 py-2.5 rounded-2xl transition-all"
                >
                  Pesquisar IA
                </button>
              </motion.div>
            </div>

            {/* Right Column: Visual Device Mockup */}
            <div className="lg:col-span-5 flex justify-center items-center relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="relative w-[300px] h-[610px] bg-slate-950 rounded-[50px] p-3 shadow-none border-4 border-slate-800 flex flex-col overflow-hidden z-10 group"
              >
                {/* Phone Speaker & Camera Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-slate-950 rounded-b-3xl z-30 flex items-center justify-center">
                  <div className="w-12 h-1 bg-slate-800 rounded-full mb-2"></div>
                </div>

                {/* Simulated Screen Content */}
                <div className="flex-grow bg-background-light rounded-[40px] overflow-y-auto overflow-x-hidden flex flex-col relative pt-8 pb-4 text-slate-900 select-none">
                  {/* Simulated App Header */}
                  <div className="bg-gradient-to-br from-primary to-[#011b3e] text-white p-5 pt-6 pb-8 rounded-b-[30px] shadow-none flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#EF2A39]">Assistente Gourmet</span>
                      <Sparkles className="w-4 h-4 text-[#EF2A39] animate-pulse" />
                    </div>
                    <span className="text-lg font-bold leading-tight">Monte seu Combo Ideal!</span>
                  </div>

                  {/* Simulated Chat bubble */}
                  <div className="px-4 mt-4 flex flex-col gap-3">
                    <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-none text-xs border border-slate-100 max-w-[85%] self-start text-slate-700">
                      💡 *"Quero comer lanche com meu namorado e gastar até R$ 70"*
                    </div>

                    {/* Simulated IA Response */}
                    <div className="bg-primary text-white p-3.5 rounded-2xl rounded-tr-none shadow-none text-xs max-w-[88%] self-end flex flex-col gap-2">
                      <span>🤖 **Encontrei a melhor opção na sua região!**</span>
                      <span className="text-[11px] text-slate-200">No *Meu Hot Dog*, montei este combo especial para 2 pessoas:</span>
                      
                      {/* Combo Items */}
                      <div className="bg-white/10 rounded-2xl p-2.5 flex flex-col gap-1.5 text-[11px]">
                        <div className="flex justify-between font-semibold">
                          <span>2x Hot Dog Especial</span>
                          <span>R$ 38,00</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>1x Batata Frita Média</span>
                          <span>R$ 16,00</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span>2x Suco de Laranja</span>
                          <span>R$ 12,00</span>
                        </div>
                        <div className="h-px bg-white/20 my-1" />
                        <div className="flex justify-between font-bold text-[#EF2A39]">
                          <span>Total do Combo</span>
                          <span>R$ 66,00</span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center text-[10px] bg-highlight/20 text-[#EF2A39] px-2 py-1 rounded-lg border border-highlight/20">
                        <span>Economia Real</span>
                        <span className="font-bold">R$ 4,00</span>
                      </div>
                    </div>
                  </div>

                  {/* Simulated Restaurant Card */}
                  <div className="px-4 mt-4">
                    <div className="bg-white rounded-2xl p-3 shadow-none border border-slate-100 flex flex-col gap-2">
                      <div className="relative h-24 rounded-2xl overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400')` }}>
                        <div className="absolute inset-0 bg-slate-900/40"></div>
                        <span className="absolute bottom-2 left-2 text-white font-bold text-xs bg-slate-900/60 px-2 py-0.5 rounded-md">Bancários</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-xs">Meu Hot Dog - Self Service</h4>
                          <p className="text-[10px] text-slate-500">Lanchonete e Hamburgueria</p>
                        </div>
                        <div className="flex items-center gap-0.5 bg-[#EF2A39]/10 text-[#EF2A39] px-1.5 py-0.5 rounded text-[10px] font-bold">
                          ★ 4.5
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Floating Action Button */}
                  <div className="absolute bottom-4 right-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-3 rounded-full shadow-none border border-white/20">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                </div>

                {/* Simulated Phone Home Bar */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-800 rounded-full"></div>
              </motion.div>

              {/* Decorative Background Elements */}
              <div className="absolute -right-4 top-20 w-32 h-32 bg-highlight/10 rounded-full blur-xl border border-highlight/20 z-0"></div>
              <div className="absolute -left-12 bottom-10 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl border border-blue-500/20 z-0"></div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-950 border-t border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-base text-highlight font-bold uppercase tracking-wider mb-3">Funcionalidades Incríveis</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Tudo o que você precisa para escolher onde e o que comer
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Combo Finder */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="p-8 bg-slate-900/60 rounded-3xl border border-slate-800/80 shadow-none relative overflow-hidden group"
            >
              <div className="w-12 h-12 bg-highlight/10 border border-highlight/25 rounded-2xl flex items-center justify-center text-[#EF2A39] mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Assistente Gourmet IA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Digite o quanto quer gastar e para quantas pessoas. Nosso algoritmo inteligente vasculha os cardápios de João Pessoa e monta combos ideais sob medida, garantindo economia real.
              </p>
            </motion.div>

            {/* Feature 2: Happy Hour */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="p-8 bg-slate-900/60 rounded-3xl border border-slate-800/80 shadow-none relative overflow-hidden group"
            >
              <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/25 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Happy Hour Coletivo</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Reúna amigos em salas virtuais de votação. Cada participante adiciona seus restaurantes favoritos e vota em tempo real. O app calcula o vencedor democraticamente e possui chat integrado.
              </p>
            </motion.div>

            {/* Feature 3: Scraped Menus */}
            <motion.div 
              whileHover={{ y: -6 }}
              className="p-8 bg-slate-900/60 rounded-3xl border border-slate-800/80 shadow-none relative overflow-hidden group"
            >
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/25 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Cardápios Atualizados com IA</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Nosso robô de varredura automatizada localiza, extrai e limpa dados de cardápios reais, mídias sociais e fotos de restaurantes diariamente, mantendo tudo atualizado sem erros.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* For Restaurant Owners Section */}
      <section id="restaurants" className="py-24 bg-slate-900 relative overflow-hidden border-t border-slate-950">
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-highlight/5 rounded-full blur-[100px] pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left Column: Visual Mockup */}
            <div className="order-2 lg:order-1 flex justify-center">
              <motion.div 
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="bg-slate-950 rounded-3xl p-8 border border-slate-800 shadow-none max-w-lg w-full flex flex-col gap-6"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-highlight/10 rounded-2xl flex items-center justify-center text-[#EF2A39]">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Portal do Proprietário</h4>
                      <p className="text-xs text-slate-400">GrubGo Business</p>
                    </div>
                  </div>
                  <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">Grátis</span>
                </div>

                <div className="flex flex-col gap-4 text-sm text-slate-300">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-highlight mt-0.5 flex-shrink-0" />
                    <span>Seu restaurante já possui uma página pré-cadastrada no app com fotos e notas coletadas pelo nosso robô.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-highlight mt-0.5 flex-shrink-0" />
                    <span>Ao reivindicar seu perfil, você ganha acesso total para editar seu cardápio, fotos de capa, horários e links do Instagram.</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-highlight mt-0.5 flex-shrink-0" />
                    <span>Clientes locais poderão falar diretamente com você pelo WhatsApp oficial de vendas. Sem taxas, sem comissão por pedido!</span>
                  </div>
                </div>

                <div className="h-px bg-slate-800 my-2" />

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleClaimCTA}
                    className="w-full bg-highlight hover:bg-[#EF2A39]/90 text-white font-bold py-3 rounded-2xl transition-all shadow-none text-center"
                  >
                    Reivindicar meu Restaurante
                  </button>
                  <button 
                    onClick={handleRestaurantCTA}
                    className="w-full bg-slate-900 hover:bg-slate-850 text-slate-300 font-semibold py-3 rounded-2xl transition-all text-center border border-slate-700"
                  >
                    Criar Conta de Proprietário
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Right Column: Copywriting */}
            <div className="order-1 lg:order-2">
              <h2 className="text-base text-highlight font-bold uppercase tracking-wider mb-3">Para Proprietários</h2>
              <h3 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight mb-6">
                Seu restaurante já está no GrubGo. Reivindique agora!
              </h3>
              <p className="text-slate-300 mb-8 leading-relaxed">
                Varremos João Pessoa e pré-cadastramos os principais locais de alimentação. Reivindicando seu restaurante de forma 100% gratuita, você garante que as informações dos seus pratos estejam corretas e direciona clientes diretamente para o seu WhatsApp de entrega.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-highlight/10 flex items-center justify-center text-[#EF2A39]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">Exposição Local Grátis</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-highlight/10 flex items-center justify-center text-[#EF2A39]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">Aumento de Vendas</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-highlight/10 flex items-center justify-center text-[#EF2A39]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">Atualização em Segundos</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-highlight/10 flex items-center justify-center text-[#EF2A39]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200">Público Filtrado por Bairro</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="statistics" className="py-20 bg-slate-950 border-t border-b border-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-base text-highlight font-bold uppercase tracking-wider mb-3">Nossos Números em João Pessoa</h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white">
              Crescemos diariamente para catalogar todo o polo gastronômico da cidade
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {/* Stat 1 */}
            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800">
              <span className="block text-4xl sm:text-5xl font-extrabold text-highlight mb-2">54</span>
              <span className="text-sm text-slate-400 font-medium">Bairros Varridos</span>
            </div>
            {/* Stat 2 */}
            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800">
              <span className="block text-4xl sm:text-5xl font-extrabold text-highlight mb-2">1.500+</span>
              <span className="text-sm text-slate-400 font-medium">Restaurantes Únicos</span>
            </div>
            {/* Stat 3 */}
            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800">
              <span className="block text-4xl sm:text-5xl font-extrabold text-highlight mb-2">5</span>
              <span className="text-sm text-slate-400 font-medium">Categorias Principais</span>
            </div>
            {/* Stat 4 */}
            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800">
              <span className="block text-4xl sm:text-5xl font-extrabold text-highlight mb-2">100%</span>
              <span className="text-sm text-slate-400 font-medium">Automação de Contatos</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-24 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-slate-900 via-[#0a1428] to-slate-900 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-highlight/10 rounded-full blur-[110px] pointer-events-none z-0"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight mb-6">
            Pronto para economizar escolhendo sua refeição?
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-10">
            Acesse o aplicativo web agora mesmo e encontre os melhores restaurantes de João Pessoa organizados pelo preço e bairros de entrega.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleClientCTA}
              className="bg-[#EF2A39] hover:bg-[#EF2A39]/90 text-white font-bold text-lg px-8 py-4 rounded-2xl transition-all shadow-none hover:shadow-[#EF2A39]/12 flex items-center justify-center gap-2"
            >
              Começar a Usar Grátis
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleClaimCTA}
              className="bg-slate-850 hover:bg-slate-800 text-slate-200 font-semibold text-lg px-8 py-4 rounded-2xl transition-all border border-slate-700 hover:border-slate-500 flex items-center justify-center gap-2"
            >
              Reivindicar meu Restaurante
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-16 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            
            {/* Column 1: App Info */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center">
                <img src={LOGO_URL} alt="GrubGo Logo" className="h-9 w-auto mr-3" />
                <span className="text-lg font-bold text-white">Grub<span className="text-highlight">Go</span></span>
              </div>
              <p className="text-sm text-slate-500">
                O maior indexador e buscador inteligente de cardápios de João Pessoa - PB.
              </p>
            </div>

            {/* Column 2: App Links */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Aplicativo</h4>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><button onClick={handleClientCTA} className="hover:text-white transition-colors">Buscar Comida</button></li>
                <li><button onClick={() => navigate('/auth')} className="hover:text-white transition-colors">Entrar / Cadastrar</button></li>
                <li><button onClick={handleRestaurantCTA} className="hover:text-white transition-colors">Painel do Restaurante</button></li>
                <li><button onClick={handleClaimCTA} className="hover:text-white transition-colors">Reivindicar Estabelecimento</button></li>
              </ul>
            </div>

            {/* Column 3: Institutional */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Institucional</h4>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><a href="/help-center" className="hover:text-white transition-colors">Central de Ajuda</a></li>
                <li><a href="/legal" className="hover:text-white transition-colors">Termos e Privacidade</a></li>
              </ul>
            </div>

            {/* Column 4: Help */}
            <div className="flex flex-col gap-4">
              <h4 className="text-white font-semibold text-sm mb-4">Contato & Suporte</h4>
              <p className="text-sm text-slate-500">
                Dúvidas ou sugestões? Fale com nosso suporte técnico local.
              </p>
              <a 
                href="mailto:suporte@grubgo.com.br"
                className="text-sm text-[#EF2A39] hover:text-[#EF2A39]/80 font-semibold"
              >
                suporte@grubgo.com.br
              </a>
            </div>

          </div>

          <div className="h-px bg-slate-900 mb-8" />

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
            <span>
              © 2026 GrubGo. Todos os direitos reservados.
            </span>
            <span className="flex items-center gap-1">
              Desenvolvido com carinho para João Pessoa - PB
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
