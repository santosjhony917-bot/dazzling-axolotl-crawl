"use client"

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Upload, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ImageUploader({ currentImage, onImageSelect, buttonText, aspectRatio = 'aspect-square' }) {
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
      onImageSelect(file)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const imageToShow = preview || currentImage

  return (
    <div className="space-y-2">
      <div className={cn("relative w-full rounded-md overflow-hidden border border-dashed flex items-center justify-center bg-gray-50", aspectRatio)}>
        {imageToShow ? (
          <img src={imageToShow} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-400 flex flex-col items-center">
            <ImageIcon className="h-12 w-12" />
            <span className="mt-2 text-sm">Sem imagem</span>
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
      <Button variant="outline" className="w-full" onClick={handleButtonClick}>
        <Upload className="mr-2 h-4 w-4" />
        {buttonText || 'Selecionar Imagem'}
      </Button>
    </div>
  )
}