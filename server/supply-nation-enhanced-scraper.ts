import puppeteer from 'puppeteer';
import { SupplyNationBusiness } from './abr-service';

export interface EnhancedSupplyNationBusiness extends SupplyNationBusiness {
  profileUrl?: string;
  detailedAddress?: {
    streetAddress: string;
    suburb: string;
    state: string;
    postcode: string;
    fullAddress: string;
  };
  contactDetails?: {
    phone?: string;
    email?: string;
    website?: string;
    contactPerson?: string;
  };
  businessDetails?: {
    description?: string;
    services?: string[];
    certifications?: string[];
    yearEstablished?: string;
    employeeCount?: string;
  };
}

export class SupplyNationEnhancedScraper {
  private browser: puppeteer.Browser | null = null;
  private isAuthenticated: boolean = false;

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

  async authenticate(): Promise<boolean> {
    try {
      await this.initialize();
      
      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      const page = await this.browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      console.log('Authenticating with Supply Nation...');
      
      // Navigate to login page
      await page.goto('https://ibd.supplynation.org.au/public/s/login', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Check if credentials are available
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        console.log('Supply Nation credentials not available');
        await page.close();
        return false;
      }

      // Fill login form
      await page.waitForSelector('input[name="username"], input[type="email"]', { timeout: 10000 });
      await page.type('input[name="username"], input[type="email"]', username);
      await page.type('input[name="password"], input[type="password"]', password);

      // Submit form
      await page.click('button[type="submit"], input[type="submit"]');
      
      // Wait for navigation and check if login was successful
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      const currentUrl = page.url();
      console.log(`Authentication result URL: ${currentUrl}`);
      
      this.isAuthenticated = !currentUrl.includes('/login') && !currentUrl.includes('/error');
      
      await page.close();
      return this.isAuthenticated;

    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  async searchAndExtractProfiles(query: string): Promise<EnhancedSupplyNationBusiness[]> {
    try {
      if (!this.isAuthenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          console.log('Cannot search without authentication');
          return [];
        }
      }

      await this.initialize();
      
      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      const page = await this.browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      console.log(`Searching Supply Nation for: ${query}`);
      
      // Navigate to search page
      const searchUrl = `https://ibd.supplynation.org.au/public/s/search-results?q=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for search results to load
      await page.waitForTimeout(3000);

      // Extract profile URLs from search results
      const profileUrls = await page.evaluate(() => {
        const links: string[] = [];
        
        // Look for profile links with accid parameter
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile?accid="]');
        
        profileLinks.forEach(link => {
          const href = (link as HTMLAnchorElement).href;
          if (href && !links.includes(href)) {
            links.push(href);
          }
        });

        // Also look for any links that might contain profile IDs
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach(link => {
          const href = (link as HTMLAnchorElement).href;
          if (href && href.includes('accid=') && !links.includes(href)) {
            links.push(href);
          }
        });

        return links;
      });

      console.log(`Found ${profileUrls.length} profile URLs`);

      await page.close();

      // Extract detailed information from each profile
      const enhancedBusinesses: EnhancedSupplyNationBusiness[] = [];

      for (const profileUrl of profileUrls.slice(0, 5)) { // Limit to 5 profiles to avoid timeout
        try {
          const detailedBusiness = await this.extractDetailedProfile(profileUrl);
          if (detailedBusiness) {
            enhancedBusinesses.push(detailedBusiness);
          }
          
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to extract profile from ${profileUrl}:`, error);
        }
      }

      return enhancedBusinesses;

    } catch (error) {
      console.error('Search and extraction failed:', error);
      return [];
    }
  }

  async extractDetailedProfile(profileUrl: string): Promise<EnhancedSupplyNationBusiness | null> {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      if (!this.browser) {
        throw new Error('Failed to initialize browser');
      }

      const page = await this.browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      console.log(`Extracting detailed profile from: ${profileUrl}`);
      
      // Navigate to the supplier profile page
      await page.goto(profileUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait for page content to load
      await page.waitForTimeout(3000);

      // Extract detailed business information
      const profileData = await page.evaluate(() => {
        const business: any = {
          verified: true,
          categories: [],
          capabilities: [],
          certifications: ['Supply Nation Verified'],
          contactInfo: {}
        };

        // Extract company name
        const companyNameSelectors = [
          'h1', 
          '.company-name', 
          '[data-testid="company-name"]',
          '.business-name',
          '.supplier-name'
        ];
        
        for (const selector of companyNameSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent) {
            business.companyName = element.textContent.trim();
            break;
          }
        }

        // Extract address information
        const addressElements = document.querySelectorAll('div, p, span, address');
        let streetAddress = '';
        let suburb = '';
        let state = '';
        let postcode = '';
        let fullAddress = '';

        for (const el of addressElements) {
          const text = el.textContent?.trim() || '';
          
          // Look for street address patterns
          if (text.match(/^\d+.*?(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Boulevard|Blvd)/i)) {
            streetAddress = text;
          }
          
          // Look for suburb, state, postcode pattern
          const addressMatch = text.match(/^([A-Za-z\s]+),?\s*([A-Z]{2,3})\s*(\d{4})$/);
          if (addressMatch) {
            suburb = addressMatch[1].trim();
            state = addressMatch[2].trim();
            postcode = addressMatch[3].trim();
            fullAddress = text;
          }
          
          // Look for complete address patterns
          const completeAddressMatch = text.match(/(\d+.*?(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|Way|Boulevard|Blvd)),?\s*([A-Za-z\s]+),?\s*([A-Z]{2,3})\s*(\d{4})/i);
          if (completeAddressMatch) {
            streetAddress = completeAddressMatch[1].trim();
            suburb = completeAddressMatch[2].trim();
            state = completeAddressMatch[3].trim();
            postcode = completeAddressMatch[4].trim();
            fullAddress = text;
            break;
          }
        }

        if (streetAddress || suburb || state || postcode) {
          business.detailedAddress = {
            streetAddress: streetAddress || '',
            suburb: suburb || '',
            state: state || '',
            postcode: postcode || '',
            fullAddress: fullAddress || `${streetAddress}, ${suburb}, ${state} ${postcode}`.replace(/^,\s*/, '').trim()
          };
        }

        // Extract contact information
        const phonePattern = /(\+?61\s?)?(\(0[0-9]\)|0[0-9])\s?[0-9]{4}\s?[0-9]{4}/;
        const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const websitePattern = /(https?:\/\/)?(www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

        business.contactDetails = {};

        for (const el of document.querySelectorAll('a, span, div, p')) {
          const text = el.textContent?.trim() || '';
          const href = (el as HTMLAnchorElement).href;

          if (phonePattern.test(text)) {
            business.contactDetails.phone = text;
          }
          
          if (emailPattern.test(text)) {
            business.contactDetails.email = text;
          }
          
          if (href && websitePattern.test(href) && !href.includes('supplynation.org.au')) {
            business.contactDetails.website = href;
          }
        }

        // Extract business description
        const descriptionSelectors = [
          'p', 
          'div[class*="description"]', 
          'div[class*="about"]',
          '.business-description',
          '.company-description'
        ];

        business.businessDetails = {};

        for (const selector of descriptionSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent?.trim() || '';
            if (text.length > 100 && !text.includes('©') && !text.includes('Privacy')) {
              business.businessDetails.description = text.substring(0, 500);
              break;
            }
          }
          if (business.businessDetails.description) break;
        }

        // Extract services/capabilities
        const services: string[] = [];
        const serviceSelectors = [
          'li', 
          'span[class*="tag"]', 
          'div[class*="service"]',
          '.capability',
          '.service-tag'
        ];

        for (const selector of serviceSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const text = el.textContent?.trim() || '';
            if (text.length > 3 && text.length < 100 && !text.includes('©')) {
              services.push(text);
            }
          }
        }
        
        if (services.length > 0) {
          business.businessDetails.services = services.slice(0, 10);
        }

        // Extract ABN if available
        const abnElements = document.querySelectorAll('*');
        for (const el of abnElements) {
          const text = el.textContent?.trim() || '';
          const abnMatch = text.match(/ABN\s*:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
          if (abnMatch) {
            business.abn = abnMatch[1].replace(/\s/g, '');
            break;
          }
        }

        return business;
      });

      await page.close();

      console.log(`Extracted enhanced profile data for: ${profileData.companyName}`);

      return {
        ...profileData,
        profileUrl,
        supplynationId: this.extractSupplyNationId(profileUrl)
      } as EnhancedSupplyNationBusiness;

    } catch (error) {
      console.error(`Failed to extract detailed profile from ${profileUrl}:`, error);
      return null;
    }
  }

  private extractSupplyNationId(profileUrl: string): string {
    const match = profileUrl.match(/accid=([a-zA-Z0-9]+)/);
    return match ? match[1] : 'unknown';
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.isAuthenticated = false;
  }
}

export const supplyNationEnhancedScraper = new SupplyNationEnhancedScraper();