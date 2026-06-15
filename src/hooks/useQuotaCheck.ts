import { useState, useEffect } from 'react';

export function useQuotaCheck(restaurantId: string | undefined) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [quotaChecked, setQuotaChecked] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;

    const checkQuota = () => {
      const acessoVitalicio = localStorage.getItem('acesso_vitalicio') === 'true' || 
                              localStorage.getItem('has_unlocked_limit') === 'true';
      if (acessoVitalicio) {
        setShowPaywall(false);
        setQuotaChecked(true);
        return;
      }

      const today = new Date().toLocaleDateString('sv-SE'); // Formato YYYY-MM-DD
      const lastAccessDate = localStorage.getItem('data_ultimo_acesso');
      let count = parseInt(localStorage.getItem('contagem_cardapios') || '0', 10);
      let viewedToday: string[] = [];

      try {
        viewedToday = JSON.parse(localStorage.getItem('cardapios_vistos_hoje') || '[]');
      } catch (e) {
        viewedToday = [];
      }

      // Se mudou o dia, reseta o contador e a lista de cardápios vistos hoje
      if (lastAccessDate !== today) {
        count = 0;
        viewedToday = [];
        localStorage.setItem('data_ultimo_acesso', today);
        localStorage.setItem('contagem_cardapios', '0');
        localStorage.setItem('cardapios_vistos_hoje', JSON.stringify([]));
      }

      if (viewedToday.includes(restaurantId)) {
        // Já visualizou este restaurante hoje, permite sem incrementar
        setShowPaywall(false);
      } else {
        if (count >= 5) {
          setShowPaywall(true);
        } else {
          const newCount = count + 1;
          const newViewedToday = [...viewedToday, restaurantId];
          localStorage.setItem('contagem_cardapios', String(newCount));
          localStorage.setItem('cardapios_vistos_hoje', JSON.stringify(newViewedToday));
          setShowPaywall(false);
        }
      }
      setQuotaChecked(true);
    };

    checkQuota();
  }, [restaurantId]);

  const unlockQuota = () => {
    localStorage.setItem('acesso_vitalicio', 'true');
    localStorage.setItem('has_unlocked_limit', 'true');
    setShowPaywall(false);
  };

  return { showPaywall, quotaChecked, unlockQuota, setShowPaywall };
}
