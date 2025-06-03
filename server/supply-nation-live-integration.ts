/**
 * Supply Nation Live Integration
 * Production-ready authentication and business search
 */

import puppeteer from 'puppeteer';

export interface LiveSupplyNationBusiness {
  companyName: string;
  abn?: string;
  location?: string;
  supplynationId: string;
  profileUrl?: string;
  verified: boolean;
  categories?: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  description?: string;
}

export interface LiveSearchResult {
  success: boolean;
  businesses: LiveSupplyNationBusiness[];
  authenticationStatus: 'success' | 'failed' | 'timeout';
  searchExecuted: boolean;
  error?: string;
}

export class SupplyNationLiveIntegration {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async executeAuthentication(): Promise<{
    success: boolean;
    authenticated: boolean;
    stage: string;
    details: string;
  }> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        return {
          success: false,
          authenticated: false,
          stage: 'credentials',
          details: 'Supply Nation credentials not available'
        };
      }

      // Initialize browser with optimized settings
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate to login
      await this.page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 20000
      });

      // Wait for page stability
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check page state
      const pageState = await this.page.evaluate(() => ({
        title: document.title,
        url: window.location.href,
        hasEmailInput: document.querySelector('input[type="email"], input[type="text"]') !== null,
        hasPasswordInput: document.querySelector('input[type="password"]') !== null
      }));

      if (!pageState.hasEmailInput || !pageState.hasPasswordInput) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          stage: 'form_detection',
          details: `Page state: ${pageState.title}, inputs: email=${pageState.hasEmailInput}, password=${pageState.hasPasswordInput}`
        };
      }

      // Fill credentials
      const emailInput = await this.page.$('input[type="email"], input[type="text"]');
      if (emailInput) {
        await emailInput.click();
        await emailInput.type(username, { delay: 50 });
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const passwordInput = await this.page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.click();
        await passwordInput.type(password, { delay: 50 });
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Submit form
      await this.page.keyboard.press('Enter');

      // Monitor authentication response
      await new Promise(resolve => setTimeout(resolve, 4000));

      const finalState = await this.page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        isOnLogin: window.location.href.includes('/login'),
        bodyText: document.body.textContent?.substring(0, 200)
      }));

      const authenticated = !finalState.isOnLogin && finalState.url.includes('supplynation.org.au');

      return {
        success: true,
        authenticated,
        stage: authenticated ? 'authenticated' : 'authentication_pending',
        details: `Final URL: ${finalState.url}, Title: ${finalState.title}`
      };

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        authenticated: false,
        stage: 'error',
        details: (error as Error).message
      };
    }
  }

  async searchLiveBusinesses(query: string): Promise<LiveSearchResult> {
    try {
      const authResult = await this.executeAuthentication();
      
      if (!authResult.success || !authResult.authenticated) {
        return {
          success: false,
          businesses: [],
          authenticationStatus: 'failed',
          searchExecuted: false,
          error: authResult.details
        };
      }

      // Navigate to search
      await this.page?.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'networkidle0',
        timeout: 15000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Execute search
      const searchInput = await this.page?.$('input[type="search"], input[name*="search"], input[placeholder*="search" i]');
      
      if (!searchInput) {
        await this.cleanup();
        return {
          success: false,
          businesses: [],
          authenticationStatus: 'success',
          searchExecuted: false,
          error: 'Search interface not found'
        };
      }

      await searchInput.type(query, { delay: 100 });
      await this.page?.keyboard.press('Enter');

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract business results
      const businesses = await this.page?.evaluate(() => {
        const results: any[] = [];
        
        // Comprehensive selectors for business listings
        const selectors = [
          '.business-result',
          '.search-result', 
          '.supplier-listing',
          '.business-card',
          '.company-listing',
          'article',
          '.result-item',
          '.business-profile',
          '.listing',
          '[data-business]'
        ];

        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          
          if (elements.length > 0) {
            elements.forEach((element, index) => {
              if (index < 20) {
                const business: any = {
                  companyName: '',
                  supplynationId: `live_${Date.now()}_${index}`,
                  verified: true,
                  categories: [],
                  contactInfo: {}
                };

                // Extract company name
                const nameSelectors = ['h1', 'h2', 'h3', 'h4', '.name', '.company-name', '.business-name', '.title'];
                for (const nameSelector of nameSelectors) {
                  const nameEl = element.querySelector(nameSelector);
                  if (nameEl?.textContent?.trim()) {
                    business.companyName = nameEl.textContent.trim();
                    break;
                  }
                }

                if (!business.companyName) {
                  return; // Skip if no company name found
                }

                // Extract location
                const locationSelectors = ['.location', '.address', '.suburb', '.state', '.postcode'];
                for (const locSelector of locationSelectors) {
                  const locEl = element.querySelector(locSelector);
                  if (locEl?.textContent?.trim()) {
                    business.location = locEl.textContent.trim();
                    break;
                  }
                }

                // Extract profile URL
                const linkEl = element.querySelector('a[href]');
                if (linkEl) {
                  const href = (linkEl as HTMLAnchorElement).href;
                  business.profileUrl = href.startsWith('http') ? href : `https://ibd.supplynation.org.au${href}`;
                }

                // Extract description
                const descSelectors = ['.description', '.summary', '.business-description', 'p'];
                for (const descSelector of descSelectors) {
                  const descEl = element.querySelector(descSelector);
                  if (descEl?.textContent?.trim()) {
                    business.description = descEl.textContent.trim();
                    break;
                  }
                }

                // Extract contact information and ABN from text
                const elementText = element.textContent || '';
                
                // ABN extraction
                const abnMatch = elementText.match(/\b\d{11}\b/);
                if (abnMatch) {
                  business.abn = abnMatch[0];
                }

                // Phone extraction
                const phonePatterns = [
                  /\b(?:\+61[\s-]?)?\d{2,4}[\s-]?\d{4}[\s-]?\d{4}\b/,
                  /\b0\d[\s-]?\d{4}[\s-]?\d{4}\b/
                ];
                
                for (const pattern of phonePatterns) {
                  const phoneMatch = elementText.match(pattern);
                  if (phoneMatch) {
                    business.contactInfo.phone = phoneMatch[0];
                    break;
                  }
                }

                // Email extraction
                const emailMatch = elementText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) {
                  business.contactInfo.email = emailMatch[0];
                }

                // Category extraction
                const categoryElements = element.querySelectorAll('.category, .tag, .service, .industry');
                categoryElements.forEach(catEl => {
                  const categoryText = catEl.textContent?.trim();
                  if (categoryText && categoryText.length > 2) {
                    business.categories.push(categoryText);
                  }
                });

                results.push(business);
              }
            });
            break; // Found results with this selector, stop trying others
          }
        }

        return results;
      }) || [];

      await this.cleanup();

      return {
        success: true,
        businesses,
        authenticationStatus: 'success',
        searchExecuted: true
      };

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        businesses: [],
        authenticationStatus: 'timeout',
        searchExecuted: false,
        error: (error as Error).message
      };
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    } catch (error) {
      console.error('Cleanup error:', (error as Error).message);
    }
  }
}

export const supplyNationLiveIntegration = new SupplyNationLiveIntegration();