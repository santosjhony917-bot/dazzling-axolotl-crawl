import React from 'react';
import { Toaster } from 'react-hot-toast'; // Importando o Toaster correto

const ToastProvider: React.FC = () => {
  return <Toaster position="top-center" reverseOrder={false} />;
};

export default ToastProvider;