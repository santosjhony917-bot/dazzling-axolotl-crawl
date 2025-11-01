import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Link, Plus, Instagram, Facebook, Globe, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';
import { SocialNetworkLink } from '@/types/restaurant';

interface SocialNetworksDialogProps {
  isOpen: boolean;
// ... (restante do arquivo)