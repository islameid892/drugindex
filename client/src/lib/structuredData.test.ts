import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { addFAQSchema, addBreadcrumbSchema, addOrganizationSchema } from './structuredData';

describe('Structured Data Functions', () => {
  beforeEach(() => {
    // Clear any existing scripts before each test
    document.querySelectorAll('script[data-faq-schema], script[data-breadcrumb-schema], script[data-org-schema]').forEach(script => {
      script.remove();
    });
  });

  afterEach(() => {
    // Clean up after each test
    document.querySelectorAll('script[data-faq-schema], script[data-breadcrumb-schema], script[data-org-schema]').forEach(script => {
      script.remove();
    });
  });

  describe('addFAQSchema', () => {
    it('should add FAQ schema script to document head', () => {
      addFAQSchema();
      
      const faqScript = document.querySelector('script[data-faq-schema]');
      expect(faqScript).toBeTruthy();
      expect(faqScript?.type).toBe('application/ld+json');
    });

    it('should contain valid JSON-LD structure', () => {
      addFAQSchema();
      
      const faqScript = document.querySelector('script[data-faq-schema]');
      const content = faqScript?.textContent;
      
      expect(content).toBeTruthy();
      const parsed = JSON.parse(content || '{}');
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('FAQPage');
      expect(Array.isArray(parsed.mainEntity)).toBe(true);
      expect(parsed.mainEntity.length).toBeGreaterThan(0);
    });

    it('should replace existing FAQ schema', () => {
      addFAQSchema();
      const firstScript = document.querySelector('script[data-faq-schema]');
      
      addFAQSchema();
      const allScripts = document.querySelectorAll('script[data-faq-schema]');
      
      expect(allScripts.length).toBe(1);
    });

    it('should contain expected FAQ questions', () => {
      addFAQSchema();
      
      const faqScript = document.querySelector('script[data-faq-schema]');
      const content = faqScript?.textContent;
      const parsed = JSON.parse(content || '{}');
      
      const questions = parsed.mainEntity.map((item: any) => item.name);
      expect(questions).toContain('What is ICD-10 coding?');
      expect(questions).toContain('How do I search for medications in this database?');
      expect(questions).toContain('What is Saudi health insurance coverage status?');
    });
  });

  describe('addBreadcrumbSchema', () => {
    it('should add breadcrumb schema script to document head', () => {
      const items = [
        { name: 'Home', url: 'https://example.com/' },
        { name: 'Medications', url: 'https://example.com/medications' }
      ];
      
      addBreadcrumbSchema(items);
      
      const breadcrumbScript = document.querySelector('script[data-breadcrumb-schema]');
      expect(breadcrumbScript).toBeTruthy();
      expect(breadcrumbScript?.type).toBe('application/ld+json');
    });

    it('should contain valid breadcrumb structure', () => {
      const items = [
        { name: 'Home', url: 'https://example.com/' },
        { name: 'Medications', url: 'https://example.com/medications' }
      ];
      
      addBreadcrumbSchema(items);
      
      const breadcrumbScript = document.querySelector('script[data-breadcrumb-schema]');
      const content = breadcrumbScript?.textContent;
      const parsed = JSON.parse(content || '{}');
      
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('BreadcrumbList');
      expect(Array.isArray(parsed.itemListElement)).toBe(true);
      expect(parsed.itemListElement.length).toBe(2);
    });

    it('should set correct positions for breadcrumb items', () => {
      const items = [
        { name: 'Home', url: 'https://example.com/' },
        { name: 'Medications', url: 'https://example.com/medications' },
        { name: 'Paracetamol', url: 'https://example.com/medications/paracetamol' }
      ];
      
      addBreadcrumbSchema(items);
      
      const breadcrumbScript = document.querySelector('script[data-breadcrumb-schema]');
      const content = breadcrumbScript?.textContent;
      const parsed = JSON.parse(content || '{}');
      
      expect(parsed.itemListElement[0].position).toBe(1);
      expect(parsed.itemListElement[1].position).toBe(2);
      expect(parsed.itemListElement[2].position).toBe(3);
    });
  });

  describe('addOrganizationSchema', () => {
    it('should add organization schema script to document head', () => {
      addOrganizationSchema();
      
      const orgScript = document.querySelector('script[data-org-schema]');
      expect(orgScript).toBeTruthy();
      expect(orgScript?.type).toBe('application/ld+json');
    });

    it('should contain valid organization structure', () => {
      addOrganizationSchema();
      
      const orgScript = document.querySelector('script[data-org-schema]');
      const content = orgScript?.textContent;
      const parsed = JSON.parse(content || '{}');
      
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('Organization');
      expect(parsed.name).toBe('ICD-10 Medical Search Engine');
      expect(parsed.url).toBe('https://icd10-search-engine.manus.space/');
    });

    it('should contain founder information', () => {
      addOrganizationSchema();
      
      const orgScript = document.querySelector('script[data-org-schema]');
      const content = orgScript?.textContent;
      const parsed = JSON.parse(content || '{}');
      
      expect(parsed.founder).toBeTruthy();
      expect(parsed.founder.name).toBe('Islam Mostafa Eid');
      expect(parsed.founder.jobTitle).toBe('Pharmacist');
    });

    it('should replace existing organization schema', () => {
      addOrganizationSchema();
      const firstScript = document.querySelector('script[data-org-schema]');
      
      addOrganizationSchema();
      const allScripts = document.querySelectorAll('script[data-org-schema]');
      
      expect(allScripts.length).toBe(1);
    });
  });
});
