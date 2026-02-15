import { useEffect } from 'react';

// Google AdSense Publisher ID
const PUBLISHER_ID = 'ca-pub-5223653504603380';

// Ad Unit IDs (you'll get these from Google AdSense after approval)
const AD_SLOTS = {
  header: '1234567890',        // Header ad (Display ad)
  searchResults: '1234567891',  // Between search results (In-article ad)
  sidebar: '1234567892',        // Sidebar ad (Responsive ad)
  footer: '1234567893',         // Footer ad (Matched content)
  medicationCards: '1234567894' // Between medication cards (Display ad)
};

// 1. Header Ad (Top of page)
export function HeaderAd() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOTS.header}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}

// 2. Search Results Ad (Between results - In-article)
export function SearchResultsAd() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', textAlign: 'center' }}
        data-ad-layout="in-article"
        data-ad-format="fluid"
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOTS.searchResults}
      ></ins>
    </div>
  );
}

// 3. Sidebar Ad (Right side - Responsive)
export function SidebarAd() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          minWidth: '250px',
          maxWidth: '300px',
          width: '100%',
          height: '600px'
        }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOTS.sidebar}
        data-ad-format="auto"
        data-full-width-responsive="false"
      ></ins>
    </div>
  );
}

// 4. Footer Ad (Bottom of page - Matched content)
export function FooterAd() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', margin: '20px 0' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-format="autorelaxed"
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOTS.footer}
      ></ins>
    </div>
  );
}

// 5. Medication Cards Ad (Between cards - Display ad)
export function MedicationCardsAd() {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div style={{ textAlign: 'center', margin: '30px 0' }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={AD_SLOTS.medicationCards}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}

// Export all ads
export const AdSenseAds = {
  Header: HeaderAd,
  SearchResults: SearchResultsAd,
  Sidebar: SidebarAd,
  Footer: FooterAd,
  MedicationCards: MedicationCardsAd
};

// TypeScript declaration for window.adsbygoogle
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
