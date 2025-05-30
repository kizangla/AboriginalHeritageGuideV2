import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { SupplyNationBusiness } from './supply-nation-scraper';

/**
 * HTTP-based Supply Nation profile extractor that works without browser automation
 * This bypasses the Chrome requirement by using direct HTTP requests
 */
export class SupplyNationHttpExtractor {
  private static readonly BASE_URL = 'https://ibd.supplynation.org.au';
  private static readonly TIMEOUT = 10000; // 10 seconds

  /**
   * Extract detailed profile information from Supply Nation using HTTP requests
   */
  async extractProfile(supplynationId: string): Promise<SupplyNationBusiness | null> {
    try {
      const profileUrl = `${SupplyNationHttpExtractor.BASE_URL}/public/s/supplierprofile?accid=${supplynationId}`;
      console.log(`Fetching Supply Nation profile via HTTP: ${profileUrl}`);

      const response = await fetch(profileUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      if (!response.ok) {
        console.log(`Failed to fetch profile: ${response.status} ${response.statusText}`);
        return null;
      }

      const html = await response.text();
      return this.parseProfileHtml(html, supplynationId);

    } catch (error) {
      console.log(`Error extracting Supply Nation profile: ${error}`);
      return null;
    }
  }

  /**
   * Parse the HTML content of a Supply Nation profile page
   */
  private parseProfileHtml(html: string, supplynationId: string): SupplyNationBusiness | null {
    try {
      const $ = cheerio.load(html);
      
      // Extract basic company information
      const companyName = this.extractText($, '[data-id="companyName"], .company-name, h1, .business-title').trim();
      const tradingName = this.extractText($, '[data-id="tradingName"], .trading-name').trim();
      
      // Extract contact information
      const phone = this.extractContactInfo($, 'phone', [
        '[href^="tel:"]',
        '.phone',
        '[data-id="phone"]',
        'a[href*="tel"]'
      ]);
      
      const email = this.extractContactInfo($, 'email', [
        '[href^="mailto:"]', 
        '.email',
        '[data-id="email"]',
        'a[href*="mailto"]'
      ]);
      
      const website = this.extractContactInfo($, 'website', [
        'a[href^="http"]:not([href*="supplynation"])',
        '.website',
        '[data-id="website"]'
      ]);

      // Extract contact person
      const contactPerson = this.extractText($, '.contact-person, [data-id="contactPerson"], .principal-contact').trim();

      // Extract address information
      const addressData = this.extractAddress($);

      // Extract services and capabilities
      const services = this.extractServices($);
      const description = services.join(' • ');

      // Create the business object
      const business: SupplyNationBusiness = {
        companyName: companyName || 'Unknown',
        verified: true,
        categories: services,
        location: addressData.location,
        contactInfo: {
          phone: phone || undefined,
          email: email || undefined,
          website: website || undefined,
          contactPerson: contactPerson || undefined
        },
        description,
        supplynationId,
        capabilities: services,
        certifications: ['Supply Nation Verified'],
        tradingName: tradingName || undefined,
        detailedAddress: addressData.detailed.streetAddress ? addressData.detailed : undefined,
        lastUpdated: new Date().toISOString()
      };

      console.log(`Successfully extracted profile for ${companyName}`);
      return business;

    } catch (error) {
      console.log(`Error parsing profile HTML: ${error}`);
      return null;
    }
  }

  /**
   * Extract text content from multiple selectors
   */
  private extractText($: cheerio.CheerioAPI, selectors: string): string {
    const selectorList = selectors.split(', ');
    for (const selector of selectorList) {
      const text = $(selector).first().text().trim();
      if (text) return text;
    }
    return '';
  }

  /**
   * Extract contact information (phone, email, website)
   */
  private extractContactInfo($: cheerio.CheerioAPI, type: string, selectors: string[]): string | null {
    for (const selector of selectors) {
      const element = $(selector).first();
      if (element.length) {
        if (type === 'phone') {
          const href = element.attr('href');
          return href ? href.replace('tel:', '') : element.text().trim();
        } else if (type === 'email') {
          const href = element.attr('href');
          return href ? href.replace('mailto:', '') : element.text().trim();
        } else if (type === 'website') {
          return element.attr('href') || element.text().trim();
        }
      }
    }
    return null;
  }

  /**
   * Extract address information
   */
  private extractAddress($: cheerio.CheerioAPI): { location: string; detailed: any } {
    const addressSelectors = [
      '.address', '.location', '[data-id="address"]', 
      '.business-address', '.company-address'
    ];

    let fullAddress = '';
    for (const selector of addressSelectors) {
      const addr = $(selector).text().trim();
      if (addr) {
        fullAddress = addr;
        break;
      }
    }

    // Try to parse detailed address components
    const addressParts = fullAddress.split(',').map(part => part.trim());
    const detailed: any = {};

    if (addressParts.length >= 2) {
      detailed.streetAddress = addressParts[0];
      if (addressParts.length >= 3) {
        detailed.suburb = addressParts[addressParts.length - 3];
        detailed.state = addressParts[addressParts.length - 2];
        detailed.postcode = addressParts[addressParts.length - 1];
      }
    }

    return {
      location: fullAddress || 'Australia',
      detailed
    };
  }

  /**
   * Extract services and capabilities
   */
  private extractServices($: cheerio.CheerioAPI): string[] {
    const services: string[] = [];
    
    // Look for service lists
    const serviceSelectors = [
      '.services li', '.capabilities li', '.business-services li',
      '[data-id="services"] li', '.service-list li'
    ];

    for (const selector of serviceSelectors) {
      $(selector).each((_, element) => {
        const service = $(element).text().trim();
        if (service && !services.includes(service)) {
          services.push(service);
        }
      });
    }

    // If no structured list found, look for text descriptions
    if (services.length === 0) {
      const descriptionText = $('.description, .about, .services-description').text();
      if (descriptionText) {
        // Split common service separators
        const possibleServices = descriptionText
          .split(/[•·\n\r]/)
          .map(s => s.trim())
          .filter(s => s.length > 3 && s.length < 100);
        
        services.push(...possibleServices.slice(0, 5)); // Limit to 5 services
      }
    }

    return services;
  }
}

export const httpExtractor = new SupplyNationHttpExtractor();