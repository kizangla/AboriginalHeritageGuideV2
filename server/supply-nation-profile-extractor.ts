import puppeteer from 'puppeteer';
import { SupplyNationBusiness } from './abr-service';

export interface DetailedSupplyNationProfile extends SupplyNationBusiness {
  detailedAddress?: {
    streetAddress: string;
    suburb: string;
    state: string;
    postcode: string;
    fullAddress: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  services?: string[];
  certifications?: string[];
  description?: string;
  contactPerson?: string;
  businessType?: string;
  yearEstablished?: string;
  employeeCount?: string;
  annualTurnover?: string;
}

export class SupplyNationProfileExtractor {
  private browser: puppeteer.Browser | null = null;

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
  }

  async extractDetailedProfile(supplierProfileUrl: string): Promise<DetailedSupplyNationProfile | null> {
    try {
      await this.initialize();
      
      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      const page = await this.browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      console.log(`Extracting detailed profile from: ${supplierProfileUrl}`);
      
      // Navigate to the supplier profile page
      await page.goto(supplierProfileUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for page content to load
      await page.waitForTimeout(3000);

      // Extract detailed business information
      const profileData = await page.evaluate(() => {
        const profile: any = {};

        // Extract company name
        const companyNameEl = document.querySelector('h1, .company-name, [data-testid="company-name"]');
        if (companyNameEl) {
          profile.companyName = companyNameEl.textContent?.trim();
        }

        // Extract detailed address
        const addressElements = document.querySelectorAll('div, p, span');
        let fullAddress = '';
        let streetAddress = '';
        let suburb = '';
        let state = '';
        let postcode = '';

        for (const el of addressElements) {
          const text = el.textContent?.trim() || '';
          
          // Look for address patterns
          if (text.match(/\d+.*?(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Boulevard|Blvd)/i)) {
            streetAddress = text;
          }
          
          // Look for suburb, state, postcode pattern
          const addressMatch = text.match(/([A-Za-z\s]+),?\s*([A-Z]{2,3})\s*(\d{4})/);
          if (addressMatch) {
            suburb = addressMatch[1].trim();
            state = addressMatch[2].trim();
            postcode = addressMatch[3].trim();
            fullAddress = text;
          }
        }

        if (streetAddress || suburb || state || postcode) {
          profile.detailedAddress = {
            streetAddress: streetAddress || '',
            suburb: suburb || '',
            state: state || '',
            postcode: postcode || '',
            fullAddress: fullAddress || `${streetAddress}, ${suburb}, ${state} ${postcode}`.trim()
          };
        }

        // Extract contact information
        const phonePattern = /(\+?61\s?)?(\(0[0-9]\)|0[0-9])\s?[0-9]{4}\s?[0-9]{4}/;
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const websitePattern = /(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

        for (const el of document.querySelectorAll('a, span, div, p')) {
          const text = el.textContent?.trim() || '';
          const href = (el as HTMLAnchorElement).href;

          if (phonePattern.test(text)) {
            profile.phone = text;
          }
          
          if (emailPattern.test(text)) {
            profile.email = text;
          }
          
          if (href && websitePattern.test(href) && !href.includes('supplynation.org.au')) {
            profile.website = href;
          }
        }

        // Extract business description
        const descriptionElements = document.querySelectorAll('p, div[class*="description"], div[class*="about"]');
        for (const el of descriptionElements) {
          const text = el.textContent?.trim() || '';
          if (text.length > 100 && !text.includes('©') && !text.includes('Privacy')) {
            profile.description = text.substring(0, 500);
            break;
          }
        }

        // Extract services/capabilities
        const services: string[] = [];
        const serviceElements = document.querySelectorAll('li, span[class*="tag"], div[class*="service"]');
        for (const el of serviceElements) {
          const text = el.textContent?.trim() || '';
          if (text.length > 3 && text.length < 50 && !text.includes('©')) {
            services.push(text);
          }
        }
        if (services.length > 0) {
          profile.services = services.slice(0, 10); // Limit to 10 services
        }

        // Extract certifications
        const certifications: string[] = [];
        const certElements = document.querySelectorAll('div[class*="cert"], span[class*="certification"]');
        for (const el of certElements) {
          const text = el.textContent?.trim() || '';
          if (text.length > 5 && text.length < 100) {
            certifications.push(text);
          }
        }
        if (certifications.length > 0) {
          profile.certifications = certifications;
        }

        return profile;
      });

      await page.close();

      console.log(`Extracted detailed profile data:`, profileData);

      return profileData as DetailedSupplyNationProfile;

    } catch (error) {
      console.error(`Failed to extract detailed profile from ${supplierProfileUrl}:`, error);
      return null;
    }
  }

  async extractMultipleProfiles(urls: string[]): Promise<DetailedSupplyNationProfile[]> {
    const profiles: DetailedSupplyNationProfile[] = [];
    
    for (const url of urls) {
      try {
        const profile = await this.extractDetailedProfile(url);
        if (profile) {
          profiles.push(profile);
        }
        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to extract profile from ${url}:`, error);
      }
    }

    return profiles;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const supplyNationProfileExtractor = new SupplyNationProfileExtractor();