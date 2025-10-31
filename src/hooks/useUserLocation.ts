import { useState, useEffect } from 'react';

interface Location {
  latitude: number;
  longitude: number;
}

interface UserLocationHook {
  location: Location | null;
  isLoading: boolean;
  error: string | null;
}

export const useUserLocation = (): UserLocationHook => {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      setIsLoading(false);
      return;
    }

    const success = (position: GeolocationPosition) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      setIsLoading(false);
    };

    const failure = (err: GeolocationPositionError) => {
      setError(`Erro ao obter localização: ${err.message}`);
      setIsLoading(false);
    };

    navigator.geolocation.getCurrentPosition(success, failure, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  }, []);

  return { location, isLoading, error };
};