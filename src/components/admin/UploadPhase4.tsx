import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';
import { Loader2, Clock } from 'lucide-react';

const UploadPhase4: React.FC = () => {
  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Fase 4: Horários de Funcionamento</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">Implementação futura para upload de horários de funcionamento via CSV.</p>
        <Button className="mt-4" disabled>
          <Clock className="w-4 h-4 mr-2" /> Upload CSV
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadPhase4;