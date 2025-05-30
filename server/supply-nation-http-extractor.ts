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
      
      // Extract basic company information - look for h1 or main heading
      let companyName = '';
      const headingSelectors = ['h1', '.page-title', '.business-name', '.company-title'];
      for (const selector of headingSelectors) {
        const text = $(selector).first().text().trim();
        if (text && text.length > 3) {
          companyName = text;
          break;
        }
      }
      
      // Extract trading name - look for "Trading as:" text
      let tradingName = '';
      $('*').each((_, element) => {
        const text = $(element).text();
        if (text.includes('Trading as:')) {
          const match = text.match(/Trading as:\s*([^\\n\\r]+)/);
          if (match) {
            tradingName = match[1].trim();
          }
        }
      });
      
      // Extract contact information using multiple strategies
      const phone = this.extractPhoneNumber($);
      const email = this.extractEmailAddress($);
      const website = this.extractWebsiteUrl($);
      const contactPerson = this.extractContactPerson($);

      // Extract address information
      const addressData = this.extractDetailedAddress($);

      // Extract services and capabilities
      const services = this.extractServicesList($);
      const description = services.length > 0 ? services.join(' • ') : 'Indigenous business services';

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
        detailedAddress: addressData.detailed && addressData.detailed.streetAddress ? addressData.detailed : undefined,
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
   * Extract phone number from the page
   */
  private extractPhoneNumber($: cheerio.CheerioAPI): string | null {
    // Look for phone patterns in text content
    const phoneRegex = /(\(?\d{2}\)?\s?\d{4}\s?\d{4}|\+61\s?\d\s?\d{4}\s?\d{4})/;
    
    // Check all text content for phone patterns
    let foundPhone = null;
    $('*').each((_, element) => {
      const text = $(element).text();
      const match = text.match(phoneRegex);
      if (match) {
        foundPhone = match[1].trim();
        return false; // Break the loop
      }
    });

    // Also check href attributes
    $('a[href^="tel:"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        foundPhone = href.replace('tel:', '').trim();
        return false;
      }
    });

    return foundPhone;
  }

  /**
   * Extract email address from the page
   */
  private extractEmailAddress($: cheerio.CheerioAPI): string | null {
    // Look for email patterns
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    
    let foundEmail = null;
    $('*').each((_, element) => {
      const text = $(element).text();
      const match = text.match(emailRegex);
      if (match) {
        foundEmail = match[1];
        return false;
      }
    });

    // Also check href attributes
    $('a[href^="mailto:"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        foundEmail = href.replace('mailto:', '').trim();
        return false;
      }
    });

    return foundEmail;
  }

  /**
   * Extract website URL from the page
   */
  private extractWebsiteUrl($: cheerio.CheerioAPI): string | null {
    // Look for http/https URLs that are not supplynation domains
    const urlRegex = /(https?:\/\/[^\s]+)/;
    
    let foundWebsite = null;
    $('*').each((_, element) => {
      const text = $(element).text();
      const match = text.match(urlRegex);
      if (match && !match[1].includes('supplynation')) {
        foundWebsite = match[1];
        return false;
      }
    });

    // Also check href attributes
    $('a[href^="http"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href && !href.includes('supplynation') && !href.includes('facebook') && !href.includes('linkedin')) {
        foundWebsite = href;
        return false;
      }
    });

    return foundWebsite;
  }

  /**
   * Extract contact person name
   */
  private extractContactPerson($: cheerio.CheerioAPI): string | null {
    // Look for name patterns near contact information
    let foundContact = null;
    
    $('*').each((_, element) => {
      const text = $(element).text();
      // Look for names that appear to be contact persons
      if (text.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/) && text.length < 50) {
        // Filter out company names and common words
        if (!text.includes('PTY') && !text.includes('GROUP') && !text.includes('LTD')) {
          foundContact = text.trim();
          return false;
        }
      }
    });

    return foundContact;
  }

  /**
   * Extract detailed address information
   */
  private extractDetailedAddress($: cheerio.CheerioAPI): { location: string; detailed: any } {
    // Try to extract address from the profile page
    const addressSelectors = [
      '.address-info',
      '.contact-address',
      '[class*="address"]',
      '.profile-address',
      '.location-info'
    ];

    let extractedAddress = '';
    
    for (const selector of addressSelectors) {
      const addressElement = $(selector);
      if (addressElement.length > 0) {
        const text = addressElement.text().trim();
        if (text && text.length > 10) { // Valid address should be longer than 10 chars
          extractedAddress = text;
          break;
        }
      }
    }

    // Fallback: look for address patterns in any text
    if (!extractedAddress) {
      $('*').each((_, element) => {
        const text = $(element).text().trim();
        // Look for Australian address patterns
        if (text.match(/\d+\s+[A-Z\s]+(RD|ROAD|ST|STREET|AVE|AVENUE|DR|DRIVE|PL|PLACE|CT|COURT),?\s+[A-Z\s]+\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s+\d{4}/i)) {
          extractedAddress = text;
          return false; // Break the loop
        }
      });
    }

    if (extractedAddress) {
      // Parse the extracted address
      const addressMatch = extractedAddress.match(/(.+?),?\s+([A-Z\s]+)\s+(VIC|NSW|QLD|WA|SA|TAS|NT|ACT)\s+(\d{4})/i);
      if (addressMatch) {
        return {
          location: extractedAddress,
          detailed: {
            streetAddress: addressMatch[1].trim(),
            suburb: addressMatch[2].trim(),
            state: addressMatch[3].toUpperCase(),
            postcode: addressMatch[4]
          }
        };
      }
    }

    // Default fallback
    return {
      location: 'Address not available',
      detailed: {
        streetAddress: '',
        suburb: '',
        state: '',
        postcode: ''
      }
    };
  }

  /**
   * Extract services list
   */
  private extractServicesList($: cheerio.CheerioAPI): string[] {
    const services: string[] = [];
    
    // Look for bullet points or list items
    $('li, .service-item').each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 5 && text.length < 100) {
        services.push(text);
      }
    });

    // If no list found, look for common service terms
    if (services.length === 0) {
      const serviceTerms = [
        'Electrical services',
        'Mechanical services & installation',
        'Civil construction',
        'Facilities management services',
        'Plant & equipment purchase & hire'
      ];
      
      const pageText = $('body').text().toLowerCase();
      serviceTerms.forEach(term => {
        if (pageText.includes(term.toLowerCase())) {
          services.push(term);
        }
      });
    }

    return services;
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