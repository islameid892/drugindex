/**
 * SEO Helper Functions for Dynamic Meta Tags
 * Updates canonical and hreflang tags based on current route
 */

const BASE_URL = 'https://drugindex.click';

/**
 * Update canonical link tag for current page
 */
export function updateCanonicalTag(pathname: string) {
  let canonicalUrl = BASE_URL;
  
  if (pathname && pathname !== '/') {
    canonicalUrl = `${BASE_URL}${pathname}`;
  }
  
  // Remove query parameters for canonical URL
  canonicalUrl = canonicalUrl.split('?')[0];
  
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    (canonicalLink as HTMLLinkElement).rel = 'canonical';
    document.head.appendChild(canonicalLink);
  }
  
  canonicalLink.setAttribute('href', canonicalUrl);
}

/**
 * Update hreflang tags for language versions
 */
export function updateHrefLangTags(pathname: string) {
  // Remove existing hreflang tags
  const existingHreflangs = document.querySelectorAll('link[rel="alternate"][hreflang]');
  existingHreflangs.forEach(tag => {
    if (!tag.getAttribute('hreflang')?.includes('x-default')) {
      tag.remove();
    }
  });
  
  const cleanPath = pathname.split('?')[0];
  
  // Add English hreflang
  const enLink = document.createElement('link');
  enLink.rel = 'alternate';
  enLink.hreflang = 'en';
  enLink.href = `${BASE_URL}${cleanPath}`;
  document.head.appendChild(enLink);
  
  // Add Arabic hreflang
  const arLink = document.createElement('link');
  arLink.rel = 'alternate';
  arLink.hreflang = 'ar';
  arLink.href = `${BASE_URL}/ar${cleanPath}`;
  document.head.appendChild(arLink);
  
  // Add x-default hreflang
  const defaultLink = document.createElement('link');
  defaultLink.rel = 'alternate';
  defaultLink.hreflang = 'x-default';
  defaultLink.href = `${BASE_URL}${cleanPath}`;
  document.head.appendChild(defaultLink);
}

/**
 * Update meta description dynamically
 */
export function updateMetaDescription(description: string) {
  let metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  
  if (!metaDescription) {
    metaDescription = document.createElement('meta');
    (metaDescription as HTMLMetaElement).name = 'description';
    document.head.appendChild(metaDescription);
  }
  
  metaDescription.setAttribute('content', description);
}

/**
 * Update Open Graph tags
 */
export function updateOpenGraphTags(title: string, description: string, imageUrl?: string) {
  const pathname = window.location.pathname;
  const pageUrl = `${BASE_URL}${pathname}`;
  
  // Update og:url
  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute('content', pageUrl);
  
  // Update og:title
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (!ogTitle) {
    ogTitle = document.createElement('meta');
    ogTitle.setAttribute('property', 'og:title');
    document.head.appendChild(ogTitle);
  }
  ogTitle.setAttribute('content', title);
  
  // Update og:description
  let ogDescription = document.querySelector('meta[property="og:description"]');
  if (!ogDescription) {
    ogDescription = document.createElement('meta');
    ogDescription.setAttribute('property', 'og:description');
    document.head.appendChild(ogDescription);
  }
  ogDescription.setAttribute('content', description);
  
  // Update og:image if provided
  if (imageUrl) {
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (!ogImage) {
      ogImage = document.createElement('meta');
      ogImage.setAttribute('property', 'og:image');
      document.head.appendChild(ogImage);
    }
    ogImage.setAttribute('content', imageUrl);
  }
}

/**
 * Update Twitter Card tags
 */
export function updateTwitterCardTags(title: string, description: string, imageUrl?: string) {
  // Update twitter:title
  let twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (!twitterTitle) {
    twitterTitle = document.createElement('meta');
    twitterTitle.setAttribute('name', 'twitter:title');
    document.head.appendChild(twitterTitle);
  }
  twitterTitle.setAttribute('content', title);
  
  // Update twitter:description
  let twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (!twitterDescription) {
    twitterDescription = document.createElement('meta');
    twitterDescription.setAttribute('name', 'twitter:description');
    document.head.appendChild(twitterDescription);
  }
  twitterDescription.setAttribute('content', description);
  
  // Update twitter:image if provided
  if (imageUrl) {
    let twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (!twitterImage) {
      twitterImage = document.createElement('meta');
      twitterImage.setAttribute('name', 'twitter:image');
      document.head.appendChild(twitterImage);
    }
    twitterImage.setAttribute('content', imageUrl);
  }
}

/**
 * Add noindex meta tag to prevent indexing
 */
export function addNoIndexTag() {
  let noindex = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
  
  if (!noindex) {
    noindex = document.createElement('meta');
    (noindex as HTMLMetaElement).name = 'robots';
    document.head.appendChild(noindex);
  }
  
  noindex.setAttribute('content', 'noindex, nofollow');
}

/**
 * Remove noindex meta tag to allow indexing
 */
export function removeNoIndexTag() {
  const noindex = document.querySelector('meta[name="robots"]');
  if (noindex && noindex.getAttribute('content') === 'noindex, nofollow') {
    noindex.remove();
  }
}

/**
 * Update all SEO tags for a page
 */
export function updatePageSEO(options: {
  title: string;
  description: string;
  pathname: string;
  imageUrl?: string;
  noindex?: boolean;
}) {
  const { title, description, pathname, imageUrl, noindex = false } = options;
  
  // Update page title
  document.title = title;
  
  // Update meta tags
  updateCanonicalTag(pathname);
  updateHrefLangTags(pathname);
  updateMetaDescription(description);
  updateOpenGraphTags(title, description, imageUrl);
  updateTwitterCardTags(title, description, imageUrl);
  
  // Handle noindex
  if (noindex) {
    addNoIndexTag();
  } else {
    removeNoIndexTag();
  }
}
