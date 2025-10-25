import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Clock, Loader2 } from 'lucide-react';

interface OpeningHoursManagementProps {
  restaurantId: string;
  isEditing: boolean;
}

const OpeningHoursManagement: React.FC<OpeningHoursManagementProps> = ({ restaurantId, isEditing }) => {
  // Implementação futura para gerenciar horários de funcionamento
  
  return (
    <Card className="rounded-xl shadow-md border-none">
      <CardContent className="p-4 space-y-4">
        <h3 className="text-lg font-bold text-primary border-b pb-2 mb-2 flex items-center gap-2">
          <Clock className="w-5 h-5" /> Horários de Funcionamento
        </h3>
        <p className="text-gray-600">
          {isEditing ? "Funcionalidade de edição de horários será implementada aqui." : "Horários atuais: Seg-Sex 09:00 - 18:00 (Mock)"}
        </p>
      </CardContent>
    </Card>
  );
};

export default OpeningHoursManagement;