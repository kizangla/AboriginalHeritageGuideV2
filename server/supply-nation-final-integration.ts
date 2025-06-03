/**
 * Final Supply Nation Integration System
 * Comprehensive authentication and business verification with multiple pathways
 */

import puppeteer from 'puppeteer';

export interface SupplyNationAuthResult {
  success: boolean;
  authenticated: boolean;
  method: 'standard_form' | 'lightning_components' | 'iframe_form' | 'failed';
  message: string;
  pageUrl?: string;
  error?: string;
}

export interface SupplyNationVerificationResult {
  success: boolean;
  businessVerified: boolean;
  companyName?: string;
  abn?: string;
  location?: string;
  profileUrl?: string;
  verificationMethod: 'direct_search' | 'profile_match' | 'not_found';
  message: string;
}

export class SupplyNationFinalIntegration {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async authenticate(): Promise<SupplyNationAuthResult> {
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
      
      // Set user agent to appear more like a real browser
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

      const response = await this.page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 20000
      });

      if (!response || response.status() !== 200) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          method: 'failed',
          message: 'Failed to access Supply Nation login page',
          error: `HTTP ${response?.status() || 'unknown'}`
        };
      }

      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          method: 'failed',
          message: 'Supply Nation credentials required',
          error: 'Missing credentials'
        };
      }

      // Wait for page to fully load and analyze structure
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Try multiple authentication methods
      const methods = [
        () => this.authenticateStandardForm(username, password),
        () => this.authenticateLightningComponents(username, password),
        () => this.authenticateIframeForm(username, password)
      ];

      for (let i = 0; i < methods.length; i++) {
        try {
          const result = await methods[i]();
          if (result.success) {
            return result;
          }
        } catch (error) {
          console.log(`Authentication method ${i + 1} failed:`, error);
          continue;
        }
      }

      await this.cleanup();
      return {
        success: false,
        authenticated: false,
        method: 'failed',
        message: 'All authentication methods failed',
        error: 'Could not complete authentication'
      };

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        authenticated: false,
        method: 'failed',
        message: 'Authentication process error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async authenticateStandardForm(username: string, password: string): Promise<SupplyNationAuthResult> {
    if (!this.page) throw new Error('Page not initialized');

    // Look for standard form elements
    const formFound = await this.page.evaluate((usr, pwd) => {
      const emailSelectors = [
        'input[type="email"]',
        'input[type="text"]',
        'input[name*="email"]',
        'input[name*="username"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="Email" i]',
        'input[id*="email"]',
        'input[id*="username"]'
      ];

      const passwordSelectors = [
        'input[type="password"]',
        'input[name*="password"]',
        'input[placeholder*="password" i]',
        'input[id*="password"]'
      ];

      let emailInput: HTMLInputElement | null = null;
      let passwordInput: HTMLInputElement | null = null;

      // Find email/username input
      for (const selector of emailSelectors) {
        const element = document.querySelector(selector) as HTMLInputElement;
        if (element && element.offsetHeight > 0 && !element.disabled) {
          emailInput = element;
          break;
        }
      }

      // Find password input
      for (const selector of passwordSelectors) {
        const element = document.querySelector(selector) as HTMLInputElement;
        if (element && element.offsetHeight > 0 && !element.disabled) {
          passwordInput = element;
          break;
        }
      }

      if (emailInput && passwordInput) {
        // Fill credentials
        emailInput.focus();
        emailInput.value = usr;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));

        passwordInput.focus();
        passwordInput.value = pwd;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

        // Try to submit
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:contains("Login")',
          'button:contains("Sign In")',
          '.login-button',
          '.submit-button'
        ];

        for (const selector of submitSelectors) {
          const button = document.querySelector(selector) as HTMLElement;
          if (button && button.offsetHeight > 0) {
            button.click();
            return true;
          }
        }

        // Try form submission
        const form = emailInput.closest('form');
        if (form) {
          form.submit();
          return true;
        }
      }

      return false;
    }, username, password);

    if (!formFound) {
      throw new Error('Standard form elements not found');
    }

    // Wait for authentication response
    try {
      await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
    } catch (navError) {
      // Navigation timeout is acceptable
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    const authSuccess = await this.checkAuthenticationSuccess();
    
    if (authSuccess.authenticated) {
      return {
        success: true,
        authenticated: true,
        method: 'standard_form',
        message: 'Authentication successful using standard form',
        pageUrl: authSuccess.currentUrl
      };
    }

    throw new Error('Authentication failed with standard form');
  }

  private async authenticateLightningComponents(username: string, password: string): Promise<SupplyNationAuthResult> {
    if (!this.page) throw new Error('Page not initialized');

    // Handle Salesforce Lightning components
    const lightningAuth = await this.page.evaluate((usr, pwd) => {
      // Look for Lightning input components
      const lightningInputs = document.querySelectorAll('lightning-input');
      let emailComponent: any = null;
      let passwordComponent: any = null;

      lightningInputs.forEach((component: any) => {
        const label = component.getAttribute('label') || '';
        const type = component.getAttribute('type') || '';
        
        if (label.toLowerCase().includes('email') || label.toLowerCase().includes('username') || type === 'email') {
          emailComponent = component;
        } else if (label.toLowerCase().includes('password') || type === 'password') {
          passwordComponent = component;
        }
      });

      if (emailComponent && passwordComponent) {
        // Set values using Lightning component methods
        try {
          emailComponent.value = usr;
          passwordComponent.value = pwd;

          // Trigger Lightning events
          emailComponent.dispatchEvent(new CustomEvent('change'));
          passwordComponent.dispatchEvent(new CustomEvent('change'));

          // Look for Lightning button
          const lightningButtons = document.querySelectorAll('lightning-button');
          for (const button of lightningButtons) {
            const label = button.getAttribute('label') || button.textContent || '';
            if (label.toLowerCase().includes('login') || label.toLowerCase().includes('sign in')) {
              (button as HTMLElement).click();
              return true;
            }
          }
        } catch (error) {
          console.error('Lightning component error:', error);
        }
      }

      return false;
    }, username, password);

    if (!lightningAuth) {
      throw new Error('Lightning components not found or failed');
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
    const authSuccess = await this.checkAuthenticationSuccess();
    
    if (authSuccess.authenticated) {
      return {
        success: true,
        authenticated: true,
        method: 'lightning_components',
        message: 'Authentication successful using Lightning components',
        pageUrl: authSuccess.currentUrl
      };
    }

    throw new Error('Authentication failed with Lightning components');
  }

  private async authenticateIframeForm(username: string, password: string): Promise<SupplyNationAuthResult> {
    if (!this.page) throw new Error('Page not initialized');

    // Check for iframe-based authentication
    const iframes = await this.page.$$('iframe');
    
    for (const iframe of iframes) {
      try {
        const frame = await iframe.contentFrame();
        if (frame) {
          const authSuccess = await frame.evaluate((usr, pwd) => {
            const emailInput = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
            const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
            
            if (emailInput && passwordInput) {
              emailInput.value = usr;
              passwordInput.value = pwd;
              
              const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
              if (submitButton) {
                submitButton.click();
                return true;
              }
            }
            return false;
          }, username, password);

          if (authSuccess) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            const mainPageAuth = await this.checkAuthenticationSuccess();
            
            if (mainPageAuth.authenticated) {
              return {
                success: true,
                authenticated: true,
                method: 'iframe_form',
                message: 'Authentication successful using iframe form',
                pageUrl: mainPageAuth.currentUrl
              };
            }
          }
        }
      } catch (iframeError) {
        continue;
      }
    }

    throw new Error('Iframe authentication failed');
  }

  private async checkAuthenticationSuccess(): Promise<{ authenticated: boolean; currentUrl: string }> {
    if (!this.page) return { authenticated: false, currentUrl: '' };

    return await this.page.evaluate(() => {
      const indicators = [
        'searchIBDButton',
        'Search Indigenous Business',
        'Indigenous Business Directory',
        'Dashboard',
        'Logout',
        'Profile'
      ];

      const pageText = document.body.innerText;
      const hasAuthIndicators = indicators.some(indicator => pageText.includes(indicator));
      const notOnLoginPage = !window.location.href.includes('/login');
      
      return {
        authenticated: hasAuthIndicators || notOnLoginPage,
        currentUrl: window.location.href
      };
    });
  }

  async verifyBusiness(businessName: string): Promise<SupplyNationVerificationResult> {
    if (!this.page) {
      return {
        success: false,
        businessVerified: false,
        verificationMethod: 'not_found',
        message: 'Not authenticated with Supply Nation'
      };
    }

    try {
      // Navigate to search page
      await this.page.goto('https://ibd.supplynation.org.au/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Perform search
      const searchResult = await this.page.evaluate((query) => {
        // Try multiple search input selectors
        const searchSelectors = [
          'input[type="search"]',
          'input[name*="search"]',
          'input[placeholder*="search" i]',
          'input[placeholder*="business" i]',
          'lightning-input[label*="search" i]',
          '.search-input',
          '#search'
        ];

        for (const selector of searchSelectors) {
          const input = document.querySelector(selector) as HTMLInputElement;
          if (input) {
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
      }, businessName);

      if (!searchResult) {
        return {
          success: false,
          businessVerified: false,
          verificationMethod: 'not_found',
          message: 'Could not execute search on Supply Nation'
        };
      }

      // Wait for search results
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Extract business results
      const businesses = await this.page.evaluate(() => {
        const results: any[] = [];
        
        // Multiple result selectors for different page layouts
        const resultSelectors = [
          'a[href*="supplierprofile"]',
          '.business-result',
          '.supplier-listing',
          '.company-listing',
          'article',
          '.result-item',
          '.search-result'
        ];

        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector);
          
          elements.forEach((element) => {
            let profileLink = element as HTMLAnchorElement;
            
            if (!profileLink.href?.includes('supplierprofile')) {
              profileLink = element.querySelector('a[href*="supplierprofile"]') as HTMLAnchorElement;
            }
            
            if (profileLink?.href?.includes('supplierprofile')) {
              const companyName = profileLink.textContent?.trim() || 
                                element.textContent?.trim() || '';
              
              if (companyName) {
                results.push({
                  companyName,
                  profileUrl: profileLink.href,
                  verified: true
                });
              }
            }
          });
          
          if (results.length > 0) break;
        }

        return results;
      });

      // Look for exact or partial match
      const matchingBusiness = businesses.find(business => 
        business.companyName.toLowerCase().includes(businessName.toLowerCase()) ||
        businessName.toLowerCase().includes(business.companyName.toLowerCase())
      );

      if (matchingBusiness) {
        return {
          success: true,
          businessVerified: true,
          companyName: matchingBusiness.companyName,
          profileUrl: matchingBusiness.profileUrl,
          verificationMethod: 'direct_search',
          message: `${matchingBusiness.companyName} verified as Indigenous business in Supply Nation directory`
        };
      } else if (businesses.length > 0) {
        return {
          success: true,
          businessVerified: false,
          verificationMethod: 'not_found',
          message: `Search completed but no match found for "${businessName}". Found ${businesses.length} other businesses.`
        };
      } else {
        return {
          success: true,
          businessVerified: false,
          verificationMethod: 'not_found',
          message: `No businesses found in Supply Nation directory for "${businessName}"`
        };
      }

    } catch (error) {
      return {
        success: false,
        businessVerified: false,
        verificationMethod: 'not_found',
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

  isAuthenticated(): boolean {
    return this.page !== null;
  }
}

export const supplyNationFinalIntegration = new SupplyNationFinalIntegration();