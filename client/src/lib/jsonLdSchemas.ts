/**
 * JSON-LD Schema Utilities for Rich Snippets
 * Generates structured data for Google Rich Results
 */

export interface DrugSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  manufacturer?: string;
  indication?: string;
  activeIngredient?: string;
  url: string;
}

export interface MedicalCodeSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  code: string;
  codingSystem: string;
  url: string;
}

export interface MedicalConditionSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  url: string;
  potentialAction?: {
    '@type': string;
    target: string;
  };
}

/**
 * Generate Drug/Medication Schema
 */
export function generateDrugSchema(
  name: string,
  description: string,
  indication: string,
  activeIngredient: string,
  url: string
): DrugSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalEntity',
    name,
    description,
    indication,
    activeIngredient,
    url,
  };
}

/**
 * Generate ICD-10 Code Schema
 */
export function generateMedicalCodeSchema(
  code: string,
  description: string,
  url: string
): MedicalCodeSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalCode',
    name: `ICD-10 Code: ${code}`,
    description,
    code,
    codingSystem: 'ICD-10',
    url,
  };
}

/**
 * Generate Medical Condition Schema
 */
export function generateMedicalConditionSchema(
  name: string,
  description: string,
  url: string
): MedicalConditionSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalCondition',
    name,
    description,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${url}?q={search_term_string}`,
    },
  };
}

/**
 * Generate Organization Schema for Home Page
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ICD-10 Search Engine',
    description: 'Comprehensive ICD-10 medical codes and drug reference database',
    url: 'https://drugindex.click',
    logo: 'https://drugindex.click/logo.png',
    sameAs: [
      'https://www.facebook.com/icd10search',
      'https://twitter.com/icd10search',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@drugindex.click',
    },
  };
}

/**
 * Generate Breadcrumb Schema
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/**
 * Generate FAQPage Schema
 */
export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Add JSON-LD script to document head
 */
export function addJsonLdToHead(schema: Record<string, any>) {
  // Remove existing schema if present
  const existingScript = document.querySelector('script[type="application/ld+json"]');
  if (existingScript) {
    existingScript.remove();
  }

  // Create and add new schema
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/**
 * Update page schema based on content type
 */
export function updatePageSchema(
  type: 'drug' | 'code' | 'condition' | 'organization' | 'faq',
  data: Record<string, any>
) {
  let schema: Record<string, any>;

  switch (type) {
    case 'drug':
      schema = generateDrugSchema(
        data.name,
        data.description,
        data.indication,
        data.activeIngredient,
        data.url
      );
      break;
    case 'code':
      schema = generateMedicalCodeSchema(
        data.code,
        data.description,
        data.url
      );
      break;
    case 'condition':
      schema = generateMedicalConditionSchema(
        data.name,
        data.description,
        data.url
      );
      break;
    case 'organization':
      schema = generateOrganizationSchema();
      break;
    case 'faq':
      schema = generateFAQSchema(data.faqs);
      break;
    default:
      return;
  }

  addJsonLdToHead(schema);
}
