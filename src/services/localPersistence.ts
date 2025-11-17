const LAST_RESTAURANT_LOCATION_KEY = 'last_restaurant_location_input';

interface LastLocationInput {
  cep: string;
  street: string;
}

/**
 * Saves the last CEP and street input used in the restaurant location modal.
 */
export function saveLastRestaurantLocationInput(data: LastLocationInput) {
  try {
    localStorage.setItem(LAST_RESTAURANT_LOCATION_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save last restaurant location input to localStorage:", e);
  }
}

/**
 * Loads the last CEP and street input used in the restaurant location modal.
 */
export function loadLastRestaurantLocationInput(): LastLocationInput | null {
  try {
    const storedData = localStorage.getItem(LAST_RESTAURANT_LOCATION_KEY);
    if (storedData) {
      const data = JSON.parse(storedData);
      if (data.cep && data.street) {
        return data as LastLocationInput;
      }
    }
  } catch (e) {
    console.error("Failed to load last restaurant location input from localStorage:", e);
  }
  return null;
}