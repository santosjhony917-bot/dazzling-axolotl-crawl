"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth/AuthProvider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  MapPin,
  Image as ImageIcon,
  Save,
  Loader2,
  Building,
  Phone,
  Mail,
  Globe,
  Link as LinkIcon,
  Clock,
  CreditCard,
  Instagram,
  Facebook,
  Twitter,
} from "lucide-react";
import { EditAddressDialog } from "@/components/EditAddressDialog";
import { ImageUploadDialog } from "@/components/ImageUploadDialog";
import { TimeInput } from "@/components/ui/time-input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { paymentMethods, restaurantCategories } from "@/lib/options";
import { SocialNetworkInput } from "@/components/SocialNetworkInput";
import { RestaurantHeader } from "@/components/RestaurantHeader";

const daysOfWeek = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const dayLabels = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isImageUploadOpen, setIsImageUploadOpen] = useState(false);
  const [imageType, setImageType] = useState("image_url"); // 'image_url' or 'cover_image_url'

  const fetchRestaurant = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setRestaurant({
          ...data,
          opening_hours: data.opening_hours || {},
          payment_methods: data.payment_methods || [],
          social_networks: data.social_networks || [],
        });
      }
    } catch (error) {
      toast.error("Erro ao carregar os dados do restaurante.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setRestaurant((prev) => ({ ...prev, [id]: value }));
  };

  const handleOpeningHoursChange = (day, field, value) => {
    setRestaurant((prev) => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours?.[day],
          [field]: value,
        },
      },
    }));
  };

  const handlePaymentMethodChange = (method) => {
    setRestaurant((prev) => {
      const currentMethods = prev.payment_methods || [];
      const newMethods = currentMethods.includes(method)
        ? currentMethods.filter((m) => m !== method)
        : [...currentMethods, method];
      return { ...prev, payment_methods: newMethods };
    });
  };

  const handleSocialNetworkChange = (platform, url) => {
    setRestaurant((prev) => {
      const existing = prev.social_networks.find(
        (sn) => sn.platform === platform
      );
      if (existing) {
        return {
          ...prev,
          social_networks: prev.social_networks.map((sn) =>
            sn.platform === platform ? { ...sn, url } : sn
          ),
        };
      } else {
        return {
          ...prev,
          social_networks: [...prev.social_networks, { platform, url }],
        };
      }
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .update({
          name: restaurant.name,
          description: restaurant.description,
          phone: restaurant.phone,
          email: restaurant.email,
          category: restaurant.category,
          whatsapp_url: restaurant.whatsapp_url,
          ifood_url: restaurant.ifood_url,
          other_url: restaurant.other_url,
          other_url_label: restaurant.other_url_label,
          opening_hours: restaurant.opening_hours,
          payment_methods: restaurant.payment_methods,
          social_networks: restaurant.social_networks,
        })
        .eq("id", restaurant.id);

      if (error) {
        throw error;
      }
      toast.success("Perfil atualizado com sucesso!");
      fetchRestaurant();
    } catch (error) {
      toast.error("Erro ao atualizar o perfil.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (type) => {
    setImageType(type);
    setIsImageUploadOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Nenhum restaurante encontrado. Crie um primeiro.</p>
      </div>
    );
  }

  return (
    <>
      <RestaurantHeader restaurant={restaurant} />
      <div className="p-4 md:p-6 space-y-6 pb-24">
        <form onSubmit={handleUpdate}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" /> Informações Gerais
              </CardTitle>
              <CardDescription>
                Atualize os detalhes do seu restaurante.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Restaurante</Label>
                <Input
                  id="name"
                  value={restaurant.name || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={restaurant.description || ""}
                  onChange={handleInputChange}
                  placeholder="Conte um pouco sobre seu restaurante..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={restaurant.category || ""}
                  onValueChange={(value) =>
                    setRestaurant((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurantCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleImageUpload("image_url")}
                  className="w-full"
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Alterar Logo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleImageUpload("cover_image_url")}
                  className="w-full"
                >
                  <ImageIcon className="mr-2 h-4 w-4" /> Alterar Capa
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Endereço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 text-sm text-gray-600">
                <p>{`${restaurant.address || ""}, ${restaurant.number || ""}`}</p>
                <p>{`${restaurant.neighborhood || ""}, ${
                  restaurant.city || ""
                } - ${restaurant.state || ""}`}</p>
                <p>{`CEP: ${restaurant.cep || ""}`}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                onClick={() => setIsAddressDialogOpen(true)}
              >
                Editar Endereço
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" /> Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={restaurant.phone || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Contato</Label>
                <Input
                  id="email"
                  type="email"
                  value={restaurant.email || ""}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" /> Links Externos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="whatsapp_url">WhatsApp</Label>
                <Input
                  id="whatsapp_url"
                  placeholder="https://wa.me/55119..."
                  value={restaurant.whatsapp_url || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ifood_url">iFood</Label>
                <Input
                  id="ifood_url"
                  placeholder="https://ifood.com.br/..."
                  value={restaurant.ifood_url || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other_url_label">Outro Link (Nome)</Label>
                <Input
                  id="other_url_label"
                  placeholder="Ex: Cardápio Digital"
                  value={restaurant.other_url_label || ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="other_url">Outro Link (URL)</Label>
                <Input
                  id="other_url"
                  placeholder="https://seu-site.com/..."
                  value={restaurant.other_url || ""}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> Redes Sociais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SocialNetworkInput
                platform="instagram"
                label="Instagram"
                icon={<Instagram className="h-5 w-5" />}
                value={
                  restaurant.social_networks.find(
                    (sn) => sn.platform === "instagram"
                  )?.url || ""
                }
                onChange={handleSocialNetworkChange}
              />
              <SocialNetworkInput
                platform="facebook"
                label="Facebook"
                icon={<Facebook className="h-5 w-5" />}
                value={
                  restaurant.social_networks.find(
                    (sn) => sn.platform === "facebook"
                  )?.url || ""
                }
                onChange={handleSocialNetworkChange}
              />
              <SocialNetworkInput
                platform="twitter"
                label="Twitter / X"
                icon={<Twitter className="h-5 w-5" />}
                value={
                  restaurant.social_networks.find(
                    (sn) => sn.platform === "twitter"
                  )?.url || ""
                }
                onChange={handleSocialNetworkChange}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" /> Horário de Funcionamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {daysOfWeek.map((day) => (
                <div key={day} className="space-y-2 p-3 border rounded-md">
                  <div className="flex items-center justify-between">
                    <Label>{dayLabels[day]}</Label>
                    <Switch
                      checked={restaurant.opening_hours?.[day]?.isOpen || false}
                      onCheckedChange={(checked) =>
                        handleOpeningHoursChange(day, "isOpen", checked)
                      }
                    />
                  </div>
                  {restaurant.opening_hours?.[day]?.isOpen && (
                    <div className="flex items-center gap-2">
                      <TimeInput
                        value={restaurant.opening_hours?.[day]?.open || "08:00"}
                        onChange={(value) =>
                          handleOpeningHoursChange(day, "open", value)
                        }
                      />
                      <span>às</span>
                      <TimeInput
                        value={
                          restaurant.opening_hours?.[day]?.close || "22:00"
                        }
                        onChange={(value) =>
                          handleOpeningHoursChange(day, "close", value)
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Formas de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="flex items-center gap-2">
                  <Switch
                    id={method.id}
                    checked={(restaurant.payment_methods || []).includes(
                      method.label
                    )}
                    onCheckedChange={() =>
                      handlePaymentMethodChange(method.label)
                    }
                  />
                  <Label htmlFor={method.id}>{method.label}</Label>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 bg-white p-4 border-t shadow-top-md z-10">
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </div>

      <EditAddressDialog
        open={isAddressDialogOpen}
        onOpenChange={setIsAddressDialogOpen}
        restaurant={restaurant}
        onAddressUpdate={fetchRestaurant}
      />

      <ImageUploadDialog
        open={isImageUploadOpen}
        onOpenChange={setIsImageUploadOpen}
        restaurantId={restaurant.id}
        imageType={imageType}
        onUploadSuccess={() => {
          fetchRestaurant();
          setIsImageUploadOpen(false);
        }}
      />
    </>
  );
}