"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"

export function RestaurantAddressForm({ restaurant, onUpdate }) {
  const handleInputChange = (e) => {
    const { name, value } = e.target
    onUpdate({ ...restaurant, [name]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5" />Endereço</CardTitle>
        <CardDescription>Onde seu restaurante está localizado.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" name="address" value={restaurant.address || ''} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="number">Número</Label>
          <Input id="number" name="number" value={restaurant.number || ''} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input id="neighborhood" name="neighborhood" value={restaurant.neighborhood || ''} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" value={restaurant.city || ''} onChange={handleInputChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">Estado</Label>
          <Input id="state" name="state" value={restaurant.state || ''} onChange={handleInputChange} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="cep">CEP</Label>
          <Input id="cep" name="cep" value={restaurant.cep || ''} onChange={handleInputChange} />
        </div>
      </CardContent>
    </Card>
  )
}