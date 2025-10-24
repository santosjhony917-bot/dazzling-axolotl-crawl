import React, { useState } from 'react';
import { PlusCircle, Utensils, Edit, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

// Tipos Mockados para o Cardápio
interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

const initialMenu: MenuCategory[] = [
  {
    id: 'cat1',
    name: 'Pratos Principais',
    items: [
      { id: 'item1', name: 'Feijoada Completa', description: 'Feijoada tradicional com acompanhamentos.', price: 55.00 },
      { id: 'item2', name: 'Picanha Grelhada', description: 'Picanha premium com batatas rústicas.', price: 89.90 },
    ],
  },
  {
    id: 'cat2',
    name: 'Sobremesas',
    items: [
      { id: 'item3', name: 'Pudim de Leite', description: 'Clássico pudim de leite condensado.', price: 15.00 },
    ],
  },
];

export default function MenuManagement() {
  const [menu, setMenu] = useState<MenuCategory[]>(initialMenu);
  const [loading, setLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const { toast } = useToast();

  // --- Gerenciamento de Categorias ---

  const handleAddCategory = () => {
    const newName = prompt("Digite o nome da nova categoria:");
    if (newName && newName.trim()) {
      setMenu([...menu, { id: Date.now().toString(), name: newName.trim(), items: [] }]);
      toast({ title: "Sucesso", description: `Categoria '${newName}' adicionada.` });
    }
  };

  const handleEditCategory = (categoryId: string) => {
    const category = menu.find(c => c.id === categoryId);
    if (!category) return;

    const newName = prompt(`Editar nome da categoria '${category.name}':`, category.name);
    if (newName && newName.trim() && newName !== category.name) {
      setMenu(menu.map(c => c.id === categoryId ? { ...c, name: newName.trim() } : c));
      toast({ title: "Sucesso", description: `Categoria atualizada para '${newName}'.` });
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (confirm("Tem certeza que deseja excluir esta categoria e todos os seus itens?")) {
      setMenu(menu.filter(c => c.id !== categoryId));
      toast({ title: "Sucesso", description: "Categoria excluída." });
    }
  };

  // --- Gerenciamento de Itens ---

  const handleAddItem = (categoryId: string) => {
    const name = prompt("Nome do Prato:");
    if (!name) return;
    const priceStr = prompt("Preço (ex: 45.90):");
    const price = parseFloat(priceStr || '0');
    if (isNaN(price) || price <= 0) {
      toast({ title: "Erro", description: "Preço inválido.", variant: "destructive" });
      return;
    }
    const description = prompt("Descrição do Prato (opcional):") || '';

    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      price: price,
    };

    setMenu(menu.map(cat => 
      cat.id === categoryId 
        ? { ...cat, items: [...cat.items, newItem] } 
        : cat
    ));
    toast({ title: "Sucesso", description: `Prato '${name}' adicionado.` });
  };

  const handleEditItem = (categoryId: string, itemId: string) => {
    const category = menu.find(c => c.id === categoryId);
    const item = category?.items.find(i => i.id === itemId);
    if (!item) return;

    const newName = prompt("Novo Nome:", item.name);
    if (!newName) return;
    
    const newPriceStr = prompt("Novo Preço:", item.price.toFixed(2));
    const newPrice = parseFloat(newPriceStr || '0');
    if (isNaN(newPrice) || newPrice <= 0) {
      toast({ title: "Erro", description: "Preço inválido.", variant: "destructive" });
      return;
    }
    
    const newDescription = prompt("Nova Descrição:", item.description) || '';

    setMenu(menu.map(cat => 
      cat.id === categoryId 
        ? { ...cat, items: cat.items.map(i => 
            i.id === itemId 
              ? { ...i, name: newName.trim(), price: newPrice, description: newDescription.trim() } 
              : i
          )} 
        : cat
    ));
    toast({ title: "Sucesso", description: `Prato '${newName}' atualizado.` });
  };

  const handleDeleteItem = (categoryId: string, itemId: string) => {
    if (confirm("Tem certeza que deseja excluir este prato?")) {
      setMenu(menu.map(cat => 
        cat.id === categoryId 
          ? { ...cat, items: cat.items.filter(i => i.id !== itemId) } 
          : cat
      ));
      toast({ title: "Sucesso", description: "Prato excluído." });
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-[#022D68] mb-6 flex items-center">
        <Utensils className="w-7 h-7 mr-3 text-[#E47948]" />
        Gerenciamento de Cardápio
      </h1>
      
      <p className="text-gray-600 mb-6">
        Crie e organize as categorias e os itens do seu cardápio. Esta funcionalidade é exclusiva do Plano Premium.
      </p>

      <Card className="shadow-lg border-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl text-[#022D68]">Categorias</CardTitle>
          <Button onClick={handleAddCategory} className="bg-[#E47948] hover:bg-[#E47948]/90 text-white">
            <PlusCircle className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {menu.length === 0 ? (
            <p className="text-gray-500 italic">Nenhuma categoria adicionada ainda.</p>
          ) : (
            menu.map((category) => (
              <div key={category.id} className="border rounded-lg bg-gray-50">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleCategory(category.id)}
                >
                  <h3 className="font-semibold text-lg text-[#022D68]">{category.name} ({category.items.length} itens)</h3>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handleEditCategory(category.id); }}
                      className="text-gray-600 hover:text-[#E47948]"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {expandedCategory === category.id ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </div>
                </div>
                
                {expandedCategory === category.id && (
                  <div className="p-4 border-t bg-white">
                    <h4 className="font-bold text-[#022D68] mb-3">Itens do Cardápio</h4>
                    <div className="space-y-3">
                      {category.items.length === 0 ? (
                        <p className="text-gray-500 italic text-sm">Nenhum prato nesta categoria.</p>
                      ) : (
                        category.items.map((item) => (
                          <div key={item.id} className="flex justify-between items-center p-3 border rounded-md hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="font-medium text-gray-800">{item.name}</p>
                              <p className="text-sm text-gray-500 truncate max-w-xs">{item.description}</p>
                              <p className="text-sm font-bold text-[#E47948]">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div className="flex space-x-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleEditItem(category.id, item.id)}
                                className="text-gray-600 hover:text-[#E47948]"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleDeleteItem(category.id, item.id)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <Separator className="my-4" />
                    <Button 
                      onClick={() => handleAddItem(category.id)} 
                      variant="outline" 
                      className="w-full border-dashed border-[#E47948] text-[#E47948] hover:bg-[#E47948]/5"
                    >
                      <PlusCircle className="w-4 h-4 mr-2" />
                      Adicionar Novo Prato
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
      
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <Loader2 className="h-10 w-10 animate-spin text-white" />
        </div>
      )}
    </div>
  );
}