/**
 * Streamlined Supply Nation Connector
 * Focused authentication and business verification system
 */

import puppeteer from 'puppeteer';

export interface AuthenticationResult {
  success: boolean;
  authenticated: boolean;
  message: string;
  error?: string;
}

export interface BusinessVerificationResult {
  success: boolean;
  businessFound: boolean;
  verifiedAsIndigenous: boolean;
  companyName?: string;
  abn?: string;
  location?: string;
  profileUrl?: string;
  message: string;
}

export class SupplyNationStreamlinedConnector {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async authenticate(): Promise<AuthenticationResult> {
    try {
      // Initialize browser with minimal configuration
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      this.page = await this.browser.newPage();
      
      // Navigate to Supply Nation login
      const response = await this.page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      if (!response || response.status() !== 200) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          message: 'Failed to access Supply Nation login page',
          error: `HTTP ${response?.status() || 'unknown'}`
        };
      }

      // Check credentials
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          message: 'Supply Nation credentials required for authentication',
          error: 'Missing credentials'
        };
      }

      // Wait for form elements
      await this.page.waitForSelector('input[type="email"], input[type="password"]', {
        timeout: 10000
      });

      // Fill credentials
      const credentialsFilled = await this.page.evaluate((usr, pwd) => {
        const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailInput && passwordInput) {
          emailInput.value = usr;
          passwordInput.value = pwd;
          return true;
        }
        return false;
      }, username, password);

      if (!credentialsFilled) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          message: 'Could not locate login form fields',
          error: 'Form fields not found'
        };
      }

      // Submit form
      const formSubmitted = await this.page.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
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
          message: 'Could not submit login form',
          error: 'Submit button not found'
        };
      }

      // Wait for authentication response
      try {
        await this.page.waitForNavigation({ 
          waitUntil: 'domcontentloaded', 
          timeout: 10000 
        });
      } catch (navError) {
        // Navigation timeout is acceptable, check for authentication indicators
      }

      // Check authentication success
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const authenticationSuccess = await this.page.evaluate(() => {
        const pageText = document.body.innerText;
        const authIndicators = [
          'searchIBDButton',
          'Search Indigenous Business',
          'Indigenous Business Directory'
        ];
        
        const hasAuthIndicators = authIndicators.some(indicator => 
          pageText.includes(indicator)
        );
        
        const notOnLoginPage = !window.location.href.includes('/login');
        
        return {
          authenticated: hasAuthIndicators || notOnLoginPage,
          currentUrl: window.location.href,
          pageTitle: document.title
        };
      });

      if (authenticationSuccess?.authenticated) {
        return {
          success: true,
          authenticated: true,
          message: `Authentication successful. Current page: ${authenticationSuccess.currentUrl}`
        };
      } else {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          message: 'Authentication failed - no authenticated page indicators found',
          error: 'Authentication indicators not detected'
        };
      }

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        authenticated: false,
        message: 'Authentication process failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async verifyBusiness(businessName: string): Promise<BusinessVerificationResult> {
    if (!this.page) {
      return {
        success: false,
        businessFound: false,
        verifiedAsIndigenous: false,
        message: 'Not authenticated with Supply Nation'
      };
    }

    try {
      // Navigate to search page
      await this.page.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // Perform search
      const searchExecuted = await this.page.evaluate((query) => {
        const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.value = query;
          
          // Try form submission
          const form = searchInput.closest('form');
          if (form) {
            form.submit();
            return true;
          }
        }
        return false;
      }, businessName);

      if (!searchExecuted) {
        return {
          success: false,
          businessFound: false,
          verifiedAsIndigenous: false,
          message: 'Could not execute search on Supply Nation'
        };
      }

      // Wait for search results
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract business results
      const searchResults = await this.page.evaluate(() => {
        const businesses: any[] = [];
        
        // Look for business profile links
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
        
        profileLinks.forEach((link) => {
          const companyName = link.textContent?.trim();
          const profileUrl = (link as HTMLAnchorElement).href;
          
          if (companyName && profileUrl) {
            businesses.push({
              companyName,
              profileUrl,
              verified: true
            });
          }
        });

        return businesses;
      });

      if (searchResults.length > 0) {
        const matchingBusiness = searchResults.find(business => 
          business.companyName.toLowerCase().includes(businessName.toLowerCase()) ||
          businessName.toLowerCase().includes(business.companyName.toLowerCase())
        );

        if (matchingBusiness) {
          return {
            success: true,
            businessFound: true,
            verifiedAsIndigenous: true,
            companyName: matchingBusiness.companyName,
            profileUrl: matchingBusiness.profileUrl,
            message: `${matchingBusiness.companyName} found and verified as Indigenous business in Supply Nation directory`
          };
        } else {
          return {
            success: true,
            businessFound: true,
            verifiedAsIndigenous: false,
            message: `${searchResults.length} businesses found in search results, but no exact match for "${businessName}"`
          };
        }
      } else {
        return {
          success: true,
          businessFound: false,
          verifiedAsIndigenous: false,
          message: `No businesses found in Supply Nation directory for "${businessName}"`
        };
      }

    } catch (error) {
      return {
        success: false,
        businessFound: false,
        verifiedAsIndigenous: false,
        message: 'Business verification failed',
        error: error instanceof Error ? error.message : 'Unknown verification error'
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
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  isConnected(): boolean {
    return this.browser !== null && this.page !== null;
  }
}

export const supplyNationStreamlinedConnector = new SupplyNationStreamlinedConnector();