import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Utensils, TrendingUp, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/hooks/useImageUpload";
import { RestaurantBottomNav } from "@/components/restaurant/RestaurantBottomNav";
import { useRestaurant } from "@/hooks/useRestaurant";
import { useUserRole } from "@/hooks/useUserRole";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import EditableField from "@/components/EditableField";
import { z } from "zod";

// Mock data for demonstration
const mockStats = [
  {
    title: "Total Sales",
    value: "R$ 45,231.89",
    change: "+20.1% from last month",
    icon: DollarSign,
  },
  {
    title: "New Customers",
    value: "+2,350",
    change: "+180.1% from last month",
    icon: Users,
  },
  {
    title: "Menu Items",
    value: "124",
    change: "+19% from last month",
    icon: Utensils,
  },
  {
    title: "Avg. Order Value",
    value: "R$ 55.78",
    change: "+1.2% from last month",
    icon: TrendingUp,
  },
];

// Schemas for validation
const nameSchema = z.string().min(3, "Nome deve ter no mínimo 3 caracteres.");
const descriptionSchema = z.string().max(500, "Descrição muito longa.").optional().or(z.literal(''));


export default function RestaurantDashboard() {
  const { restaurant, isLoading, updateRestaurantField } = useRestaurant();
  const { role } = useUserRole();
  const { handleImageUpload } = useImageUpload();

  const isPremium = role === "premium_restaurant";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {mockStats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="mt-1 h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-lg text-muted-foreground">
          Nenhum restaurante encontrado.
        </p>
      </div>
    );
  }

  const handleCoverImageUpload = async (file: File) => {
    const url = await handleImageUpload(file, "restaurant_covers");
    if (url) {
      // Note: updateRestaurantField expects string | number | null
      updateRestaurantField("cover_image_url", url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {restaurant.name} Dashboard
        </h1>
        <Badge variant={isPremium ? "default" : "secondary"}>
          {isPremium ? "Premium" : "Free Plan"}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {mockStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Restaurant Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cover Image */}
          <div className="relative h-48 w-full overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
            {restaurant.cover_image_url ? (
              <img
                src={restaurant.cover_image_url}
                alt="Cover"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Adicione uma imagem de capa
              </div>
            )}
            <div className="absolute bottom-2 right-2">
              <Button
                onClick={() =>
                  document.getElementById("cover-image-upload")?.click()
                }
                size="sm"
              >
                {restaurant.cover_image_url ? "Mudar Imagem" : "Adicionar Imagem"}
              </Button>
              <input
                id="cover-image-upload"
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleCoverImageUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Nome</p>
            <EditableField
              initialValue={restaurant.name}
              onSave={(value) => updateRestaurantField("name", value)}
              label="Nome do Restaurante"
              validationSchema={nameSchema}
              icon={<Building2 className="h-6 w-6 text-primary" />}
            >
              <p className="font-semibold">{restaurant.name}</p>
            </EditableField>
          </div>

          {/* Description */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Descrição
            </p>
            <EditableField
              initialValue={restaurant.description || ""}
              onSave={(value) => updateRestaurantField("description", value)}
              label="Descrição do Restaurante"
              isTextArea={true}
              validationSchema={descriptionSchema}
              icon={<FileText className="h-6 w-6 text-primary" />}
            >
              <p className="max-w-xs truncate text-right text-sm text-gray-600 dark:text-gray-400">
                {restaurant.description || "Adicionar descrição"}
              </p>
            </EditableField>
          </div>

          {/* Plan */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Plano</p>
            <p className="font-semibold capitalize">{restaurant.plan}</p>
          </div>

          {/* Link to Menu */}
          <div className="pt-4">
            <Link to="/restaurant-area/menu">
              <Button className="w-full">Gerenciar Menu</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Premium Feature Callout */}
      {!isPremium && (
        <Card className="border-accent bg-accent/10">
          <CardHeader>
            <CardTitle className="text-accent">
              Desbloqueie Recursos Premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Faça upgrade para o plano Premium para acessar análises avançadas,
              recursos de marketing e maior visibilidade.
            </p>
            <Link to="/restaurant-area/upgrade">
              <Button className="mt-4 bg-accent hover:bg-accent/90">
                Fazer Upgrade Agora
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}