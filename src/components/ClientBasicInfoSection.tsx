import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InfoCardItem from '@/components/InfoCardItem';
import { Profile } from '@/types/supabase';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2, Save } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '@/integrations/supabase/profiles';
import { showError, showSuccess } from '@/utils/toast';
import { useAuth } from '@/hooks/useAuth';

// ... (restante do arquivo)