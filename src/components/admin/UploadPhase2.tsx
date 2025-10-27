import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { Restaurant } from '@/types/supabase'; // Importando o tipo Restaurant
import { Loader2, MapPin } from 'lucide-react';

const UploadPhase2: React.FC = () => {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 2: Endereços e Localização</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Implementação futura para upload de endereços e coordenadas via CSV.</p>
        <Button className="mt-4" disabled>
          <MapPin className="w-4 h-4 mr-2" /> Upload CSV
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadPhase2;