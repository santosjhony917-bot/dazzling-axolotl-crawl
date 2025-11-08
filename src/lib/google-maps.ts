const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!API_KEY) {
    console.error("A chave da API do Google Maps está ausente. Defina VITE_GOOGLE_MAPS_API_KEY no seu arquivo .env.");
    // Retorna nulo para não quebrar o fluxo, mas o endereço não será geocodificado.
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
      };
    } else {
      console.error('A geocodificação falhou:', data.status, data.error_message);
      return null;
    }
  } catch (error) {
    console.error('Erro durante a solicitação de geocodificação:', error);
    return null;
  }
}