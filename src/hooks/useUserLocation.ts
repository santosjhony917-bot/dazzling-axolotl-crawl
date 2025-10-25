import { useState, useEffect, useCallback } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
}

interface UseUserLocationResult {
  location: {
    latitude: number | null;
    longitude: number | null;
    address: string | null; // Adicionado para consistência com o uso em Home.tsx
    cep: string | null;
  };
  isLoading: boolean;
  error: string | null;
  requestLocation: () => void;
}

const useUserLocation = (): UseUserLocationResult => {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
  });
  
  // Mock de endereço e CEP (para evitar dependência circular com useUserSearchLocation)
  const [address, setAddress] = useState<string | null>(null);
  const [cep, setCep] = useState<string | null>(null);

  const success = useCallback((position: GeolocationPosition) => {
    setState({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      loading: false,
      error: null,
    });
    // Nota: A lógica de reverse geocoding e persistência é tratada em useUserSearchLocation.
    // Aqui, apenas simulamos a obtenção das coordenadas.
  }, []);

  const error = useCallback((err: GeolocationPositionError) => {
    setState(prev => ({
      ...prev,
      loading: false,
      error: `Erro ao obter localização: ${err.message}`,
    }));
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Geolocalização não é suportada pelo seu navegador.',
      }));
      return;
    }
    
    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  }, [success, error]);

  useEffect(() => {
    // Tenta obter a localização na montagem
    requestLocation();
  }, [requestLocation]);

  return {
    location: {
      latitude: state.latitude,
      longitude: state.longitude,
      address: address, // Usando mock/null
      cep: cep, // Usando mock/null
    },
    isLoading: state.loading,
    error: state.error,
    requestLocation,
  };
};

export default useUserLocation;