/**
 * Supply Nation Authenticated Integration
 * Handles the confirmed authentication flow and business verification
 */

import puppeteer from 'puppeteer';

export interface SupplyNationAuthenticationResult {
  success: boolean;
  authenticated: boolean;
  currentUrl: string;
  readyForSearch: boolean;
  message: string;
  sessionCookies?: any[];
}

export interface SupplyNationBusinessSearchResult {
  success: boolean;
  businessesFound: number;
  verifiedBusinesses: Array<{
    companyName: string;
    abn?: string;
    location?: string;
    profileUrl: string;
    verified: boolean;
    categories?: string[];
    description?: string;
  }>;
  searchQuery: string;
  message: string;
}

export class SupplyNationAuthenticatedIntegration {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private isAuthenticated: boolean = false;

  async authenticate(): Promise<SupplyNationAuthenticationResult> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          currentUrl: '',
          readyForSearch: false,
          message: 'Supply Nation credentials required'
        };
      }

      console.log('Starting Supply Nation authentication...');

      // Navigate to login page
      await this.page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Fill credentials
      const credentialsFilled = await this.page.evaluate((usr, pwd) => {
        const emailInput = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailInput && passwordInput) {
          emailInput.focus();
          emailInput.value = usr;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));

          passwordInput.focus();
          passwordInput.value = pwd;
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

          return true;
        }
        return false;
      }, username, password);

      if (!credentialsFilled) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          currentUrl: await this.page.url(),
          readyForSearch: false,
          message: 'Could not fill login credentials'
        };
      }

      console.log('Credentials filled, submitting form...');

      // Submit form
      const formSubmitted = await this.page.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
        if (submitButton) {
          submitButton.click();
          return true;
        }
        return false;
      });

      if (!formSubmitted) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          currentUrl: await this.page.url(),
          readyForSearch: false,
          message: 'Could not submit login form'
        };
      }

      console.log('Form submitted, waiting for authentication flow...');

      // Wait for the redirect sequence: frontdoor.jsp -> CommunitiesLanding -> search-results
      // Allow up to 15 seconds for the full redirect sequence
      let redirectCount = 0;
      let currentUrl = '';
      const maxRedirects = 10;
      const startTime = Date.now();
      const maxWaitTime = 15000;

      while (redirectCount < maxRedirects && (Date.now() - startTime) < maxWaitTime) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        currentUrl = await this.page.url();
        
        console.log(`Redirect ${redirectCount + 1}: ${currentUrl}`);
        
        // Check if we've reached the final authenticated state
        if (currentUrl.includes('CommunitiesLanding') || 
            currentUrl.includes('search-results') ||
            !currentUrl.includes('login')) {
          break;
        }
        
        redirectCount++;
      }

      console.log(`Final URL: ${currentUrl}`);

      // Verify authentication by checking page content and URL
      const authenticationVerified = await this.page.evaluate(() => {
        const currentUrl = window.location.href;
        const pageText = document.body.innerText.toLowerCase();
        
        // Check for authenticated indicators
        const authIndicators = [
          'communities landing',
          'search',
          'indigenous business directory',
          'profile',
          'logout'
        ];
        
        const hasAuthIndicators = authIndicators.some(indicator => 
          pageText.includes(indicator)
        );
        
        const notOnLoginPage = !currentUrl.includes('/login');
        const onAuthenticatedDomain = currentUrl.includes('supplynation.org.au');
        
        return {
          authenticated: (hasAuthIndicators || notOnLoginPage) && onAuthenticatedDomain,
          currentUrl: currentUrl,
          pageTitle: document.title
        };
      });

      if (authenticationVerified.authenticated) {
        // Navigate directly to search results page if not already there
        if (!currentUrl.includes('search-results')) {
          console.log('Navigating to search results page...');
          await this.page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          currentUrl = await this.page.url();
        }

        // Capture session cookies for potential reuse
        const sessionCookies = await this.page.cookies();
        this.isAuthenticated = true;

        console.log('Authentication successful!');
        return {
          success: true,
          authenticated: true,
          currentUrl: currentUrl,
          readyForSearch: true,
          message: 'Successfully authenticated with Supply Nation',
          sessionCookies: sessionCookies
        };
      } else {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          currentUrl: currentUrl,
          readyForSearch: false,
          message: 'Authentication failed - could not verify authenticated state'
        };
      }

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        authenticated: false,
        currentUrl: '',
        readyForSearch: false,
        message: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async searchBusinesses(searchQuery: string): Promise<SupplyNationBusinessSearchResult> {
    if (!this.isAuthenticated || !this.page) {
      return {
        success: false,
        businessesFound: 0,
        verifiedBusinesses: [],
        searchQuery: searchQuery,
        message: 'Not authenticated with Supply Nation'
      };
    }

    try {
      console.log(`Searching Supply Nation for: "${searchQuery}"`);

      // Ensure we're on the search results page
      const currentUrl = await this.page.url();
      if (!currentUrl.includes('search-results')) {
        await this.page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Execute search
      const searchExecuted = await this.page.evaluate((query) => {
        // Try multiple search input selectors
        const searchSelectors = [
          'input[type="search"]',
          'input[name*="search"]',
          'input[placeholder*="search" i]',
          'input[placeholder*="business" i]',
          'input[placeholder*="company" i]',
          '.search-input',
          '#search',
          'input[aria-label*="search" i]'
        ];

        for (const selector of searchSelectors) {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input && input.offsetHeight > 0) {
            input.focus();
            input.value = query;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));

            // Try to submit search
            const form = input.closest('form');
            if (form) {
              form.submit();
              return true;
            }

            // Try enter key
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            input.dispatchEvent(enterEvent);
            return true;
          }
        }
        return false;
      }, searchQuery);

      if (!searchExecuted) {
        return {
          success: false,
          businessesFound: 0,
          verifiedBusinesses: [],
          searchQuery: searchQuery,
          message: 'Could not execute search - search input not found'
        };
      }

      console.log('Search executed, waiting for results...');

      // Wait for search results to load
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract business results
      const searchResults = await this.page.evaluate(() => {
        const businesses: any[] = [];
        
        // Try multiple result selectors based on Supply Nation's structure
        const resultSelectors = [
          'a[href*="supplierprofile"]',
          '.business-result',
          '.supplier-listing',
          '.company-listing',
          'article',
          '.result-item',
          '.search-result',
          '.business-card'
        ];

        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector);
          
          elements.forEach((element) => {
            let profileLink = element as HTMLAnchorElement;
            
            // If element is not a profile link, look for one inside it
            if (!profileLink.href?.includes('supplierprofile')) {
              profileLink = element.querySelector('a[href*="supplierprofile"]') as HTMLAnchorElement;
            }
            
            if (profileLink?.href?.includes('supplierprofile')) {
              const companyName = profileLink.textContent?.trim() || 
                                element.textContent?.trim() || '';
              
              if (companyName && companyName.length > 2) {
                // Look for additional business details
                const parentElement = element.closest('article, .result-item, .business-card') || element;
                const businessText = parentElement.textContent || '';
                
                // Extract location if available
                const locationMatch = businessText.match(/([A-Z]{2,3})\s*(\d{4})/);
                const location = locationMatch ? `${locationMatch[1]} ${locationMatch[2]}` : undefined;
                
                // Extract ABN if available
                const abnMatch = businessText.match(/ABN:?\s*(\d{11})/i);
                const abn = abnMatch ? abnMatch[1] : undefined;
                
                businesses.push({
                  companyName: companyName.trim(),
                  abn: abn,
                  location: location,
                  profileUrl: profileLink.href,
                  verified: true,
                  categories: ['Supply Nation Verified'],
                  description: undefined
                });
              }
            }
          });
          
          if (businesses.length > 0) break;
        }

        return businesses;
      });

      console.log(`Found ${searchResults.length} businesses in search results`);

      return {
        success: true,
        businessesFound: searchResults.length,
        verifiedBusinesses: searchResults,
        searchQuery: searchQuery,
        message: `Found ${searchResults.length} verified Indigenous businesses for "${searchQuery}"`
      };

    } catch (error) {
      return {
        success: false,
        businessesFound: 0,
        verifiedBusinesses: [],
        searchQuery: searchQuery,
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.isAuthenticated = false;
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  getAuthenticationStatus(): boolean {
    return this.isAuthenticated;
  }
}

export const supplyNationAuthenticatedIntegration = new SupplyNationAuthenticatedIntegration();