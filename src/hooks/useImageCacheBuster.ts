import { useState, useEffect } from 'react';

export function useImageCacheBuster() {
  const [timestamp, setTimestamp] = useState<number>(Date.now());

  useEffect(() => {
    const handleSync = () => {
      setTimestamp(Date.now());
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'local-sync-restaurants-trigger') {
        setTimestamp(Date.now());
      }
    };

    window.addEventListener('local-sync-restaurants', handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('local-sync-restaurants', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const getBustedUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.includes('supabase.co')) {
      // Check if URL already has a query parameter
      const separator = url.includes('?') ? '&' : '?';
      // If it already has a timestamp param, we replace it or append
      if (url.includes('t=')) {
        // Remove existing t parameter to avoid duplicate parameters
        const cleanUrl = url.replace(/([?&])t=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
        const sep = cleanUrl.includes('?') ? '&' : '?';
        return `${cleanUrl}${sep}t=${timestamp}`;
      }
      return `${url}${separator}t=${timestamp}`;
    }
    return url;
  };

  return getBustedUrl;
}
