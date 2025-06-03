/**
 * Enhanced Supply Nation Data Retrieval System
 * Implements advanced timing strategies for Salesforce Lightning framework
 */

import puppeteer from 'puppeteer';

export interface SupplyNationBusinessProfile {
  companyName: string;
  abn?: string;
  profileUrl: string;
  location: {
    state?: string;
    postcode?: string;
    address?: string;
  };
  indigenousVerification: {
    certified: boolean;
    membershipStatus: string;
    certificationLevel?: string;
  };
  businessCapabilities: {
    categories: string[];
    services: string[];
    description: string;
    industries: string[];
  };
  contactInformation: {
    email?: string;
    phone?: string;
    website?: string;
    primaryContact?: string;
  };
  businessDetails: {
    established?: string;
    employeeCount?: string;
    annualRevenue?: string;
  };
  dataSource: string;
  extractedAt: Date;
}

export interface SupplyNationRetrievalResult {
  success: boolean;
  authenticated: boolean;
  businessProfiles: SupplyNationBusinessProfile[];
  searchQuery?: string;
  totalFound: number;
  executionTime: number;
  authenticationLog: string[];
  errors: string[];
}

export class SupplyNationEnhancedRetrieval {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private authenticationLog: string[] = [];

  /**
   * Enhanced authentication with Lightning framework optimization
   */
  async authenticateAndRetrieveBusinessData(
    searchQuery: string = 'MGM Alliance',
    options: {
      timeout?: number;
      maxRetries?: number;
      waitStrategy?: 'aggressive' | 'moderate' | 'conservative';
    } = {}
  ): Promise<SupplyNationRetrievalResult> {
    const startTime = Date.now();
    const { timeout = 300000, maxRetries = 2, waitStrategy = 'moderate' } = options;

    this.authenticationLog = [];
    this.log('Starting enhanced Supply Nation data retrieval');

    try {
      // Initialize browser with enhanced settings
      await this.initializeBrowser();
      
      // Perform authentication with timing optimization
      const authResult = await this.performEnhancedAuthentication(waitStrategy, timeout);
      
      if (!authResult.success) {
        return {
          success: false,
          authenticated: false,
          businessProfiles: [],
          totalFound: 0,
          executionTime: Date.now() - startTime,
          authenticationLog: this.authenticationLog,
          errors: authResult.errors
        };
      }

      // Search for business data
      const searchResult = await this.searchBusinessProfiles(searchQuery);

      await this.cleanup();

      return {
        success: true,
        authenticated: true,
        businessProfiles: searchResult.profiles,
        searchQuery,
        totalFound: searchResult.profiles.length,
        executionTime: Date.now() - startTime,
        authenticationLog: this.authenticationLog,
        errors: []
      };

    } catch (error) {
      await this.cleanup();
      this.log(`Critical error: ${error.message}`);

      return {
        success: false,
        authenticated: false,
        businessProfiles: [],
        totalFound: 0,
        executionTime: Date.now() - startTime,
        authenticationLog: this.authenticationLog,
        errors: [error.message]
      };
    }
  }

  /**
   * Initialize browser with Lightning framework optimizations
   */
  private async initializeBrowser(): Promise<void> {
    this.log('Initializing browser with Lightning framework optimization');

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
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Enhanced browser configuration
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1366, height: 768 });
    this.page.setDefaultTimeout(120000);

    // Enable request interception for optimization
    await this.page.setRequestInterception(true);
    this.page.on('request', (req) => {
      if (req.resourceType() === 'image' || req.resourceType() === 'stylesheet') {
        req.abort();
      } else {
        req.continue();
      }
    });

    this.log('Browser initialized successfully');
  }

  /**
   * Enhanced authentication with multiple timing strategies
   */
  private async performEnhancedAuthentication(
    waitStrategy: 'aggressive' | 'moderate' | 'conservative',
    timeout: number
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      this.log('Navigating to Supply Nation login page');
      
      await this.page!.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      // Wait strategy implementation
      const waitTimes = {
        aggressive: [3000, 5000, 8000],
        moderate: [5000, 8000, 12000, 15000],
        conservative: [8000, 12000, 18000, 25000]
      };

      const waits = waitTimes[waitStrategy];
      
      for (let i = 0; i < waits.length; i++) {
        this.log(`Stabilization wait ${i + 1}/${waits.length}: ${waits[i]}ms`);
        await new Promise(resolve => setTimeout(resolve, waits[i]));

        const formCheck = await this.checkFormAvailability();
        if (formCheck.ready) {
          this.log('Login form ready for interaction');
          break;
        }

        if (i === waits.length - 1) {
          errors.push('Login form not accessible after extended waiting');
          return { success: false, errors };
        }
      }

      // Set credentials with enhanced interaction
      const credentialsSet = await this.setCredentialsEnhanced();
      if (!credentialsSet) {
        errors.push('Failed to set authentication credentials');
        return { success: false, errors };
      }

      // Submit form with multiple methods
      await this.submitFormEnhanced();

      // Monitor authentication with extended patience
      const authSuccess = await this.monitorAuthenticationExtended(timeout);
      
      if (!authSuccess) {
        errors.push('Authentication session not established within timeout');
        return { success: false, errors };
      }

      this.log('Authentication completed successfully');
      return { success: true, errors: [] };

    } catch (error) {
      errors.push(`Authentication error: ${error.message}`);
      return { success: false, errors };
    }
  }

  /**
   * Check form availability with Lightning framework detection
   */
  private async checkFormAvailability(): Promise<{ ready: boolean; details: any }> {
    return await this.page!.evaluate(() => {
      const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
      const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
      
      return {
        ready: emailField !== null && passwordField !== null && 
               emailField.offsetHeight > 0 && passwordField.offsetHeight > 0,
        details: {
          emailFound: emailField !== null,
          passwordFound: passwordField !== null,
          emailVisible: emailField?.offsetHeight > 0,
          passwordVisible: passwordField?.offsetHeight > 0,
          lightningLoaded: document.querySelector('[data-aura-rendered-by]') !== null,
          salesforceReady: document.body.innerHTML.includes('$A') || document.body.innerHTML.includes('aura')
        }
      };
    });
  }

  /**
   * Enhanced credential setting with event simulation
   */
  private async setCredentialsEnhanced(): Promise<boolean> {
    this.log('Setting authentication credentials with enhanced interaction');

    const result = await this.page!.evaluate((username, password) => {
      const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
      const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

      if (!emailField || !passwordField) {
        return { success: false, error: 'Form fields not accessible' };
      }

      try {
        // Enhanced email field interaction
        emailField.focus();
        emailField.click();
        emailField.select();
        emailField.value = '';
        
        // Simulate typing
        for (let i = 0; i < username.length; i++) {
          emailField.value += username[i];
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        emailField.dispatchEvent(new Event('blur', { bubbles: true }));

        // Enhanced password field interaction
        setTimeout(() => {
          passwordField.focus();
          passwordField.click();
          passwordField.select();
          passwordField.value = '';
          
          // Simulate typing
          for (let i = 0; i < password.length; i++) {
            passwordField.value += password[i];
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          }
          
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));
          passwordField.dispatchEvent(new Event('blur', { bubbles: true }));
        }, 1000);

        return {
          success: true,
          emailLength: emailField.value.length,
          passwordLength: passwordField.value.length
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }, process.env.SUPPLY_NATION_USERNAME, process.env.SUPPLY_NATION_PASSWORD);

    this.log(`Credentials result: ${result.success ? 'Success' : result.error}`);
    return result.success;
  }

  /**
   * Enhanced form submission with multiple strategies
   */
  private async submitFormEnhanced(): Promise<void> {
    this.log('Submitting authentication form with enhanced methods');

    await new Promise(resolve => setTimeout(resolve, 3000));

    const submissionMethods = [
      // Method 1: Form submit
      async () => {
        return await this.page!.evaluate(() => {
          const form = document.querySelector('form');
          if (form) {
            form.submit();
            return 'form.submit()';
          }
          return null;
        });
      },
      
      // Method 2: Button click
      async () => {
        return await this.page!.evaluate(() => {
          const button = document.querySelector('button[type="submit"]') as HTMLElement;
          if (button && button.offsetHeight > 0) {
            button.focus();
            button.click();
            return 'button.click()';
          }
          return null;
        });
      },
      
      // Method 3: Enter key on password field
      async () => {
        return await this.page!.evaluate(() => {
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          if (passwordField) {
            passwordField.focus();
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true
            });
            passwordField.dispatchEvent(enterEvent);
            return 'Enter key';
          }
          return null;
        });
      }
    ];

    for (const method of submissionMethods) {
      try {
        const result = await method();
        if (result) {
          this.log(`Form submitted using: ${result}`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          break;
        }
      } catch (error) {
        this.log(`Submission method failed: ${error.message}`);
      }
    }
  }

  /**
   * Extended authentication monitoring
   */
  private async monitorAuthenticationExtended(timeout: number): Promise<boolean> {
    this.log('Starting extended authentication monitoring');

    const maxChecks = Math.floor(timeout / 5000);
    let redirects = 0;
    let previousUrl = await this.page!.url();

    for (let i = 0; i < maxChecks; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const currentUrl = await this.page!.url();
      if (currentUrl !== previousUrl) {
        redirects++;
        this.log(`Redirect ${redirects}: ${currentUrl.substring(0, 80)}...`);
        previousUrl = currentUrl;
      }

      const authStatus = await this.page!.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();

        return {
          urlNotLogin: !url.includes('/s/login'),
          hasLogout: content.includes('logout'),
          hasSearch: content.includes('search'),
          hasDirectory: content.includes('directory'),
          hasCommunities: content.includes('communities'),
          contentLength: content.length,
          title: document.title
        };
      });

      const authScore = [
        authStatus.urlNotLogin,
        authStatus.hasLogout,
        authStatus.hasSearch
      ].filter(Boolean).length;

      this.log(`Auth check ${i + 1}/${maxChecks}: Score ${authScore}/3, Content: ${authStatus.contentLength}`);

      if (authScore >= 2 && authStatus.contentLength > 1500) {
        this.log(`Authentication successful: ${authStatus.title}`);
        return true;
      }

      // Progress updates
      if (i % 12 === 0 && i > 0) {
        this.log(`Monitoring progress: ${Math.floor((i * 5) / 60)} minutes elapsed`);
      }
    }

    this.log('Authentication monitoring timeout reached');
    return false;
  }

  /**
   * Search for business profiles
   */
  private async searchBusinessProfiles(query: string): Promise<{ profiles: SupplyNationBusinessProfile[] }> {
    this.log(`Searching for business profiles: ${query}`);

    try {
      await this.page!.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      await new Promise(resolve => setTimeout(resolve, 10000));

      // Execute search
      const searchExecuted = await this.page!.evaluate((searchQuery) => {
        const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;

        if (searchInput && searchInput.offsetHeight > 0) {
          searchInput.focus();
          searchInput.value = searchQuery;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));

          const form = searchInput.closest('form');
          if (form) {
            form.submit();
            return true;
          }

          const searchButton = document.querySelector('button[type="submit"], .search-btn');
          if (searchButton) {
            (searchButton as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, query);

      if (!searchExecuted) {
        this.log('Search execution failed - interface not ready');
        return { profiles: [] };
      }

      await new Promise(resolve => setTimeout(resolve, 15000));

      // Extract business profiles
      const profiles = await this.extractBusinessProfiles(query);
      this.log(`Extracted ${profiles.length} business profiles`);

      return { profiles };

    } catch (error) {
      this.log(`Search error: ${error.message}`);
      return { profiles: [] };
    }
  }

  /**
   * Extract business profiles from search results
   */
  private async extractBusinessProfiles(query: string): Promise<SupplyNationBusinessProfile[]> {
    return await this.page!.evaluate((searchQuery) => {
      const profiles: SupplyNationBusinessProfile[] = [];
      
      const businessElements = document.querySelectorAll([
        'a[href*="supplierprofile"]',
        '.search-result',
        '.business-card',
        '.supplier-card',
        '.result-item'
      ].join(', '));

      for (const element of Array.from(businessElements)) {
        const text = element.textContent?.toLowerCase() || '';

        if (text.includes(searchQuery.toLowerCase()) ||
            (searchQuery.toLowerCase().includes('mgm') && text.includes('mgm'))) {

          const profile: SupplyNationBusinessProfile = {
            companyName: '',
            profileUrl: '',
            location: {},
            indigenousVerification: {
              certified: true,
              membershipStatus: 'Supply Nation Member'
            },
            businessCapabilities: {
              categories: [],
              services: [],
              description: '',
              industries: []
            },
            contactInformation: {},
            businessDetails: {},
            dataSource: 'Supply Nation',
            extractedAt: new Date()
          };

          // Extract company name
          const nameElement = element.querySelector('h2, h3, .business-name, .company-name, .title');
          profile.companyName = nameElement?.textContent?.trim() || searchQuery;

          // Extract profile URL
          if (element.tagName === 'A') {
            profile.profileUrl = (element as HTMLAnchorElement).href;
          } else {
            const link = element.querySelector('a[href*="supplierprofile"]');
            if (link) profile.profileUrl = (link as HTMLAnchorElement).href;
          }

          // Extract location
          const locationMatch = element.textContent?.match(/(WA|NSW|VIC|QLD|SA|TAS|NT|ACT)[\s,]*(\d{4})?/i);
          if (locationMatch) {
            profile.location.state = locationMatch[1];
            if (locationMatch[2]) profile.location.postcode = locationMatch[2];
          }

          // Extract ABN
          const abnMatch = element.textContent?.match(/ABN[:\s]*(\d{11})/i);
          if (abnMatch) {
            profile.abn = abnMatch[1];
          }

          // Extract categories
          const categoryElements = element.querySelectorAll('.category, .service, .tag, .industry');
          profile.businessCapabilities.categories = Array.from(categoryElements)
            .map(cat => cat.textContent?.trim())
            .filter(Boolean);

          profiles.push(profile);
        }
      }

      return profiles;
    }, query);
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
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
      this.log(`Cleanup error: ${error.message}`);
    }
  }

  /**
   * Log authentication events
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp}: ${message}`;
    this.authenticationLog.push(logEntry);
    console.log(logEntry);
  }
}

export const supplyNationEnhancedRetrieval = new SupplyNationEnhancedRetrieval();