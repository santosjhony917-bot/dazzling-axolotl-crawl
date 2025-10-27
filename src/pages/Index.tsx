import React from 'react';
import Splash from './Splash';

/**
 * A rota principal (/) renderiza o Splash, que gerencia o redirecionamento
 * para Onboarding ou Home, dependendo do status do usuário.
 */
const Index: React.FC = () => {
  return <Splash />;
};

export default Index;