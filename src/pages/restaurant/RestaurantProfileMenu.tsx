import React, { useState } from 'react';
import { Home, Check, Store, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { showSuccess, showError } from '@/utils/toast';

// Mock data for demonstration
const restaurantLogo = "https://via.placeholder.com/150?text=Logo";

const RestaurantProfileMenu: React.FC = () => {
  // Chamando sem ID, pois esta é a tela de menu principal, que pode depender do usuário logado
  const { restaurant, updateRestaurant, loading } = useRestaurantProfile();
  const { uploadImage, uploading } = useImageUpload();
  const [isSaving, setIsSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#E47948]" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="p-4 text-center text-gray-500">Restaurante não encontrado.</div>;
  }

  const handleFileSelect = async (file: File, type: 'logo' | 'cover') => {
    if (!restaurant.id) {
      showError("ID do restaurante não disponível.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showError("O arquivo é muito grande. O limite é de 5MB.");
      return;
    }

    const { url, error } = await uploadImage(file, 'restaurant_images', restaurant.id, type);

    if (error) {
      showError(`Falha ao fazer upload da imagem: ${error.message}`);
      return;
    }

    // Update the database with the new URL
    const fieldToUpdate = type === 'logo' ? 'logo_url' : 'cover_url';
    
    setIsSaving(true);
    const updateResult = await updateRestaurant({ [fieldToUpdate]: url });
    setIsSaving(false);

    // Corrigido: Acessando a mensagem de erro corretamente
    if (updateResult.error) {
      showError(`Falha ao atualizar o perfil: ${updateResult.error.message}`);
    } else {
      showSuccess("Imagem atualizada com sucesso!");
    }
  };

  const handleNavigation = (path: string) => {
    console.log(`Navigating to: ${path}`);
    // In a real app, use react-router-dom or similar for navigation
  };

  const menuItems = [
    { title: "Informações Básicas", description: "Nome, endereço, contato e plano.", path: "/restaurant/info" },
    { title: "Horário de Funcionamento", description: "Defina os horários de abertura e fechamento.", path: "/restaurant/hours" },
    { title: "Cardápio e Produtos", description: "Gerencie categorias e itens do seu menu.", path: "/restaurant/menu" },
    { title: "Configurações de Pagamento", description: "Opções de pagamento e taxas.", path: "/restaurant/payment" },
    { title: "Avaliações e Feedback", description: "Veja o que seus clientes estão dizendo.", path: "/restaurant/reviews" },
  ];

  // Cor principal do app (assumindo ser o azul marinho)
  const primaryBlue = "text-[#1E3A8A]"; // Exemplo de azul marinho
  const primaryBlueBg = "bg-[#1E3A8A]";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-10 w-full flex justify-center">
        <div className="w-full max-w-md p-4 flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => handleNavigation('/')}>
            <Home className="h-5 w-5 text-gray-600" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-800">Perfil do Restaurante</h1>
          <div className="w-5"></div> {/* Placeholder for alignment */}
        </div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-md pt-20 pb-24">
        <div className="w-full p-4 text-center">
          
          {/* Ícone Central (Estilo Hub) */}
          <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-3 ${primaryBlueBg}`}>
            <Store className="h-6 w-6 text-white" />
          </div>

          {/* Título */}
          <h1 className={`text-2xl font-bold mb-1 ${primaryBlue}`}>
            {restaurant.name || "Restaurante Teste Free"}
          </h1>

          {/* Subtítulo */}
          <p className="text-sm text-gray-600 mb-6">
            Gerencie as informações do seu estabelecimento.
          </p>
        </div>

        {/* Bloco de Status/Logo (Realocado para o início do conteúdo) */}
        <Card className="mx-4 mb-6 shadow-lg">
          <CardContent className="p-4 flex items-center space-x-4">
            <div className="relative w-16 h-16 rounded-full border-4 border-white bg-gray-200 dark:bg-gray-600 shrink-0 shadow-md">
              <img 
                src={restaurant?.logo_url || restaurantLogo} 
                alt="Logo do Restaurante" 
                className="w-full h-full object-cover rounded-full"
              />
              <ImageUploadButton
                onFileSelect={(file) => handleFileSelect(file, 'logo')}
                uploading={uploading}
                className="absolute bottom-0 right-0 h-5 w-5 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90"
                variant="default"
                size="icon"
              >
                <Camera className="h-3 w-3" />
              </ImageUploadButton>
            </div>
            
            <div className="flex-1">
              <p className="text-lg font-semibold text-gray-800">Status do Perfil</p>
              <div className="flex space-x-2 mt-1">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <Check className="h-3 w-3 mr-1" /> Verificado
                </Badge>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                  {restaurant.plan === 'premium' ? 'Premium' : 'Free'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Menu de Navegação */}
        <Card className="mx-4 shadow-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-lg font-semibold text-gray-800">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <React.Fragment key={item.path}>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-4 h-auto rounded-none hover:bg-gray-100"
                  onClick={() => handleNavigation(item.path)}
                >
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <span className="text-gray-400 text-xl">&gt;</span>
                </Button>
                {index < menuItems.length - 1 && <Separator className="mx-4 w-auto" />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RestaurantProfileMenu;