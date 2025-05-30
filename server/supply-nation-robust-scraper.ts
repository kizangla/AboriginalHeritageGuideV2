import puppeteer, { Browser, Page } from 'puppeteer';
import { db } from './db';
import { supplyNationBusinesses, abrBusinesses } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface SupplyNationBusinessData {
  abn: string;
  companyName: string;
  tradingName?: string;
  supplynationId: string;
  verified: boolean;
  certifications: string[];
  certificationBadges: any;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  contactPerson?: string;
  streetAddress?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  fullAddress?: string;
  lat?: number;
  lng?: number;
  categories: string[];
  capabilities: string[];
  description?: string;
  profileUrl?: string;
  lastUpdated?: string;
}

export class SupplyNationRobustScraper {
  private browser: Browser | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized && this.browser) return;

    try {
      console.log('Initializing robust Supply Nation scraper...');
      
      this.browser = await puppeteer.launch({
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
          '--disable-extensions',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });

      this.isInitialized = true;
      console.log('Supply Nation robust scraper initialized successfully');
    } catch (error) {
      console.error('Failed to initialize robust scraper:', error);
      throw error;
    }
  }

  async authenticateWithSupplyNation(page: Page): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        console.error('Supply Nation credentials not available');
        return false;
      }

      console.log('Authenticating with Supply Nation...');

      // Navigate to login page
      await page.goto('https://ibd.supplynation.org.au/public/login', { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for login form
      await page.waitForSelector('input[name="username"], input[type="email"]', { timeout: 10000 });

      // Fill in credentials
      const usernameField = await page.$('input[name="username"]') || await page.$('input[type="email"]');
      const passwordField = await page.$('input[name="password"]') || await page.$('input[type="password"]');

      if (usernameField && passwordField) {
        await usernameField.type(username);
        await passwordField.type(password);

        // Submit form
        const submitButton = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
        if (submitButton) {
          await submitButton.click();
        } else {
          await passwordField.press('Enter');
        }

        // Wait for navigation after login
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
        
        const currentUrl = page.url();
        const isAuthenticated = !currentUrl.includes('login') && 
                              (currentUrl.includes('dashboard') || currentUrl.includes('home') || currentUrl.includes('search'));
        
        console.log(`Authentication ${isAuthenticated ? 'successful' : 'failed'}`);
        return isAuthenticated;
      }

      return false;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  }

  async extractBusinessDirectory(): Promise<SupplyNationBusinessData[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const allBusinesses: SupplyNationBusinessData[] = [];
    const page = await this.browser!.newPage();

    try {
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

      // Authenticate
      const authenticated = await this.authenticateWithSupplyNation(page);
      if (!authenticated) {
        console.log('Could not authenticate, proceeding with public access');
      }

      // Navigate to business directory/search page
      console.log('Navigating to Supply Nation business directory...');
      await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Extract all business listings systematically
      const businesses = await this.extractAllBusinessListings(page);
      allBusinesses.push(...businesses);

      console.log(`Extracted ${allBusinesses.length} authentic Supply Nation businesses`);
      return allBusinesses;

    } catch (error) {
      console.error('Error extracting business directory:', error);
      return allBusinesses;
    } finally {
      await page.close();
    }
  }

  private async extractAllBusinessListings(page: Page): Promise<SupplyNationBusinessData[]> {
    const businesses: SupplyNationBusinessData[] = [];

    try {
      // Wait for the page to load completely
      await page.waitForSelector('body', { timeout: 10000 });

      // Look for business listing containers
      const businessElements = await page.$$eval(
        '.supplier-card, .business-card, .search-result-item, [data-component*="Supplier"], .result-item, .directory-item',
        (elements) => {
          return elements.map((element, index) => {
            try {
              // Extract basic business information
              const titleElement = element.querySelector('h1, h2, h3, .title, .business-name, .supplier-name, .company-name');
              const companyName = titleElement?.textContent?.trim() || '';

              if (!companyName) return null;

              // Extract location
              const locationElement = element.querySelector('.location, .address, .suburb, .state');
              const location = locationElement?.textContent?.trim() || '';

              // Extract contact information
              const phoneElement = element.querySelector('[href^="tel:"], .phone');
              const emailElement = element.querySelector('[href^="mailto:"], .email');
              const websiteElement = element.querySelector('[href^="http"], .website');

              const phone = phoneElement?.textContent?.trim() || phoneElement?.getAttribute('href')?.replace('tel:', '') || '';
              const email = emailElement?.textContent?.trim() || emailElement?.getAttribute('href')?.replace('mailto:', '') || '';
              const website = websiteElement?.getAttribute('href') || '';

              // Extract categories/services
              const categoryElements = element.querySelectorAll('.category, .service, .tag, .capability, .industry');
              const categories: string[] = [];
              categoryElements.forEach(cat => {
                const text = cat.textContent?.trim();
                if (text && text.length > 2) categories.push(text);
              });

              // Check for certification badges
              const certificationElements = element.querySelectorAll('[src*="certif"], .certified, .verified, [class*="certif"], [alt*="certif"]');
              const certifications: string[] = [];
              const certificationBadges: any = {};

              certificationElements.forEach(cert => {
                const altText = cert.getAttribute('alt') || '';
                const className = cert.className || '';
                const src = cert.getAttribute('src') || '';
                
                if (altText.includes('Supply Nation') || src.includes('supplynation')) {
                  certifications.push('Supply Nation Certified');
                  certificationBadges.supplyNation = { verified: true, src };
                }
                if (altText.includes('Female') || className.includes('female')) {
                  certifications.push('Female Owned');
                  certificationBadges.femaleOwned = { verified: true };
                }
                if (altText.includes('Small') || altText.includes('Medium')) {
                  certifications.push('Small Medium Enterprise');
                  certificationBadges.sme = { verified: true };
                }
                if (altText.includes('Winner') || altText.includes('Award')) {
                  certifications.push('Award Winner');
                  certificationBadges.award = { verified: true };
                }
              });

              // Extract profile link
              const profileLinkElement = element.querySelector('a[href*="supplier"], a[href*="profile"]');
              const profileUrl = profileLinkElement?.getAttribute('href') || '';

              // Extract ABN if visible
              const abnElement = element.querySelector('.abn, .ABN, [class*="abn"]');
              let abn = abnElement?.textContent?.trim().replace(/[^0-9]/g, '') || '';
              if (abn.length !== 11) abn = '';

              return {
                abn,
                companyName,
                supplynationId: `sn_extracted_${index}`,
                verified: certifications.includes('Supply Nation Certified'),
                certifications,
                certificationBadges,
                contactPhone: phone,
                contactEmail: email,
                website,
                fullAddress: location,
                categories: categories.length > 0 ? categories : ['Indigenous business services'],
                capabilities: categories,
                description: categories.join(' • '),
                profileUrl: profileUrl ? `https://ibd.supplynation.org.au${profileUrl}` : '',
                extractedAt: new Date().toISOString()
              };
            } catch (err) {
              console.log('Error extracting business data:', err);
              return null;
            }
          }).filter(business => business !== null);
        }
      );

      businesses.push(...businessElements);

      // If we found businesses, try to extract more detailed information
      if (businesses.length > 0) {
        console.log(`Found ${businesses.length} businesses, extracting detailed profiles...`);
        
        for (let i = 0; i < Math.min(businesses.length, 10); i++) {
          const business = businesses[i];
          if (business.profileUrl) {
            try {
              const detailedInfo = await this.extractDetailedProfile(page, business.profileUrl);
              if (detailedInfo) {
                Object.assign(business, detailedInfo);
              }
            } catch (error) {
              console.log(`Error extracting detailed profile for ${business.companyName}:`, error);
            }
          }
        }
      }

      return businesses;
    } catch (error) {
      console.error('Error extracting business listings:', error);
      return businesses;
    }
  }

  private async extractDetailedProfile(page: Page, profileUrl: string): Promise<Partial<SupplyNationBusinessData> | null> {
    try {
      await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 15000 });

      const detailedInfo = await page.evaluate(() => {
        // Extract ABN
        const abnElement = document.querySelector('.abn, .ABN, [class*="abn"]');
        let abn = abnElement?.textContent?.trim().replace(/[^0-9]/g, '') || '';
        if (abn.length !== 11) abn = '';

        // Extract detailed address
        const addressElement = document.querySelector('.address, .location, [class*="address"]');
        const fullAddress = addressElement?.textContent?.trim() || '';

        // Parse address components
        const addressParts = fullAddress.split(',').map(part => part.trim());
        let streetAddress = '', suburb = '', state = '', postcode = '';
        
        if (addressParts.length >= 3) {
          streetAddress = addressParts[0] || '';
          suburb = addressParts[1] || '';
          const lastPart = addressParts[addressParts.length - 1];
          const statePostcodeMatch = lastPart.match(/([A-Z]{2,3})\s+(\d{4})/);
          if (statePostcodeMatch) {
            state = statePostcodeMatch[1];
            postcode = statePostcodeMatch[2];
          }
        }

        // Extract contact person
        const contactPersonElement = document.querySelector('.contact-person, .contact-name, [class*="contact"]');
        const contactPerson = contactPersonElement?.textContent?.trim() || '';

        // Extract trading name
        const tradingElement = document.querySelector('.trading-name, [class*="trading"]');
        const tradingName = tradingElement?.textContent?.trim() || '';

        return {
          abn,
          tradingName,
          streetAddress,
          suburb,
          state,
          postcode,
          fullAddress,
          contactPerson
        };
      });

      return detailedInfo;
    } catch (error) {
      console.log('Error extracting detailed profile:', error);
      return null;
    }
  }

  async saveBusinessesToDatabase(businesses: SupplyNationBusinessData[]): Promise<void> {
    if (businesses.length === 0) return;

    console.log(`Saving ${businesses.length} businesses to database...`);

    for (const business of businesses) {
      try {
        // Check if business already exists
        const existing = await db.select().from(supplyNationBusinesses)
          .where(eq(supplyNationBusinesses.supplynationId, business.supplynationId))
          .limit(1);

        if (existing.length === 0) {
          // Insert new business
          await db.insert(supplyNationBusinesses).values({
            abn: business.abn || '',
            companyName: business.companyName,
            tradingName: business.tradingName,
            supplynationId: business.supplynationId,
            verified: business.verified ? 1 : 0,
            certifications: business.certifications,
            certificationBadges: business.certificationBadges,
            contactPhone: business.contactPhone,
            contactEmail: business.contactEmail,
            website: business.website,
            contactPerson: business.contactPerson,
            streetAddress: business.streetAddress,
            suburb: business.suburb,
            state: business.state,
            postcode: business.postcode,
            fullAddress: business.fullAddress,
            lat: business.lat,
            lng: business.lng,
            categories: business.categories,
            capabilities: business.capabilities,
            description: business.description,
            profileUrl: business.profileUrl,
            lastUpdated: business.lastUpdated,
            extractedAt: new Date().toISOString(),
            dataSource: 'supply_nation'
          });

          console.log(`Saved new business: ${business.companyName}`);
        } else {
          console.log(`Business already exists: ${business.companyName}`);
        }
      } catch (error) {
        console.error(`Error saving business ${business.companyName}:`, error);
      }
    }

    console.log('Finished saving businesses to database');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
    }
  }
}

export const supplyNationRobustScraper = new SupplyNationRobustScraper();