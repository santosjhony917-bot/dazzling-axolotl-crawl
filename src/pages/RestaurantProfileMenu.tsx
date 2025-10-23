import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImageUpload } from "@/hooks/useImageUpload";
import { RestaurantBottomNav } from "@/components/restaurant/RestaurantBottomNav";
import EditFieldDialog from "@/components/EditFieldDialog";
import { useRestaurant } from "@/hooks/useRestaurant";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Phone, Mail, Link as LinkIcon, Utensils } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type InputType = "text" | "number" | "email" | "tel";

export default function RestaurantProfileMenu() {
  const { restaurant, isLoading, updateRestaurantField } = useRestaurant();
  const { handleImageUpload } = useImageUpload();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Perfil do Restaurante</h1>
        <Skeleton className="h-48 w-full" />
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

  const handleLogoUpload = async (file: File) => {
    const url = await handleImageUpload(file, "restaurant_logos");
    if (url) {
      updateRestaurantField("image_url", url);
    }
  };

  const contactFields = [
    {
      label: "Telefone",
      key: "phone",
      icon: Phone,
      placeholder: "Adicionar telefone",
      type: "tel" as InputType,
    },
    {
      label: "Email",
      key: "email",
      icon: Mail,
      placeholder: "Adicionar email",
      type: "email" as InputType,
    },
    {
      label: "WhatsApp URL",
      key: "whatsapp_url",
      icon: LinkIcon,
      placeholder: "Adicionar link do WhatsApp",
      type: "text" as InputType,
    },
    {
      label: "iFood URL",
      key: "ifood_url",
      icon: Utensils,
      placeholder: "Adicionar link do iFood",
      type: "text" as InputType,
    },
    {
      label: "Outro Link",
      key: "other_url",
      icon: LinkIcon,
      placeholder: "Adicionar outro link",
      type: "text" as InputType,
    },
  ];

  const addressFields = [
    { label: "CEP", key: "cep", placeholder: "Adicionar CEP", type: "text" as InputType },
    { label: "Endereço", key: "address", placeholder: "Adicionar endereço", type: "text" as InputType },
    {
      label: "Bairro",
      key: "neighborhood",
      placeholder: "Adicionar bairro",
      type: "text" as InputType,
    },
    { label: "Cidade", key: "city", placeholder: "Adicionar cidade", type: "text" as InputType },
    { label: "Estado", key: "state", placeholder: "Adicionar estado", type: "text" as InputType },
    {
      label: "Latitude",
      key: "latitude",
      placeholder: "Adicionar latitude",
      type: "number" as InputType,
    },
    {
      label: "Longitude",
      key: "longitude",
      placeholder: "Adicionar longitude",
      type: "number" as InputType,
    },
  ];

  const renderField = (
    label: string,
    value: string | number | null | undefined,
    key: keyof typeof restaurant,
    placeholder: string,
    Icon?: React.ElementType,
    type: InputType = "text",
    isTextArea: boolean = false,
  ) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      </div>
      <EditFieldDialog
        initialValue={String(value || "")}
        onSave={(newValue) => updateRestaurantField(key, newValue)}
        label={label}
        type={type}
        isTextArea={isTextArea}
      >
        <p className="max-w-xs truncate text-right text-sm font-semibold">
          {value || `(${placeholder})`}
        </p>
      </EditFieldDialog>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Perfil do Restaurante</h1>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo/Image */}
          <div className="flex items-center space-x-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-full border bg-gray-100 dark:bg-gray-800">
              {restaurant.image_url ? (
                <img
                  src={restaurant.image_url}
                  alt="Logo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                  Logo
                </div>
              )}
            </div>
            <div>
              <Button
                onClick={() =>
                  document.getElementById("logo-upload")?.click()
                }
                size="sm"
              >
                {restaurant.image_url ? "Mudar Logo" : "Adicionar Logo"}
              </Button>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleLogoUpload(e.target.files[0]);
                  }
                }}
              />
            </div>
          </div>

          <Separator />

          {renderField("Nome", restaurant.name, "name", "Adicionar nome")}
          {renderField(
            "Descrição",
            restaurant.description,
            "description",
            "Adicionar descrição",
            undefined,
            "text",
            true,
          )}
          {renderField("CNPJ", restaurant.cnpj, "cnpj", "Adicionar CNPJ")}
          {renderField("Categoria", restaurant.category, "category", "Adicionar categoria")}
          <div className="flex items-center justify-between py-2">
            <p className="text-sm font-medium text-muted-foreground">Plano</p>
            <Badge className="capitalize">{restaurant.plan}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Contact Card */}
      <Card>
        <CardHeader>
          <CardTitle>Contato e Links</CardTitle>
        </CardHeader>
        <CardContent>
          {contactFields.map((field) =>
            renderField(
              field.label,
              restaurant[field.key as keyof typeof restaurant],
              field.key as keyof typeof restaurant,
              field.placeholder,
              field.icon,
              field.type,
            ),
          )}
        </CardContent>
      </Card>

      {/* Address Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>Localização</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {addressFields.map((field) =>
            renderField(
              field.label,
              restaurant[field.key as keyof typeof restaurant],
              field.key as keyof typeof restaurant,
              field.placeholder,
              undefined,
              field.type,
            ),
          )}
        </CardContent>
      </Card>

      {/* Opening Hours (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Horário de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Funcionalidade de horário de funcionamento em breve.
          </p>
          {/* TODO: Implement opening hours editor */}
        </CardContent>
      </Card>

      {/* Back to Dashboard */}
      <div className="pt-4">
        <Link to="/restaurant">
          <Button variant="outline" className="w-full">
            Voltar ao Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}