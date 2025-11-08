"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function ImageUploadDialog({
  open,
  onOpenChange,
  restaurantId,
  imageType,
  onUploadSuccess,
}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !restaurantId) return;

    setLoading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${restaurantId}-${imageType}-${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`;

      // Assumes a bucket named 'restaurant-images' exists
      const { error: uploadError } = await supabase.storage
        .from("restaurant-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("restaurant-images")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ [imageType]: publicUrl })
        .eq("id", restaurantId);

      if (updateError) {
        throw updateError;
      }

      toast.success("Imagem atualizada com sucesso!");
      onUploadSuccess();
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Erro ao enviar a imagem.");
    } finally {
      setLoading(false);
      setFile(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {imageType === "image_url" ? "Alterar Logo" : "Alterar Imagem de Capa"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="picture">Imagem</Label>
            <Input id="picture" type="file" onChange={handleFileChange} accept="image/*" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}