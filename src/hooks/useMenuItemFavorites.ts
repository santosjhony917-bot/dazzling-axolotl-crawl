import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { showError, showSuccess } from "@/utils/toast";
import { MenuItem } from "@/types/supabase";

// ... (restante do arquivo)