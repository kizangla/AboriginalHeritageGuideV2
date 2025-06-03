/**
 * Supply Nation Data Inspector
 * Direct search testing to show actual data structure
 */

import puppeteer from 'puppeteer';

export interface SupplyNationBusinessData {
  companyName: string;
  profileUrl: string;
  location?: string;
  state?: string;
  postcode?: string;
  categories?: string[];
  services?: string[];
  description?: string;
  verificationStatus?: string;
  certifications?: string[];
  contactEmail?: string;
  phone?: string;
  website?: string;
  abn?: string;
  establishedYear?: string;
  employeeCount?: string;
  annualTurnover?: string;
  indigenousOwnership?: string;
  supplyNationMemberSince?: string;
  businessType?: string;
  keyCapabilities?: string[];
  projectExperience?: string[];
  clientTestimonials?: string[];
}

export interface SupplyNationSearchData {
  searchQuery: string;
  totalResults: number;
  businesses: SupplyNationBusinessData[];
  searchExecuted: boolean;
  pageStructure: {
    hasSearchForm: boolean;
    hasResults: boolean;
    noResultsMessage: boolean;
    authenticationStatus: boolean;
  };
  rawPageData: {
    url: string;
    title: string;
    contentLength: number;
    searchTermFound: boolean;
  };
}

export class SupplyNationDataInspector {
  async inspectKulbardiData(): Promise<SupplyNationSearchData> {
    const username = process.env.SUPPLY_NATION_USERNAME;
    const password = process.env.SUPPLY_NATION_PASSWORD;

    if (!username || !password) {
      throw new Error('Supply Nation credentials required for data inspection');
    }

    let browser = null;
    let page = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      page.setDefaultTimeout(60000);

      // Authentication process
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Set credentials
      await page.evaluate((usr, pwd) => {
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailField && passwordField) {
          emailField.value = usr;
          passwordField.value = pwd;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, username, password);

      // Submit login
      await page.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
        if (submitButton) submitButton.click();
      });

      // Wait for authentication
      for (let i = 0; i < 15; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const currentUrl = await page.url();
        if (!currentUrl.includes('login')) break;
      }

      // Navigate to search
      await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Execute search
      const searchExecuted = await page.evaluate(() => {
        const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;
        
        if (searchInput && searchInput.offsetHeight > 0) {
          searchInput.value = 'Kulbardi';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          const form = searchInput.closest('form');
          if (form) {
            form.submit();
            return true;
          }
        }
        return false;
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract comprehensive data
      const searchData = await page.evaluate(() => {
        const businesses: any[] = [];
        
        // Multiple selector strategies for business results
        const businessSelectors = [
          'a[href*="supplierprofile"]',
          '.search-result',
          '.business-card',
          '.supplier-card',
          '.result-item',
          '[data-business]',
          '.slds-card',
          '.listing-item'
        ];

        let businessElements: Element[] = [];
        businessSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          businessElements = [...businessElements, ...Array.from(elements)];
        });

        // Remove duplicates
        businessElements = businessElements.filter((element, index, self) => 
          self.findIndex(e => e.isEqualNode(element)) === index
        );

        businessElements.forEach((element) => {
          const business: any = {};
          
          // Company name extraction
          const nameSelectors = ['h2', 'h3', '.business-name', '.company-name', '.supplier-name', '.title'];
          for (const selector of nameSelectors) {
            const nameElement = element.querySelector(selector);
            if (nameElement && nameElement.textContent?.trim()) {
              business.companyName = nameElement.textContent.trim();
              break;
            }
          }
          
          if (!business.companyName && element.textContent?.trim()) {
            business.companyName = element.textContent.trim().split('\n')[0];
          }

          // Profile URL
          if (element.tagName === 'A') {
            business.profileUrl = (element as HTMLAnchorElement).href;
          } else {
            const link = element.querySelector('a[href*="supplierprofile"]');
            if (link) business.profileUrl = (link as HTMLAnchorElement).href;
          }

          // Location information
          const locationSelectors = ['.location', '.address', '.state', '.postcode', '.geographic'];
          locationSelectors.forEach(selector => {
            const locationElement = element.querySelector(selector);
            if (locationElement && locationElement.textContent?.trim()) {
              if (selector.includes('state')) {
                business.state = locationElement.textContent.trim();
              } else if (selector.includes('postcode')) {
                business.postcode = locationElement.textContent.trim();
              } else {
                business.location = locationElement.textContent.trim();
              }
            }
          });

          // Categories and services
          const categorySelectors = ['.category', '.service', '.tag', '.industry', '.capability'];
          categorySelectors.forEach(selector => {
            const categoryElements = element.querySelectorAll(selector);
            if (categoryElements.length > 0) {
              const categories = Array.from(categoryElements)
                .map(cat => cat.textContent?.trim())
                .filter(Boolean);
              if (categories.length > 0) {
                business.categories = categories;
              }
            }
          });

          // Description
          const descSelectors = ['.description', '.summary', '.overview', 'p', '.content'];
          for (const selector of descSelectors) {
            const descElement = element.querySelector(selector);
            if (descElement && descElement.textContent?.trim()) {
              business.description = descElement.textContent.trim();
              break;
            }
          }

          // Verification status
          const verificationSelectors = ['.verified', '.certification', '.badge', '.status', '.member'];
          verificationSelectors.forEach(selector => {
            const verificationElement = element.querySelector(selector);
            if (verificationElement && verificationElement.textContent?.trim()) {
              business.verificationStatus = verificationElement.textContent.trim();
            }
          });

          // Contact information
          const emailElement = element.querySelector('a[href^="mailto:"]');
          if (emailElement) {
            business.contactEmail = (emailElement as HTMLAnchorElement).href.replace('mailto:', '');
          }

          const phoneElement = element.querySelector('a[href^="tel:"], .phone, .contact-phone');
          if (phoneElement) {
            business.phone = phoneElement.textContent?.trim();
          }

          // Website
          const websiteElement = element.querySelector('a[href^="http"]:not([href*="supplynation.org.au"])');
          if (websiteElement) {
            business.website = (websiteElement as HTMLAnchorElement).href;
          }

          // ABN
          const abnPattern = /ABN[:\s]*(\d{11})/i;
          const abnMatch = element.textContent?.match(abnPattern);
          if (abnMatch) {
            business.abn = abnMatch[1];
          }

          // Additional business details
          const establishedPattern = /established[:\s]*(\d{4})/i;
          const establishedMatch = element.textContent?.match(establishedPattern);
          if (establishedMatch) {
            business.establishedYear = establishedMatch[1];
          }

          const employeePattern = /(\d+)[+\s]*employees?/i;
          const employeeMatch = element.textContent?.match(employeePattern);
          if (employeeMatch) {
            business.employeeCount = employeeMatch[0];
          }

          if (business.companyName) {
            businesses.push(business);
          }
        });

        // Page structure analysis
        const pageStructure = {
          hasSearchForm: document.querySelector('input[type="search"], form') !== null,
          hasResults: businessElements.length > 0,
          noResultsMessage: document.body.innerText.toLowerCase().includes('no results') || 
                           document.body.innerText.toLowerCase().includes('no matches') ||
                           document.body.innerText.toLowerCase().includes('0 results'),
          authenticationStatus: !window.location.href.includes('login') && 
                               (document.body.innerText.toLowerCase().includes('logout') || 
                                document.querySelector('a[href*="logout"]') !== null)
        };

        // Raw page data
        const rawPageData = {
          url: window.location.href,
          title: document.title,
          contentLength: document.body.innerText.length,
          searchTermFound: document.body.innerText.toLowerCase().includes('kulbardi')
        };

        return {
          businesses,
          pageStructure,
          rawPageData,
          totalElementsFound: businessElements.length
        };
      });

      await browser.close();

      return {
        searchQuery: 'Kulbardi',
        totalResults: searchData.businesses.length,
        businesses: searchData.businesses,
        searchExecuted,
        pageStructure: searchData.pageStructure,
        rawPageData: searchData.rawPageData
      };

    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }

  async getDetailedBusinessProfile(profileUrl: string): Promise<SupplyNationBusinessData | null> {
    // Implementation for extracting detailed profile data from individual business pages
    // This would navigate to the specific profile URL and extract comprehensive business information
    return null;
  }
}

export const supplyNationDataInspector = new SupplyNationDataInspector();