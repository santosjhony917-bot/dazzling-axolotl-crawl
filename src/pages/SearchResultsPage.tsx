"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Search, DollarSign, MapPin, UtensilsCrossed, Building2 } from 'lucide-react';

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'dishes' | 'restaurants'>('dishes');

  const handleSearch = () => {
    console.log('Searching for:', searchQuery, 'in tab:', activeTab);
    // Implement actual search logic here
  };

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex-grow text-center">Busca</h1>
        <div className="w-10"></div> {/* Placeholder for alignment */}
      </div>

      {/* Search Input */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Buscar por prato..."
            className="pl-10 pr-4 py-2 rounded-lg border-gray-300 focus:border-primary focus:ring-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
        </div>
        <Button onClick={handleSearch} className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90">
          <ArrowLeft className="h-5 w-5 rotate-180" /> {/* Using ArrowLeft rotated for a 'go' icon */}
        </Button>
      </div>

      {/* Filter Buttons */}
      <div className="flex justify-around space-x-2 mb-6">
        <Button variant="outline" className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border-gray-300">
          <DollarSign className="h-4 w-4" />
          <span>Preço</span>
        </Button>
        <Button variant="outline" className="flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg border-gray-300">
          <MapPin className="h-4 w-4" />
          <span>Distância</span>
        </Button>
      </div>

      {/* Tabs for Dishes and Restaurants */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'dishes' | 'restaurants')} className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dishes">Pratos</TabsTrigger>
          <TabsTrigger value="restaurants">Restaurantes</TabsTrigger>
        </TabsList>
        <TabsContent value="dishes" className="mt-4">
          <h2 className="text-lg font-semibold mb-3">Pratos em Destaque</h2>
          <Card className="text-center py-8">
            <CardContent className="flex flex-col items-center justify-center">
              <UtensilsCrossed className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum destaque encontrado. Tente pesquisar!</p>
            </CardContent>
          </Card>
          {/* Future: Display dish search results here */}
        </TabsContent>
        <TabsContent value="restaurants" className="mt-4">
          <h2 className="text-lg font-semibold mb-3">Restaurantes em Destaque</h2>
          <Card className="text-center py-8">
            <CardContent className="flex flex-col items-center justify-center">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum restaurante encontrado. Tente pesquisar!</p>
            </CardContent>
          </Card>
          {/* Future: Display restaurant search results here */}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SearchResultsPage;