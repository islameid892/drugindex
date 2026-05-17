// Utility functions for adding structured data to the page

export const addFAQSchema = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is ICD-10 coding?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "ICD-10 is the International Classification of Diseases, 10th Revision. It is used to classify and code diagnoses, symptoms, and procedures for healthcare billing and statistical purposes."
        }
      },
      {
        "@type": "Question",
        "name": "How do I search for medications in this database?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can search by medication trade name, scientific name, indication, or ICD-10 code. Simply enter your search term in the search bar and browse the results."
        }
      },
      {
        "@type": "Question",
        "name": "What is Saudi health insurance coverage status?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The coverage status indicates whether a medication or service is covered by Saudi health insurance plans. Covered items are fully supported, while non-covered items may require out-of-pocket payment."
        }
      },
      {
        "@type": "Question",
        "name": "Is this database free to use?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes, the ICD-10 Medical Search Engine is completely free to use. No registration or payment is required."
        }
      },
      {
        "@type": "Question",
        "name": "How often is the database updated?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "The database is regularly updated to reflect the latest ICD-10 codes and medication information. Updates are performed monthly."
        }
      }
    ]
  };

  // Remove existing FAQ schema if present
  const existingFaqScript = document.querySelector('script[data-faq-schema]');
  if (existingFaqScript) {
    existingFaqScript.remove();
  }

  // Add new FAQ schema
  const faqScript = document.createElement('script');
  faqScript.type = 'application/ld+json';
  faqScript.setAttribute('data-faq-schema', 'true');
  faqScript.textContent = JSON.stringify(faqSchema);
  document.head.appendChild(faqScript);
};

export const addBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };

  // Remove existing breadcrumb schema if present
  const existingBreadcrumbScript = document.querySelector('script[data-breadcrumb-schema]');
  if (existingBreadcrumbScript) {
    existingBreadcrumbScript.remove();
  }

  // Add new breadcrumb schema
  const breadcrumbScript = document.createElement('script');
  breadcrumbScript.type = 'application/ld+json';
  breadcrumbScript.setAttribute('data-breadcrumb-schema', 'true');
  breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
  document.head.appendChild(breadcrumbScript);
};

export const addOrganizationSchema = () => {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "ICD-10 Medical Search Engine",
    "url": "https://icd10-search-engine.manus.space/",
    "logo": "https://icd10-search-engine.manus.space/logo.png",
    "description": "A comprehensive medical database for searching ICD-10 codes, medications, and healthcare information with Saudi insurance coverage status",
    "founder": {
      "@type": "Person",
      "name": "Islam Mostafa Eid",
      "jobTitle": "Pharmacist"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Support",
      "url": "https://icd10-search-engine.manus.space/"
    }
  };

  // Remove existing organization schema if present
  const existingOrgScript = document.querySelector('script[data-org-schema]');
  if (existingOrgScript) {
    existingOrgScript.remove();
  }

  // Add new organization schema
  const orgScript = document.createElement('script');
  orgScript.type = 'application/ld+json';
  orgScript.setAttribute('data-org-schema', 'true');
  orgScript.textContent = JSON.stringify(organizationSchema);
  document.head.appendChild(orgScript);
};
