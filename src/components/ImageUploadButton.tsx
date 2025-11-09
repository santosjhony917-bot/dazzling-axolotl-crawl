"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client"; // Importa a instância 'supabase'
import { useToast } from "@/components/ui/use-toast";
import { UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

interface ImageUploadButtonProps {
  onUploadComplete: (url: string) => void | Promise<void>;
  bucketName: string;
  folderPath: string; // e.g., "avatars" or "restaurant_logos"
  className?: string;
  accept?: string;
  imageUrl?: string; // For displaying current image
  icon?: React.ReactNode; // Icon to display on the button
  disabled?: boolean;
  children?: React.ReactNode; // Allow children to be passed for custom button content
}

export function ImageUploadButton({
  onUploadComplete,
  bucketName,
  folderPath,
  className,
  accept = "image/*",
  imageUrl,
  icon,
  disabled,
  children,
}: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  // const supabase = createClient(); // Não é mais necessário criar o cliente aqui, pois ele é importado

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setIsUploading(true);

      try {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `${folderPath}/${fileName}`;

        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (error) {
          throw error;
        }

        const { data: publicUrlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        if (publicUrlData.publicUrl) {
          await onUploadComplete(publicUrlData.publicUrl);
          toast({
            title: "Upload successful!",
            description: "Your image has been uploaded.",
          });
        } else {
          throw new Error("Could not get public URL for the uploaded image.");
        }
      } catch (error: any) {
        console.error("Error uploading image:", error);
        toast({
          title: "Upload failed.",
          description: error.message || "There was an error uploading your image.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        // Clear the file input value to allow re-uploading the same file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <Input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept={accept}
        disabled={disabled || isUploading}
      />
      <Button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn("relative z-[1]", className)}
        disabled={disabled || isUploading}
      >
        {isUploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          icon || (imageUrl ? <ImageIcon className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />)
        )}
        {children || (imageUrl ? "Change Image" : "Upload Image")}
      </Button>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="Preview"
          className="absolute inset-0 w-full h-full object-cover rounded-md -z-[1]"
        />
      )}
    </div>
  );
}