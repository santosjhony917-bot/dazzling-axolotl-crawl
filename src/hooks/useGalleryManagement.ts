import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { GalleryImage } from '@/types/supabase';
import { showError, showSuccess } from '@/utils/toast';

// ... (restante do arquivo)