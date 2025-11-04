import React from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2 } from 'lucide-react';

interface ImageUploaderProps {
  currentImage: string | null;
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
  isUploading: boolean;
  label: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ currentImage, onImageUpload, onImageRemove, isUploading, label }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onImageUpload(event.target.files[0]);
    }
  };

  return (
    <div className="space-y-2">
      {currentImage ? (
        <div className="relative group">
          <img src={currentImage} alt="Preview" className="w-full h-auto rounded-md object-cover aspect-video" />
          <Button variant="destructive" size="sm" onClick={onImageRemove} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">Remover</Button>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <p className="mb-2 text-sm text-gray-500 text-center">{label}</p>}
            </div>
            <Input type="file" className="hidden" onChange={handleFileChange} disabled={isUploading} accept="image/*" />
          </label>
        </div>
      )}
    </div>
  );
};