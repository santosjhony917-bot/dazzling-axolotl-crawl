import { useEffect } from 'react';

interface PageHelmetProps {
  title?: string;
  description?: string;
}

const PageHelmet = ({ title, description }: PageHelmetProps) => {
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const previousTitle = document.title;
    if (title) {
      document.title = title;
    }

    let metaDescription: HTMLMetaElement | null = null;
    let previousDescription: string | null = null;

    if (description) {
      metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
      }
      previousDescription = metaDescription.getAttribute('content');
      metaDescription.setAttribute('content', description);
    }

    return () => {
      if (title) {
        document.title = previousTitle;
      }
      if (description && metaDescription) {
        if (previousDescription) {
          metaDescription.setAttribute('content', previousDescription);
        } else {
          metaDescription.removeAttribute('content');
        }
      }
    };
  }, [title, description]);

  return null;
};

export default PageHelmet;
