/**
 * Supply Nation Optimized Authentication
 * Advanced timing optimization and session persistence for automated authentication
 */

import puppeteer from 'puppeteer';

export interface OptimizedAuthResult {
  success: boolean;
  authenticated: boolean;
  sessionEstablished: boolean;
  currentUrl: string;
  authenticationTime: number;
  redirectSequence: string[];
  sessionCookies: any[];
  message: string;
}

export interface BusinessSearchResult {
  success: boolean;
  businessFound: boolean;
  businessName?: string;
  abn?: string;
  location?: string;
  profileUrl?: string;
  verificationStatus: 'verified' | 'not_found' | 'search_error';
  searchTime: number;
  message: string;
}

export class SupplyNationOptimizedAuthentication {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private sessionCookies: any[] = [];
  private isAuthenticated: boolean = false;

  async authenticateWithOptimizedTiming(): Promise<OptimizedAuthResult> {
    const startTime = Date.now();
    const redirectSequence: string[] = [];

    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        return {
          success: false,
          authenticated: false,
          sessionEstablished: false,
          currentUrl: '',
          authenticationTime: 0,
          redirectSequence: [],
          sessionCookies: [],
          message: 'Supply Nation credentials required'
        };
      }

      console.log('Initializing optimized authentication...');

      // Initialize browser with optimized settings
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ]
      });

      this.page = await this.browser.newPage();
      
      // Set optimal viewport and user agent
      await this.page.setViewport({ width: 1366, height: 768 });
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

      // Set extended timeouts
      this.page.setDefaultTimeout(30000);
      this.page.setDefaultNavigationTimeout(30000);

      // Step 1: Navigate to login with optimized waiting
      console.log('Navigating to login page...');
      const loginResponse = await this.page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 25000
      });

      if (!loginResponse || loginResponse.status() !== 200) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          sessionEstablished: false,
          currentUrl: '',
          authenticationTime: Date.now() - startTime,
          redirectSequence: [],
          sessionCookies: [],
          message: `Failed to access login page: HTTP ${loginResponse?.status()}`
        };
      }

      redirectSequence.push(await this.page.url());

      // Step 2: Wait for page stabilization with progressive checks
      await this.waitForPageStabilization();

      // Step 3: Enhanced credential input with multiple retry attempts
      console.log('Entering credentials with optimized timing...');
      const credentialsEntered = await this.enterCredentialsWithRetry(username, password);

      if (!credentialsEntered) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          sessionEstablished: false,
          currentUrl: await this.page.url(),
          authenticationTime: Date.now() - startTime,
          redirectSequence,
          sessionCookies: [],
          message: 'Failed to enter credentials'
        };
      }

      // Step 4: Submit form with enhanced error handling
      console.log('Submitting authentication form...');
      const formSubmitted = await this.submitFormWithRetry();

      if (!formSubmitted) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          sessionEstablished: false,
          currentUrl: await this.page.url(),
          authenticationTime: Date.now() - startTime,
          redirectSequence,
          sessionCookies: [],
          message: 'Failed to submit authentication form'
        };
      }

      // Step 5: Monitor redirect sequence with optimized timing
      console.log('Monitoring authentication redirect sequence...');
      const redirectResult = await this.monitorRedirectSequence(redirectSequence);

      if (!redirectResult.success) {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          sessionEstablished: false,
          currentUrl: redirectResult.finalUrl,
          authenticationTime: Date.now() - startTime,
          redirectSequence: redirectResult.sequence,
          sessionCookies: [],
          message: redirectResult.message
        };
      }

      // Step 6: Verify authentication and capture session
      console.log('Verifying authentication and capturing session...');
      const sessionResult = await this.verifyAndCaptureSession();

      if (sessionResult.authenticated) {
        this.sessionCookies = sessionResult.cookies;
        this.isAuthenticated = true;

        return {
          success: true,
          authenticated: true,
          sessionEstablished: true,
          currentUrl: sessionResult.currentUrl,
          authenticationTime: Date.now() - startTime,
          redirectSequence: redirectResult.sequence,
          sessionCookies: this.sessionCookies,
          message: `Authentication successful in ${Date.now() - startTime}ms`
        };
      } else {
        await this.cleanup();
        return {
          success: false,
          authenticated: false,
          sessionEstablished: false,
          currentUrl: sessionResult.currentUrl,
          authenticationTime: Date.now() - startTime,
          redirectSequence: redirectResult.sequence,
          sessionCookies: [],
          message: 'Authentication verification failed'
        };
      }

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        authenticated: false,
        sessionEstablished: false,
        currentUrl: '',
        authenticationTime: Date.now() - startTime,
        redirectSequence,
        sessionCookies: [],
        message: `Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async waitForPageStabilization(): Promise<void> {
    // Progressive waiting strategy
    const stabilizationChecks = [1000, 2000, 3000];
    
    for (const delay of stabilizationChecks) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Check if page is ready
      const pageReady = await this.page?.evaluate(() => {
        return document.readyState === 'complete' && 
               document.querySelector('input[type="email"], input[type="text"]') !== null &&
               document.querySelector('input[type="password"]') !== null;
      });

      if (pageReady) {
        console.log(`Page stabilized after ${delay}ms`);
        break;
      }
    }
  }

  private async enterCredentialsWithRetry(username: string, password: string): Promise<boolean> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const credentialsEntered = await this.page?.evaluate((usr, pwd) => {
          const emailInput = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          if (emailInput && passwordInput && emailInput.offsetHeight > 0 && passwordInput.offsetHeight > 0) {
            // Clear existing values
            emailInput.value = '';
            passwordInput.value = '';

            // Focus and fill email
            emailInput.focus();
            emailInput.value = usr;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            emailInput.blur();

            // Small delay between fields
            setTimeout(() => {
              // Focus and fill password
              passwordInput.focus();
              passwordInput.value = pwd;
              passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
              passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
              passwordInput.blur();
            }, 100);

            return true;
          }
          return false;
        }, username, password);

        if (credentialsEntered) {
          console.log(`Credentials entered successfully on attempt ${attempt}`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Allow form validation
          return true;
        }
      } catch (error) {
        console.log(`Credential entry attempt ${attempt} failed:`, error);
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return false;
  }

  private async submitFormWithRetry(): Promise<boolean> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const formSubmitted = await this.page?.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          
          if (submitButton && submitButton.offsetHeight > 0 && !submitButton.hasAttribute('disabled')) {
            submitButton.click();
            return true;
          }

          // Fallback: try form submission
          const form = document.querySelector('form') as HTMLFormElement;
          if (form) {
            form.submit();
            return true;
          }

          return false;
        });

        if (formSubmitted) {
          console.log(`Form submitted successfully on attempt ${attempt}`);
          return true;
        }
      } catch (error) {
        console.log(`Form submission attempt ${attempt} failed:`, error);
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return false;
  }

  private async monitorRedirectSequence(redirectSequence: string[]): Promise<{
    success: boolean;
    sequence: string[];
    finalUrl: string;
    message: string;
  }> {
    const maxWaitTime = 20000; // 20 seconds
    const checkInterval = 1000; // 1 second
    const startTime = Date.now();
    
    while ((Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
      const currentUrl = await this.page!.url();
      
      // Add new URLs to sequence
      if (!redirectSequence.includes(currentUrl)) {
        redirectSequence.push(currentUrl);
        console.log(`Redirect detected: ${currentUrl}`);
      }

      // Check for successful authentication indicators
      if (currentUrl.includes('CommunitiesLanding') || 
          currentUrl.includes('search-results') ||
          (currentUrl.includes('supplynation.org.au') && !currentUrl.includes('login'))) {
        
        return {
          success: true,
          sequence: redirectSequence,
          finalUrl: currentUrl,
          message: 'Redirect sequence completed successfully'
        };
      }

      // Check if stuck on login page
      if (currentUrl.includes('login') && (Date.now() - startTime) > 10000) {
        // Check for error messages
        const hasErrors = await this.page!.evaluate(() => {
          const errorSelectors = ['.error', '.alert-danger', '.slds-has-error'];
          return errorSelectors.some(selector => 
            document.querySelector(selector)?.textContent?.trim()
          );
        });

        if (hasErrors) {
          return {
            success: false,
            sequence: redirectSequence,
            finalUrl: currentUrl,
            message: 'Authentication failed - error messages detected'
          };
        }
      }
    }

    return {
      success: false,
      sequence: redirectSequence,
      finalUrl: await this.page!.url(),
      message: 'Redirect sequence timeout - session establishment incomplete'
    };
  }

  private async verifyAndCaptureSession(): Promise<{
    authenticated: boolean;
    currentUrl: string;
    cookies: any[];
  }> {
    const currentUrl = await this.page!.url();
    
    // Navigate to search page if not already there
    if (!currentUrl.includes('search-results')) {
      try {
        await this.page!.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
      } catch (navError) {
        console.log('Direct navigation to search page failed, checking current page');
      }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify authentication
    const authVerification = await this.page!.evaluate(() => {
      const pageText = document.body.innerText.toLowerCase();
      const currentUrl = window.location.href;
      
      const authIndicators = [
        'search',
        'indigenous business directory',
        'communities',
        'profile',
        'dashboard'
      ];

      const hasAuthIndicators = authIndicators.some(indicator => pageText.includes(indicator));
      const onAuthenticatedPage = currentUrl.includes('supplynation.org.au') && !currentUrl.includes('login');
      
      return {
        authenticated: hasAuthIndicators && onAuthenticatedPage,
        pageTitle: document.title,
        currentUrl: currentUrl
      };
    });

    // Capture session cookies
    const sessionCookies = await this.page!.cookies();

    return {
      authenticated: authVerification.authenticated,
      currentUrl: authVerification.currentUrl,
      cookies: sessionCookies
    };
  }

  async searchBusinessWithOptimizedSession(businessName: string): Promise<BusinessSearchResult> {
    if (!this.isAuthenticated || !this.page) {
      return {
        success: false,
        businessFound: false,
        verificationStatus: 'search_error',
        searchTime: 0,
        message: 'Not authenticated with Supply Nation'
      };
    }

    const startTime = Date.now();

    try {
      console.log(`Searching for business: ${businessName}`);

      // Ensure we're on search page
      const currentUrl = await this.page.url();
      if (!currentUrl.includes('search-results')) {
        await this.page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Execute search with multiple input methods
      const searchExecuted = await this.executeSearchWithRetry(businessName);

      if (!searchExecuted) {
        return {
          success: false,
          businessFound: false,
          verificationStatus: 'search_error',
          searchTime: Date.now() - startTime,
          message: 'Search input field not accessible'
        };
      }

      // Wait for results with progressive checking
      await this.waitForSearchResults();

      // Extract business results
      const searchResults = await this.extractBusinessResults();

      // Find matching business
      const matchingBusiness = this.findMatchingBusiness(searchResults, businessName);

      if (matchingBusiness) {
        return {
          success: true,
          businessFound: true,
          businessName: matchingBusiness.companyName,
          abn: matchingBusiness.abn,
          location: matchingBusiness.location,
          profileUrl: matchingBusiness.profileUrl,
          verificationStatus: 'verified',
          searchTime: Date.now() - startTime,
          message: `${matchingBusiness.companyName} verified as Indigenous business`
        };
      } else {
        return {
          success: true,
          businessFound: false,
          verificationStatus: 'not_found',
          searchTime: Date.now() - startTime,
          message: `${businessName} not found in Supply Nation directory`
        };
      }

    } catch (error) {
      return {
        success: false,
        businessFound: false,
        verificationStatus: 'search_error',
        searchTime: Date.now() - startTime,
        message: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async executeSearchWithRetry(businessName: string): Promise<boolean> {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const searchExecuted = await this.page!.evaluate((query) => {
          const searchSelectors = [
            'input[type="search"]',
            'input[name*="search"]',
            'input[placeholder*="search" i]',
            'input[placeholder*="business" i]',
            'input[placeholder*="company" i]'
          ];

          for (const selector of searchSelectors) {
            const input = document.querySelector(selector) as HTMLInputElement;
            if (input && input.offsetHeight > 0) {
              input.focus();
              input.value = '';
              input.value = query;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));

              // Try form submission
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

        if (searchExecuted) {
          console.log(`Search executed successfully on attempt ${attempt}`);
          return true;
        }
      } catch (error) {
        console.log(`Search attempt ${attempt} failed:`, error);
      }

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return false;
  }

  private async waitForSearchResults(): Promise<void> {
    const maxWaitTime = 10000;
    const checkInterval = 1000;
    const startTime = Date.now();

    while ((Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      const hasResults = await this.page!.evaluate(() => {
        return document.querySelectorAll('a[href*="supplierprofile"]').length > 0 ||
               document.querySelector('.no-results, .empty-results') !== null;
      });

      if (hasResults) {
        console.log('Search results detected');
        break;
      }
    }
  }

  private async extractBusinessResults(): Promise<any[]> {
    return await this.page!.evaluate(() => {
      const businesses: any[] = [];
      const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');

      profileLinks.forEach((link) => {
        const companyName = link.textContent?.trim();
        const profileUrl = (link as HTMLAnchorElement).href;
        
        if (companyName && profileUrl) {
          // Look for additional details in parent elements
          const parentElement = link.closest('article, .result-item, .business-card') || link.parentElement;
          const businessText = parentElement?.textContent || '';
          
          // Extract ABN if available
          const abnMatch = businessText.match(/ABN:?\s*(\d{11})/i);
          const abn = abnMatch ? abnMatch[1] : undefined;
          
          // Extract location if available
          const locationMatch = businessText.match(/([A-Z]{2,3})\s*(\d{4})/);
          const location = locationMatch ? `${locationMatch[1]} ${locationMatch[2]}` : undefined;

          businesses.push({
            companyName: companyName.trim(),
            abn,
            location,
            profileUrl
          });
        }
      });

      return businesses;
    });
  }

  private findMatchingBusiness(businesses: any[], searchTerm: string): any {
    const normalizedSearchTerm = searchTerm.toLowerCase();
    
    return businesses.find(business => {
      const normalizedName = business.companyName.toLowerCase();
      return normalizedName.includes(normalizedSearchTerm) ||
             normalizedSearchTerm.includes(normalizedName) ||
             this.calculateSimilarity(normalizedName, normalizedSearchTerm) > 0.7;
    });
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matches = 0;
    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1 === word2 || (word1.length > 3 && word2.includes(word1))) {
          matches++;
          break;
        }
      }
    }
    
    return matches / Math.max(words1.length, words2.length);
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
      this.sessionCookies = [];
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  getSessionStatus(): {
    authenticated: boolean;
    cookieCount: number;
    sessionActive: boolean;
  } {
    return {
      authenticated: this.isAuthenticated,
      cookieCount: this.sessionCookies.length,
      sessionActive: this.browser !== null && this.page !== null
    };
  }
}

export const supplyNationOptimizedAuthentication = new SupplyNationOptimizedAuthentication();