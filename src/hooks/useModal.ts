"use client";

import { create } from 'zustand';
import { UpdateRestaurantPayload } from '@/types/payloads';

export enum ModalType {
  UpdateSalesChannel = 'UpdateSalesChannel',
  // Adicione outros tipos de modal conforme necessário
}

interface UpdateSalesChannelData {
  field: keyof UpdateRestaurantPayload;
  initialValue: string | null;
  onUpdate: (payload: UpdateRestaurantPayload) => Promise<void>;
}

interface ModalState {
  type: ModalType | null;
  data: any;
  isOpen: boolean;
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
}

export const useModal = create<ModalState>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  openModal: (type, data = {}) => set({ isOpen: true, type, data }),
  closeModal: () => set({ isOpen: false, type: null, data: {} }),
}));