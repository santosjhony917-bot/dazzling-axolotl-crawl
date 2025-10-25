import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, DollarSign, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  searchType: 'name' | 'price';
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, searchType }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]); // Placeholder for search results

  const title = searchType === 'name' ? 'Buscar Prato por Nome' : 'Buscar Prato por Preço';
  const description = searchType === 'name' 
    ? 'Digite o nome do prato que você deseja encontrar.' 
    : 'Digite o preço máximo ou exato que você está disposto a pagar.';
  const placeholder = searchType === 'name' ? 'Ex: Pizza Margherita' : 'Ex: 25.00';
  const icon = searchType === 'name' ? <Search className="w-5 h-5" /> : <DollarSign className="w-5 h-5" />;

  const handleSearch = () => {
    // Implement search logic here (e.g., calling a Supabase function)
    console.log(`Searching for ${searchType}: ${searchTerm}`);
    // Mock results for demonstration
    setResults([
      { id: 1, name: 'Prato A', price: 15.00 },
      { id: 2, name: 'Prato B', price: 30.00 },
    ]);
  };

  const handleClose = () => {
    setSearchTerm('');
    setResults([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={cn("sm:max-w-md p-4")}>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {icon}
            <span className="ml-2">{title}</span>
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex space-x-2 mt-4">
          <Input
            type={searchType === 'price' ? 'number' : 'text'}
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleSearch}>
            <Search className="w-4 h-4 mr-2" /> Buscar
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 max-h-60 overflow-y-auto border rounded-lg p-3">
            <h3 className="font-semibold mb-2">Resultados ({results.length})</h3>
            <ul className="space-y-2">
              {results.map((item) => (
                <li key={item.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">R$ {item.price.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" /> Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;