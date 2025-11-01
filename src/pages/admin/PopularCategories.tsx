import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Settings } from 'lucide-react';
import { usePopularCategoriesManagement } from '@/hooks/usePopularCategoriesManagement';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function PopularCategories() {
  const { categories, isLoading, error, updatePopularStatus, isUpdating } = usePopularCategoriesManagement();

  const handleTogglePopular = (categoryId: string, isPopular: boolean) => {
    updatePopularStatus({ categoryId, isPopular });
  };

  if (error) {
    return (
      <Card className="shadow-soft-lg border-none rounded-xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
            <Settings className="w-6 h-6" /> Categorias Populares
          </CardTitle>
          <CardDescription>Gerencie quais categorias de pratos aparecem em destaque para os clientes.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Erro ao carregar categorias: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Settings className="w-6 h-6" /> Categorias Populares
        </CardTitle>
        <CardDescription>Gerencie quais categorias de pratos podem aparecer na seção de "Pratos Populares" para os clientes.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Categoria</TableHead>
                <TableHead className="text-right">Popular</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Switch
                        id={`popular-switch-${category.id}`}
                        checked={category.is_popular || false}
                        onCheckedChange={(checked) => handleTogglePopular(category.id, checked)}
                        disabled={isUpdating}
                      />
                      <Label htmlFor={`popular-switch-${category.id}`} className="sr-only">
                        {category.is_popular ? 'Ativado' : 'Desativado'}
                      </Label>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}