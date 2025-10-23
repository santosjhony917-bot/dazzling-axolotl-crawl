import { useState } from "react";
import { createClient } from "@/integrations/supabase/client";
import toast from "react-hot-toast";

const supabase = createClient();

interface UseImageUploadResult {
  handleImageUpload: (file: File, bucket: string) => Promise<string | null>;
  uploading: boolean;
}

export function useImageUpload(): UseImageUploadResult {
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (
    file: File,
    bucket: string,
  ): Promise<string | null> => {
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    setUploading(false);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      toast.error("Falha ao fazer upload da imagem.");
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    if (!data.publicUrl) {
      toast.error("Falha ao obter URL pública.");
      return null;
    }

    toast.success("Imagem enviada com sucesso!");
    return data.publicUrl;
  };

  return { handleImageUpload, uploading };
}