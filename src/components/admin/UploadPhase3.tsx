import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { Loader2, UtensilsCrossed } from 'lucide-react';

const UploadPhase3: React.FC = () => {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 3: Cardápios e Itens</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Implementação futura para upload de categorias e itens de menu via CSV.</p>
        <Button className="mt-4" disabled>
          <UtensilsCrossed className="w-4 h-4 mr-2" /> Upload CSV
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadPhase3;