import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Phone, Mail, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// ... (restante do arquivo)