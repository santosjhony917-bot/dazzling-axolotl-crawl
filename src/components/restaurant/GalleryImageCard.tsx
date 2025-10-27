import React, { useState } from 'react';
import { Trash2, Loader2, Edit, Save } from 'lucide-react';
import { GalleryImage } from '@/types/supabase';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

// ... (restante do arquivo)