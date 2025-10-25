import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import { RestaurantMenuItem } from '@/types/menu';
import MenuItemCard from '../MenuItemCard';
import { searchMenuItems } from '@/integrations/supabase/menu';

interface SearchByNameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchByNameModal: React.FC<SearchByNameModalProps> = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<RestaurantMenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, digite um termo de busca.",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    setResults([]);
    
    try {
      const data = await searchMenuItems(searchTerm);
      setResults(data);

      if (data.length === 0) {
        toast({
          title: "Nenhum resultado",
          description: `Não encontramos pratos com o termo "${searchTerm}".`,
        });
      }

    } catch (error) {
      console.error("Error searching menu items:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao buscar os pratos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setResults([]);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent 
        side="bottom" 
        className={cn(
          "rounded-t-2xl max-h-[90vh] p-0 flex flex-col",
          "sm:max-w-md sm:mx-auto"
        )}
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-xl font-bold text-[#022D68] flex items-center">
            <Search className="w-5 h-5 mr-2" /> Pesquisar por Nome
          </SheetTitle>
          <SheetDescription>
            Encontre pratos específicos em todos os restaurantes.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 flex-shrink-0">
          <div className="flex space-x-2">
            <Input
              type="text"
              placeholder="Nome do prato (Ex: Lasanha)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-grow"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Buscando...' : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4">
          {results.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Resultados Encontrados ({results.length})</h3>
              {results.map((item) => (
                <MenuItemCard key={item.item_id} item={item} />
              ))}
            </div>
          ) : (
            !isLoading && (
              <p className="text-center text-gray-500 mt-8">
                {searchTerm ? 'Nenhum prato encontrado com esse nome.' : 'Digite o nome de um prato e clique em buscar.'}
              </p>
            )
          )}
        </div>

        <div className="p-4 border-t flex justify-end flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" /> Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SearchByNameModal;