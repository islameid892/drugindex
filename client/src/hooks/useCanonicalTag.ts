import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function useCanonicalTag() {
  const [location] = useLocation();

  useEffect(() => {
    // Get the current domain (handle both www and non-www)
    const host = typeof window !== 'undefined' ? window.location.host : '';
    const canonicalDomain = 'drugindex.click'; // Primary domain
    
    // Build canonical URL
    const canonicalUrl = `https://${canonicalDomain}${location}`;

    // Find or create canonical link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link') as HTMLLinkElement;
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;
  }, [location]);
}
