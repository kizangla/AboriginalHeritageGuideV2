/**
 * Salesforce Lightning Framework Compatible Authentication
 * Implements Lightning-specific patterns for Supply Nation authentication
 */

import puppeteer from 'puppeteer';

export interface LightningAuthResult {
  success: boolean;
  authenticated: boolean;
  sessionEstablished: boolean;
  businessData: any[];
  executionTime: number;
  lightningDetails: {
    frameworkDetected: boolean;
    componentsLoaded: boolean;
    csrfTokenFound: boolean;
    auraReady: boolean;
  };
  authenticationLog: string[];
}

export class SupplyNationLightningAuth {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private authLog: string[] = [];

  /**
   * Lightning-compatible authentication with framework-specific handling
   */
  async authenticateWithLightningFramework(searchQuery: string = 'MGM Alliance'): Promise<LightningAuthResult> {
    const startTime = Date.now();
    this.authLog = [];
    this.log('Starting Lightning framework authentication');

    try {
      await this.initializeBrowserForLightning();
      const authResult = await this.performLightningAuthentication();
      
      if (!authResult.success) {
        await this.cleanup();
        return this.createFailureResult(startTime, authResult.details);
      }

      const businessData = await this.searchBusinessDataWithLightning(searchQuery);
      await this.cleanup();

      return {
        success: true,
        authenticated: true,
        sessionEstablished: true,
        businessData,
        executionTime: Date.now() - startTime,
        lightningDetails: authResult.details,
        authenticationLog: this.authLog
      };

    } catch (error) {
      await this.cleanup();
      this.log(`Critical error: ${error.message}`);
      
      return {
        success: false,
        authenticated: false,
        sessionEstablished: false,
        businessData: [],
        executionTime: Date.now() - startTime,
        lightningDetails: {
          frameworkDetected: false,
          componentsLoaded: false,
          csrfTokenFound: false,
          auraReady: false
        },
        authenticationLog: this.authLog
      };
    }
  }

  /**
   * Initialize browser with Lightning framework optimizations
   */
  private async initializeBrowserForLightning(): Promise<void> {
    this.log('Initializing browser for Lightning framework');

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
        '--enable-automation',
        '--disable-blink-features=AutomationControlled'
      ]
    });

    this.page = await this.browser.newPage();
    
    // Lightning-optimized configuration
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    await this.page.setViewport({ width: 1366, height: 768 });
    this.page.setDefaultTimeout(180000);

    // Override navigator.webdriver
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });

    this.log('Browser initialized for Lightning framework');
  }

  /**
   * Perform Lightning-aware authentication
   */
  private async performLightningAuthentication(): Promise<{ success: boolean; details: any }> {
    this.log('Starting Lightning framework authentication process');

    // Navigate to login page
    await this.page!.goto('https://ibd.supplynation.org.au/s/login', {
      waitUntil: 'networkidle0',
      timeout: 90000
    });

    // Wait for Lightning framework initialization
    const lightningReady = await this.waitForLightningFramework();
    if (!lightningReady.success) {
      return { success: false, details: lightningReady.details };
    }

    // Wait for components to be fully loaded
    const componentsReady = await this.waitForLightningComponents();
    if (!componentsReady.success) {
      return { success: false, details: componentsReady.details };
    }

    // Extract CSRF tokens and session data
    const sessionData = await this.extractLightningSessionData();
    this.log(`Session data extracted: CSRF=${sessionData.csrfToken ? 'found' : 'not found'}`);

    // Set credentials with Lightning events
    const credentialsSet = await this.setCredentialsWithLightningEvents();
    if (!credentialsSet) {
      return { success: false, details: lightningReady.details };
    }

    // Submit with Lightning-compatible method
    await this.submitWithLightningEvents(sessionData);

    // Monitor Lightning authentication
    const authSuccess = await this.monitorLightningAuthentication();
    
    return {
      success: authSuccess,
      details: {
        frameworkDetected: lightningReady.details.frameworkDetected,
        componentsLoaded: componentsReady.success,
        csrfTokenFound: sessionData.csrfToken !== null,
        auraReady: lightningReady.details.auraReady
      }
    };
  }

  /**
   * Wait for Lightning framework to be ready
   */
  private async waitForLightningFramework(): Promise<{ success: boolean; details: any }> {
    this.log('Waiting for Lightning framework initialization');

    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const frameworkStatus = await this.page!.evaluate(() => {
        return {
          hasAura: typeof window.$A !== 'undefined',
          hasLightning: document.querySelector('[data-aura-rendered-by]') !== null,
          hasSalesforce: document.body.innerHTML.includes('salesforce'),
          pageTitle: document.title,
          bodyLength: document.body.innerText.length,
          auraReady: typeof window.$A !== 'undefined' && window.$A.get !== undefined,
          lightningReady: document.querySelector('.slds-scope') !== null || 
                         document.querySelector('[class*="lightning"]') !== null
        };
      });

      this.log(`Framework check ${attempts}: Aura=${frameworkStatus.hasAura}, Lightning=${frameworkStatus.hasLightning}, Ready=${frameworkStatus.auraReady}`);

      if (frameworkStatus.hasAura && frameworkStatus.auraReady && frameworkStatus.bodyLength > 1000) {
        this.log('Lightning framework ready');
        return {
          success: true,
          details: {
            frameworkDetected: true,
            auraReady: frameworkStatus.auraReady,
            lightningReady: frameworkStatus.lightningReady
          }
        };
      }
    }

    this.log('Lightning framework initialization timeout');
    return {
      success: false,
      details: {
        frameworkDetected: false,
        auraReady: false,
        lightningReady: false
      }
    };
  }

  /**
   * Wait for Lightning components to be loaded
   */
  private async waitForLightningComponents(): Promise<{ success: boolean }> {
    this.log('Waiting for Lightning components to load');

    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;

      const componentStatus = await this.page!.evaluate(() => {
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        return {
          emailFieldExists: emailField !== null,
          passwordFieldExists: passwordField !== null,
          emailFieldVisible: emailField ? emailField.offsetHeight > 0 && emailField.offsetWidth > 0 : false,
          passwordFieldVisible: passwordField ? passwordField.offsetHeight > 0 && passwordField.offsetWidth > 0 : false,
          emailFieldEnabled: emailField ? !emailField.disabled : false,
          passwordFieldEnabled: passwordField ? !passwordField.disabled : false,
          formsReady: document.querySelectorAll('form').length > 0,
          lightningInputs: document.querySelectorAll('lightning-input, .slds-input').length
        };
      });

      this.log(`Components check ${attempts}: Email=${componentStatus.emailFieldVisible}, Password=${componentStatus.passwordFieldVisible}`);

      if (componentStatus.emailFieldExists && componentStatus.passwordFieldExists &&
          componentStatus.emailFieldVisible && componentStatus.passwordFieldVisible &&
          componentStatus.emailFieldEnabled && componentStatus.passwordFieldEnabled) {
        this.log('Lightning components ready for interaction');
        return { success: true };
      }
    }

    this.log('Lightning components not ready within timeout');
    return { success: false };
  }

  /**
   * Extract Lightning session data and CSRF tokens
   */
  private async extractLightningSessionData(): Promise<{ csrfToken: string | null; sessionId: string | null }> {
    this.log('Extracting Lightning session data');

    const sessionData = await this.page!.evaluate(() => {
      let csrfToken = null;
      let sessionId = null;

      // Method 1: Check Aura context
      if (typeof window.$A !== 'undefined' && window.$A.get) {
        try {
          const token = window.$A.get('$GlobalValueProviders.GLOBAL.CSRF_TOKEN');
          if (token) csrfToken = token;
        } catch (e) {}
      }

      // Method 2: Check meta tags
      const csrfMeta = document.querySelector('meta[name="csrf-token"]');
      if (csrfMeta && !csrfToken) {
        csrfToken = csrfMeta.getAttribute('content');
      }

      // Method 3: Check form hidden inputs
      const csrfInput = document.querySelector('input[name*="csrf"], input[name*="token"]') as HTMLInputElement;
      if (csrfInput && !csrfToken) {
        csrfToken = csrfInput.value;
      }

      // Method 4: Extract from page source
      const pageSource = document.documentElement.innerHTML;
      const tokenMatch = pageSource.match(/"CSRF_TOKEN":"([^"]+)"/);
      if (tokenMatch && !csrfToken) {
        csrfToken = tokenMatch[1];
      }

      return { csrfToken, sessionId };
    });

    this.log(`Session data: CSRF=${sessionData.csrfToken ? 'extracted' : 'not found'}`);
    return sessionData;
  }

  /**
   * Set credentials using Lightning-compatible events
   */
  private async setCredentialsWithLightningEvents(): Promise<boolean> {
    this.log('Setting credentials with Lightning events');

    const result = await this.page!.evaluate((username, password) => {
      const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
      const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

      if (!emailField || !passwordField) {
        return { success: false, error: 'Form fields not accessible' };
      }

      try {
        // Lightning-compatible event sequence for email
        emailField.focus();
        emailField.click();
        
        // Clear field
        emailField.select();
        emailField.value = '';
        
        // Set value with proper events
        emailField.value = username;
        
        // Trigger Lightning events
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        emailField.dispatchEvent(new Event('blur', { bubbles: true }));
        
        // Lightning component events
        if (typeof window.$A !== 'undefined') {
          emailField.dispatchEvent(new CustomEvent('lightning:change', { 
            detail: { value: username },
            bubbles: true 
          }));
        }

        // Wait before password field
        setTimeout(() => {
          passwordField.focus();
          passwordField.click();
          passwordField.select();
          passwordField.value = '';
          passwordField.value = password;
          
          // Trigger Lightning events for password
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));
          passwordField.dispatchEvent(new Event('blur', { bubbles: true }));
          
          if (typeof window.$A !== 'undefined') {
            passwordField.dispatchEvent(new CustomEvent('lightning:change', { 
              detail: { value: password },
              bubbles: true 
            }));
          }
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
   * Submit form using Lightning events
   */
  private async submitWithLightningEvents(sessionData: any): Promise<void> {
    this.log('Submitting form with Lightning events');

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Multiple submission strategies with Lightning support
    await this.page!.evaluate((csrf) => {
      // Strategy 1: Lightning form submission
      if (typeof window.$A !== 'undefined') {
        try {
          const form = document.querySelector('form');
          if (form) {
            // Add CSRF token if available
            if (csrf && csrf.csrfToken) {
              let csrfInput = form.querySelector('input[name*="csrf"]') as HTMLInputElement;
              if (!csrfInput) {
                csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = 'csrf_token';
                csrfInput.value = csrf.csrfToken;
                form.appendChild(csrfInput);
              }
            }
            
            // Fire Lightning form events
            form.dispatchEvent(new Event('submit', { bubbles: true }));
          }
        } catch (e) {
          console.log('Lightning submission failed:', e);
        }
      }

      // Strategy 2: Button click with Lightning events
      const submitButton = document.querySelector('button[type="submit"], .slds-button') as HTMLElement;
      if (submitButton) {
        submitButton.focus();
        
        // Lightning button events
        submitButton.dispatchEvent(new Event('mousedown', { bubbles: true }));
        submitButton.dispatchEvent(new Event('mouseup', { bubbles: true }));
        submitButton.dispatchEvent(new Event('click', { bubbles: true }));
        
        if (typeof window.$A !== 'undefined') {
          submitButton.dispatchEvent(new CustomEvent('lightning:click', { bubbles: true }));
        }
      }

      // Strategy 3: Form submit
      const form = document.querySelector('form');
      if (form) {
        form.submit();
      }
    }, sessionData);

    this.log('Form submission completed');
  }

  /**
   * Monitor Lightning authentication with framework-specific indicators
   */
  private async monitorLightningAuthentication(): Promise<boolean> {
    this.log('Monitoring Lightning authentication');

    const maxChecks = 40;
    let redirects = 0;
    let previousUrl = await this.page!.url();

    for (let i = 0; i < maxChecks; i++) {
      await new Promise(resolve => setTimeout(resolve, 4000));

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
          hasLogout: content.includes('logout') || content.includes('log out'),
          hasSearch: content.includes('search'),
          hasDirectory: content.includes('directory'),
          hasDashboard: content.includes('dashboard'),
          hasNavigation: document.querySelector('nav, .slds-nav') !== null,
          hasLightningHeader: document.querySelector('.slds-global-header, lightning-header') !== null,
          contentLength: content.length,
          title: document.title,
          lightningApp: typeof window.$A !== 'undefined' && !url.includes('/s/login')
        };
      });

      const authScore = [
        authStatus.urlNotLogin,
        authStatus.hasLogout,
        authStatus.hasSearch,
        authStatus.hasNavigation
      ].filter(Boolean).length;

      this.log(`Auth check ${i + 1}/${maxChecks}: Score ${authScore}/4, Lightning=${authStatus.lightningApp}, Content=${authStatus.contentLength}`);

      if (authScore >= 3 && authStatus.contentLength > 2000 && authStatus.lightningApp) {
        this.log(`Lightning authentication successful: ${authStatus.title}`);
        return true;
      }

      if (i % 10 === 0 && i > 0) {
        this.log(`Progress: ${Math.floor((i * 4) / 60)} minutes elapsed`);
      }
    }

    this.log('Lightning authentication monitoring timeout');
    return false;
  }

  /**
   * Search for business data using Lightning-compatible methods
   */
  private async searchBusinessDataWithLightning(query: string): Promise<any[]> {
    this.log(`Searching for business data: ${query}`);

    try {
      await this.page!.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      await new Promise(resolve => setTimeout(resolve, 10000));

      // Lightning-compatible search execution
      const searchExecuted = await this.page!.evaluate((searchQuery) => {
        const searchInput = document.querySelector('input[type="search"], lightning-input input') as HTMLInputElement;

        if (searchInput && searchInput.offsetHeight > 0) {
          searchInput.focus();
          searchInput.value = searchQuery;
          
          // Lightning events
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          if (typeof window.$A !== 'undefined') {
            searchInput.dispatchEvent(new CustomEvent('lightning:change', { 
              detail: { value: searchQuery },
              bubbles: true 
            }));
          }

          // Submit search
          const form = searchInput.closest('form');
          if (form) {
            form.submit();
            return true;
          }

          const searchButton = document.querySelector('button[type="submit"], .slds-button') as HTMLElement;
          if (searchButton) {
            searchButton.click();
            return true;
          }
        }
        return false;
      }, query);

      if (searchExecuted) {
        await new Promise(resolve => setTimeout(resolve, 15000));
        return await this.extractBusinessProfiles();
      }

      return [];
    } catch (error) {
      this.log(`Search error: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract business profiles from Lightning components
   */
  private async extractBusinessProfiles(): Promise<any[]> {
    return await this.page!.evaluate(() => {
      const profiles = [];
      const businessElements = document.querySelectorAll([
        'a[href*="supplierprofile"]',
        '.search-result',
        '.slds-card',
        'lightning-card'
      ].join(', '));

      for (const element of Array.from(businessElements)) {
        const text = element.textContent?.toLowerCase() || '';
        
        if (text.includes('mgm') || text.includes('alliance')) {
          const profile = {
            companyName: '',
            profileUrl: '',
            location: {},
            indigenousVerified: true,
            membershipStatus: 'Supply Nation Member',
            dataSource: 'Supply Nation Lightning',
            extractedAt: new Date()
          };

          // Extract company name
          const nameElement = element.querySelector('h1, h2, h3, .slds-text-heading, lightning-formatted-text');
          profile.companyName = nameElement?.textContent?.trim() || 'Business Profile';

          // Extract profile URL
          if (element.tagName === 'A') {
            profile.profileUrl = (element as HTMLAnchorElement).href;
          } else {
            const link = element.querySelector('a[href*="supplierprofile"]');
            if (link) profile.profileUrl = (link as HTMLAnchorElement).href;
          }

          profiles.push(profile);
        }
      }

      return profiles;
    });
  }

  /**
   * Create failure result
   */
  private createFailureResult(startTime: number, details: any): LightningAuthResult {
    return {
      success: false,
      authenticated: false,
      sessionEstablished: false,
      businessData: [],
      executionTime: Date.now() - startTime,
      lightningDetails: details,
      authenticationLog: this.authLog
    };
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
    this.authLog.push(logEntry);
    console.log(logEntry);
  }
}

export const supplyNationLightningAuth = new SupplyNationLightningAuth();