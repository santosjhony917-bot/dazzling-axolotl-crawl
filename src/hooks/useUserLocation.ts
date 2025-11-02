import { useState, useEffect } from 'react';

interface UserLocation {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
}

const useUserLocation = (): UseUserLocationResult => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // In a real application, you would use a geocoding service to get the address
          // For now, we'll just use the coordinates as a placeholder for the address
          setLocation({ latitude, longitude, address: `${latitude}, ${longitude}` });
          setLoading(false);
        },
        (err) => {
          setError(err.message);
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by this browser.");
      setLoading(false);
    }
  }, []);

  return { location, loading, error };
};

export default useUserLocation;