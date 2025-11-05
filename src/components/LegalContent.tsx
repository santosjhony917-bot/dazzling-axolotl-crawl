import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';

// Componente auxiliar para renderizar uma seção numerada
interface SectionProps {
  number: number;
  title: string;
  content: string;
}

const LegalSection: React.FC<SectionProps> = ({ number, title, content }) => (
  <div className="mb-6">
    <h3 className="text-lg font-bold text-[#022D68] mb-1">
      {number}. {title}
    </h3>
    <p className="text-gray-700 text-base leading-relaxed">{content}</p>
  </div>
);

// Conteúdo Mock para Termos de Uso
const TermsOfUseContent = () => (
  <div className="space-y-4">
    <p className="text-sm text-gray-500 mb-4">Última atualização: 01/10/2025</p>
    <LegalSection
      number={1}
      title="Aceitação dos Termos"
      content="Ao acessar ou usar o FilterFood, você concorda em cumprir estes Termos de Uso."
    />
    <LegalSection
      number={2}
      title="Descrição do Serviço"
      content="O FilterFood é uma plataforma que permite aos usuários encontrar e visualizar cardápios de restaurantes, enquanto os restaurantes podem gerenciar suas informações e promoções."
    />
    <LegalSection
      number={3}
      title="Cadastro e Conta"
      content="Para acessar certos recursos, você deve se registrar e criar uma conta. Você é responsável por manter a confidencialidade de sua conta e senha."
    />
    <LegalSection
      number={4}
      title="Responsabilidades do Restaurante"
      content="Os restaurantes são responsáveis por manter suas informações de cardápio, preços e promoções atualizadas e precisas."
    />
    <LegalSection
      number={5}
      title="Planos e Pagamentos"
      content="Oferecemos diferentes planos para restaurantes com vários recursos. Os pagamentos são processados através de um gateway de pagamento seguro."
    />
    <LegalSection
      number={6}
      title="Propriedade Intelectual"
      content="Todo o conteúdo do FilterFood, incluindo logotipos, textos e gráficos, é de nossa propriedade ou de nossos licenciadores e é protegido por leis de direitos autorais."
    />
    <LegalSection
      number={7}
      title="Limitação de Responsabilidade"
      content="Não nos responsabilizamos por quaisquer imprecisões nas informações do restaurante ou por perdas ou danos resultantes do uso do nosso serviço."
    />
    <LegalSection
      number={8}
      title="Modificações nos Termos"
      content="Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos os usuários sobre quaisquer alterações."
    />
    <LegalSection
      number={9}
      title="Contato"
      content="Se você tiver alguma dúvida sobre estes Termos, entre em contato conosco em [email protected]"
    />
  </div>
);

// Conteúdo Mock para Política de Privacidade
const PrivacyPolicyContent = () => (
  <div className="space-y-4">
    <p className="text-sm text-gray-500 mb-4">Última atualização: 01/10/2025</p>
    <LegalSection
      number={1}
      title="Coleta de Informações"
      content="Coletamos informações que você nos fornece diretamente, como nome, e-mail e localização, para fornecer e melhorar nossos serviços."
    />
    <LegalSection
      number={2}
      title="Uso da Localização"
      content="Utilizamos sua localização para mostrar restaurantes próximos e resultados de busca relevantes. Você pode gerenciar essa permissão nas configurações do seu dispositivo."
    />
    <LegalSection
      number={3}
      title="Compartilhamento de Dados"
      content="Não vendemos suas informações pessoais. Podemos compartilhar dados anonimizados com parceiros para fins de análise e marketing."
    />
    <LegalSection
      number={4}
      title="Segurança"
      content="Implementamos medidas de segurança robustas, incluindo criptografia e RLS (Row Level Security) no Supabase, para proteger seus dados contra acesso não autorizado."
    />
    <LegalSection
      number={5}
      title="Direitos do Usuário (LGPD)"
      content="Você tem o direito de acessar, corrigir ou solicitar a exclusão de seus dados pessoais a qualquer momento, conforme a Lei Geral de Proteção de Dados (LGPD)."
    />
  </div>
);


const LegalContent: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative bg-background-light font-sans antialiased flex min-h-screen w-full flex-col items-center max-w-md mx-auto">
      
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">FilterFood</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 w-full p-4 pt-0">
        <Card className="shadow-soft-xl border-none rounded-2xl bg-white p-0">
          <CardContent className="p-6">
            <Tabs defaultValue="termos" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-white shadow-none border-b border-gray-200 dark:border-gray-700 rounded-none">
                <TabsTrigger 
                  value="termos" 
                  className="flex flex-col h-auto py-3 px-1 data-[state=active]:border-b-2 data-[state=active]:border-highlight data-[state=active]:text-highlight text-gray-600 font-bold rounded-none"
                >
                  Termos de Uso
                </TabsTrigger>
                <TabsTrigger 
                  value="privacidade" 
                  className="flex flex-col h-auto py-3 px-1 data-[state=active]:border-b-2 data-[state=active]:border-highlight data-[state=active]:text-highlight text-gray-600 font-bold rounded-none"
                >
                  Privacidade
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
                <TabsContent value="termos">
                  <h1 className="text-3xl font-bold text-[#022D68] mb-4">Termos de Uso</h1>
                  <TermsOfUseContent />
                </TabsContent>
                <TabsContent value="privacidade">
                  <h1 className="text-3xl font-bold text-[#022D68] mb-4">Política de Privacidade</h1>
                  <PrivacyPolicyContent />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default LegalContent;