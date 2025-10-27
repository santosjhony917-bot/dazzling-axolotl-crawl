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
import { Loader2 } from 'lucide-react';

// ... (restante do arquivo)