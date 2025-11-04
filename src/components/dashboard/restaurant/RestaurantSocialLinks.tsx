"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

export function RestaurantSocialLinks({ socialLinks = [], onSocialLinksChange }) {
  const handleAddLink = () => {
    onSocialLinksChange([...socialLinks, { platform: '', url: '' }])
  }

  const handleRemoveLink = (index) => {
    onSocialLinksChange(socialLinks.filter((_, i) => i !== index))
  }

  const handleLinkChange = (index, field, value) => {
    const newLinks = [...socialLinks]
    newLinks[index][field] = value
    onSocialLinksChange(newLinks)
  }

  return (
    <div className="space-y-4">
      <Label>Redes Sociais</Label>
      {socialLinks.map((link, index) => (
        <div key={index} className="flex items-center space-x-2">
          <Input
            placeholder="Plataforma (ex: Instagram)"
            value={link.platform}
            onChange={(e) => handleLinkChange(index, 'platform', e.target.value)}
          />
          <Input
            placeholder="URL"
            value={link.url}
            onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
          />
          <Button variant="ghost" size="icon" onClick={() => handleRemoveLink(index)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={handleAddLink}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Rede Social
      </Button>
    </div>
  )
}