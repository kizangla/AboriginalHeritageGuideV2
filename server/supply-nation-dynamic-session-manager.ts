/**
 * Supply Nation Dynamic Session Manager
 * Advanced session persistence and timing optimization for dynamic map searches
 */

import puppeteer from 'puppeteer';

export interface DynamicSessionResult {
  sessionActive: boolean;
  businessSearchCapable: boolean;
  executionMetrics: {
    sessionEstablishmentTime: number;
    searchResponseTime: number;
    totalOptimizationTime: number;
  };
  sessionData: {
    authenticatedUrl: string;
    redirectChain: string[];
    authenticationIndicators: string[];
    sessionCookies: any[];
  };
  searchCapability: {
    searchInputAccessible: boolean;
    directoryNavigable: boolean;
    resultsExtractable: boolean;
  };
  optimizationStatus: string;
  diagnosticInfo: string[];
}

export class SupplyNationDynamicSessionManager {
  private persistentBrowser: puppeteer.Browser | null = null;
  private sessionPage: puppeteer.Page | null = null;
  private sessionEstablished: boolean = false;
  private sessionCookies: any[] = [];
  private lastActivityTime: number = 0;

  async establishPersistentSession(): Promise<DynamicSessionResult> {
    const startTime = Date.now();
    const executionMetrics = {
      sessionEstablishmentTime: 0,
      searchResponseTime: 0,
      totalOptimizationTime: 0
    };
    const sessionData = {
      authenticatedUrl: '',
      redirectChain: [] as string[],
      authenticationIndicators: [] as string[],
      sessionCookies: [] as any[]
    };
    const searchCapability = {
      searchInputAccessible: false,
      directoryNavigable: false,
      resultsExtractable: false
    };
    const diagnosticInfo: string[] = [];

    try {
      const credentials = {
        username: process.env.SUPPLY_NATION_USERNAME,
        password: process.env.SUPPLY_NATION_PASSWORD
      };

      if (!credentials.username || !credentials.password) {
        return {
          sessionActive: false,
          businessSearchCapable: false,
          executionMetrics: { ...executionMetrics, totalOptimizationTime: Date.now() - startTime },
          sessionData,
          searchCapability,
          optimizationStatus: 'Credentials required for session establishment',
          diagnosticInfo: ['Supply Nation credentials not configured']
        };
      }

      diagnosticInfo.push(`Establishing persistent session with credentials: ${credentials.username.length} char username`);

      // Initialize persistent browser with optimized configuration
      if (!this.persistentBrowser) {
        this.persistentBrowser = await puppeteer.launch({
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
            '--disable-renderer-backgrounding',
            '--disable-extensions',
            '--disable-default-apps',
            '--no-first-run',
            '--disable-sync',
            '--disable-translate'
          ]
        });

        diagnosticInfo.push('Persistent browser initialized with optimization flags');
      }

      // Create new session page
      this.sessionPage = await this.persistentBrowser.newPage();
      await this.sessionPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await this.sessionPage.setViewport({ width: 1366, height: 768 });

      // Extended timeouts for persistent session
      this.sessionPage.setDefaultTimeout(120000);
      this.sessionPage.setDefaultNavigationTimeout(120000);

      diagnosticInfo.push('Session page configured with extended timeouts');

      // Phase 1: Enhanced login page access with persistent waiting
      const sessionEstablishmentStart = Date.now();
      diagnosticInfo.push('Phase 1: Accessing login page with persistent configuration');

      await this.sessionPage.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      sessionData.redirectChain.push(await this.sessionPage.url());
      diagnosticInfo.push(`Login page accessed: ${sessionData.redirectChain[0]}`);

      // Enhanced page stabilization with progressive validation
      await this.performEnhancedStabilization(diagnosticInfo);

      // Phase 2: Persistent credential input with validation
      diagnosticInfo.push('Phase 2: Executing persistent credential input');
      
      const credentialSuccess = await this.executePersistentCredentialInput(
        credentials.username, 
        credentials.password, 
        diagnosticInfo
      );

      if (!credentialSuccess) {
        await this.cleanup();
        return {
          sessionActive: false,
          businessSearchCapable: false,
          executionMetrics: { ...executionMetrics, totalOptimizationTime: Date.now() - startTime },
          sessionData,
          searchCapability,
          optimizationStatus: 'Credential input failed in persistent session',
          diagnosticInfo
        };
      }

      // Phase 3: Enhanced form submission with persistent monitoring
      diagnosticInfo.push('Phase 3: Executing enhanced form submission');
      
      const submissionSuccess = await this.executePersistentFormSubmission(diagnosticInfo);

      if (!submissionSuccess) {
        await this.cleanup();
        return {
          sessionActive: false,
          businessSearchCapable: false,
          executionMetrics: { ...executionMetrics, totalOptimizationTime: Date.now() - startTime },
          sessionData,
          searchCapability,
          optimizationStatus: 'Form submission failed in persistent session',
          diagnosticInfo
        };
      }

      // Phase 4: Advanced session monitoring with persistent validation
      diagnosticInfo.push('Phase 4: Monitoring persistent session establishment');
      
      const sessionResult = await this.monitorPersistentSessionEstablishment(sessionData, diagnosticInfo);

      executionMetrics.sessionEstablishmentTime = Date.now() - sessionEstablishmentStart;

      if (!sessionResult.established) {
        await this.cleanup();
        return {
          sessionActive: false,
          businessSearchCapable: false,
          executionMetrics: { ...executionMetrics, totalOptimizationTime: Date.now() - startTime },
          sessionData,
          searchCapability,
          optimizationStatus: sessionResult.message,
          diagnosticInfo
        };
      }

      // Phase 5: Search capability validation
      diagnosticInfo.push('Phase 5: Validating search capabilities for dynamic map integration');
      
      const searchValidationStart = Date.now();
      const searchValidation = await this.validatePersistentSearchCapabilities(searchCapability, diagnosticInfo);
      executionMetrics.searchResponseTime = Date.now() - searchValidationStart;

      // Capture session state
      sessionData.sessionCookies = await this.sessionPage.cookies();
      this.sessionCookies = sessionData.sessionCookies;
      this.sessionEstablished = searchValidation.capable;
      this.lastActivityTime = Date.now();

      executionMetrics.totalOptimizationTime = Date.now() - startTime;

      diagnosticInfo.push(`Persistent session optimization completed in ${executionMetrics.totalOptimizationTime}ms`);

      return {
        sessionActive: true,
        businessSearchCapable: searchValidation.capable,
        executionMetrics,
        sessionData,
        searchCapability,
        optimizationStatus: searchValidation.capable ? 
          'Persistent session established with search capabilities' : 
          'Session active but search capabilities require optimization',
        diagnosticInfo
      };

    } catch (error) {
      await this.cleanup();
      
      return {
        sessionActive: false,
        businessSearchCapable: false,
        executionMetrics: { ...executionMetrics, totalOptimizationTime: Date.now() - startTime },
        sessionData,
        searchCapability,
        optimizationStatus: `Session establishment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        diagnosticInfo: [...diagnosticInfo, `Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  async executeDynamicSearch(businessQuery: string): Promise<{
    searchExecuted: boolean;
    businessesFound: any[];
    searchTime: number;
    message: string;
  }> {
    if (!this.sessionEstablished || !this.sessionPage) {
      return {
        searchExecuted: false,
        businessesFound: [],
        searchTime: 0,
        message: 'Persistent session not established'
      };
    }

    const searchStart = Date.now();

    try {
      // Validate session is still active
      const sessionValid = await this.validateSessionHealth();
      
      if (!sessionValid) {
        return {
          searchExecuted: false,
          businessesFound: [],
          searchTime: Date.now() - searchStart,
          message: 'Session health validation failed'
        };
      }

      // Navigate to search if needed
      const currentUrl = await this.sessionPage.url();
      if (!currentUrl.includes('search-results') && !currentUrl.includes('search')) {
        await this.sessionPage.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Execute search with persistent session
      const searchExecuted = await this.sessionPage.evaluate((query) => {
        const searchSelectors = [
          'input[type="search"]',
          'input[name*="search"]',
          'input[placeholder*="search" i]',
          'input[placeholder*="business" i]'
        ];

        for (const selector of searchSelectors) {
          const searchInput = document.querySelector(selector) as HTMLInputElement;
          if (searchInput && searchInput.offsetHeight > 0) {
            searchInput.focus();
            searchInput.value = '';
            searchInput.value = query;
            
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));

            const form = searchInput.closest('form');
            if (form) {
              form.submit();
              return true;
            }

            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            searchInput.dispatchEvent(enterEvent);
            return true;
          }
        }
        return false;
      }, businessQuery);

      if (!searchExecuted) {
        return {
          searchExecuted: false,
          businessesFound: [],
          searchTime: Date.now() - searchStart,
          message: 'Search input not accessible in persistent session'
        };
      }

      // Wait for search results
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Extract business results
      const businessResults = await this.sessionPage.evaluate(() => {
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
        const businesses: any[] = [];

        profileLinks.forEach((link) => {
          const companyName = link.textContent?.trim();
          const profileUrl = (link as HTMLAnchorElement).href;
          
          if (companyName && profileUrl) {
            const parentElement = link.closest('article, .result-item, .business-listing') || link.parentElement;
            const contextText = parentElement?.textContent || '';
            
            const abnMatch = contextText.match(/ABN:?\s*(\d{11})/i);
            const abn = abnMatch ? abnMatch[1] : undefined;
            
            const locationMatch = contextText.match(/([A-Z]{2,3})\s*(\d{4})/);
            const location = locationMatch ? `${locationMatch[1]} ${locationMatch[2]}` : undefined;

            businesses.push({
              companyName: companyName.trim(),
              abn,
              location,
              profileUrl,
              verified: true,
              source: 'supply_nation'
            });
          }
        });

        return businesses;
      });

      this.lastActivityTime = Date.now();

      return {
        searchExecuted: true,
        businessesFound: businessResults,
        searchTime: Date.now() - searchStart,
        message: `Found ${businessResults.length} businesses for "${businessQuery}" in ${Date.now() - searchStart}ms`
      };

    } catch (error) {
      return {
        searchExecuted: false,
        businessesFound: [],
        searchTime: Date.now() - searchStart,
        message: `Dynamic search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async performEnhancedStabilization(diagnosticInfo: string[]): Promise<void> {
    const stabilizationPhases = [4000, 6000, 8000];
    
    for (let phase = 0; phase < stabilizationPhases.length; phase++) {
      await new Promise(resolve => setTimeout(resolve, stabilizationPhases[phase]));
      
      const pageValidation = await this.sessionPage!.evaluate(() => {
        return {
          documentReady: document.readyState === 'complete',
          emailField: document.querySelector('input[type="email"], input[type="text"]') !== null,
          passwordField: document.querySelector('input[type="password"]') !== null,
          submitButton: document.querySelector('button[type="submit"]') !== null,
          formsPresent: document.querySelectorAll('form').length,
          pageLoaded: document.body.innerText.length > 500
        };
      });

      diagnosticInfo.push(`Stabilization phase ${phase + 1}: Document=${pageValidation.documentReady}, Forms=${pageValidation.formsPresent}, Content loaded=${pageValidation.pageLoaded}`);

      if (pageValidation.documentReady && 
          pageValidation.emailField && 
          pageValidation.passwordField && 
          pageValidation.submitButton &&
          pageValidation.pageLoaded) {
        
        diagnosticInfo.push(`Enhanced stabilization completed after ${stabilizationPhases[phase]}ms`);
        return;
      }
    }

    diagnosticInfo.push('Enhanced stabilization completed with extended timing');
  }

  private async executePersistentCredentialInput(username: string, password: string, diagnosticInfo: string[]): Promise<boolean> {
    const maxAttempts = 10;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const inputResult = await this.sessionPage!.evaluate((usr, pwd) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          if (!emailField || !passwordField) {
            return { success: false, issue: 'Fields not found' };
          }

          if (emailField.offsetHeight === 0 || passwordField.offsetHeight === 0) {
            return { success: false, issue: 'Fields not visible' };
          }

          emailField.value = '';
          passwordField.value = '';

          emailField.focus();
          emailField.click();
          emailField.value = usr;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));
          emailField.dispatchEvent(new Event('blur', { bubbles: true }));

          setTimeout(() => {
            passwordField.focus();
            passwordField.click();
            passwordField.value = pwd;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('blur', { bubbles: true }));
          }, 500);

          return {
            success: true,
            emailLength: emailField.value.length,
            passwordLength: passwordField.value.length
          };
        }, username, password);

        diagnosticInfo.push(`Credential attempt ${attempt}: ${inputResult.success ? 'Success' : inputResult.issue}`);

        if (inputResult.success) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const validation = await this.sessionPage!.evaluate((usr, pwd) => {
            const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
            const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
            
            return {
              emailValid: emailField ? emailField.value === usr : false,
              passwordValid: passwordField ? passwordField.value === pwd : false
            };
          }, username, password);

          if (validation.emailValid && validation.passwordValid) {
            diagnosticInfo.push('Persistent credential input validated successfully');
            return true;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        diagnosticInfo.push(`Credential attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return false;
  }

  private async executePersistentFormSubmission(diagnosticInfo: string[]): Promise<boolean> {
    const maxAttempts = 8;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const submissionResult = await this.sessionPage!.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          
          if (!submitButton) {
            return { success: false, issue: 'Submit button not found' };
          }

          if (submitButton.offsetHeight === 0 || submitButton.hasAttribute('disabled')) {
            return { success: false, issue: 'Submit button not accessible' };
          }

          submitButton.focus();
          submitButton.click();

          const form = submitButton.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true }));
          }

          return { success: true, buttonText: submitButton.textContent?.trim() };
        });

        diagnosticInfo.push(`Submission attempt ${attempt}: ${submissionResult.success ? 'Executed' : submissionResult.issue}`);

        if (submissionResult.success) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          diagnosticInfo.push('Persistent form submission completed');
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        diagnosticInfo.push(`Submission attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return false;
  }

  private async monitorPersistentSessionEstablishment(sessionData: any, diagnosticInfo: string[]): Promise<{
    established: boolean;
    message: string;
  }> {
    const maxMonitoringTime = 60000; // 60 seconds
    const checkInterval = 3000; // 3 seconds
    const monitoringStart = Date.now();
    
    let previousUrl = await this.sessionPage!.url();
    let consecutiveStableChecks = 0;

    while ((Date.now() - monitoringStart) < maxMonitoringTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
      const currentUrl = await this.sessionPage!.url();
      
      if (currentUrl !== previousUrl) {
        sessionData.redirectChain.push(currentUrl);
        diagnosticInfo.push(`Redirect: ${currentUrl}`);
        previousUrl = currentUrl;
        consecutiveStableChecks = 0;
      } else {
        consecutiveStableChecks++;
      }

      const authenticationCheck = await this.sessionPage!.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();
        const title = document.title.toLowerCase();
        
        const indicators: string[] = [];
        
        if (!url.includes('login')) indicators.push('not_on_login');
        if (url.includes('Communities') || url.includes('communities')) indicators.push('communities');
        if (url.includes('search-results') || url.includes('search')) indicators.push('search_page');
        if (content.includes('search')) indicators.push('search_content');
        if (content.includes('directory')) indicators.push('directory_content');
        if (content.includes('logout')) indicators.push('logout_option');
        if (document.querySelector('a[href*="logout"]')) indicators.push('logout_link');
        if (document.querySelector('.user-menu, .profile-menu')) indicators.push('user_menu');
        if (title.includes('communities')) indicators.push('communities_title');
        if (title.includes('search')) indicators.push('search_title');
        
        return {
          indicators,
          contentLength: content.length,
          currentUrl: url
        };
      });

      sessionData.authenticationIndicators = authenticationCheck.indicators;
      sessionData.authenticatedUrl = authenticationCheck.currentUrl;

      if (authenticationCheck.indicators.length >= 4 && consecutiveStableChecks >= 2) {
        diagnosticInfo.push(`Session established with ${authenticationCheck.indicators.length} indicators: ${authenticationCheck.indicators.join(', ')}`);
        return {
          established: true,
          message: `Persistent session established in ${Date.now() - monitoringStart}ms`
        };
      }

      if ((Date.now() - monitoringStart) % 15000 === 0) {
        diagnosticInfo.push(`Monitoring progress: ${Math.floor((Date.now() - monitoringStart) / 1000)}s, ${authenticationCheck.indicators.length} indicators`);
      }
    }

    return {
      established: false,
      message: `Session monitoring timeout after ${Date.now() - monitoringStart}ms with ${sessionData.authenticationIndicators.length} indicators`
    };
  }

  private async validatePersistentSearchCapabilities(searchCapability: any, diagnosticInfo: string[]): Promise<{
    capable: boolean;
  }> {
    try {
      const currentUrl = await this.sessionPage!.url();
      
      if (!currentUrl.includes('search-results') && !currentUrl.includes('search')) {
        await this.sessionPage!.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      const searchValidation = await this.sessionPage!.evaluate(() => {
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"]');
        const forms = document.querySelectorAll('form');
        const authenticatedElements = document.querySelectorAll('a[href*="logout"], .user-menu');
        
        return {
          searchInputCount: searchInputs.length,
          accessibleSearchInputs: Array.from(searchInputs).filter(input => (input as HTMLElement).offsetHeight > 0).length,
          formsCount: forms.length,
          authenticatedElementCount: authenticatedElements.length,
          directoryContent: document.body.innerText.toLowerCase().includes('directory'),
          businessContent: document.body.innerText.toLowerCase().includes('business')
        };
      });

      searchCapability.searchInputAccessible = searchValidation.accessibleSearchInputs > 0;
      searchCapability.directoryNavigable = searchValidation.directoryContent || searchValidation.businessContent;
      searchCapability.resultsExtractable = searchValidation.formsCount > 0;

      const capable = searchCapability.searchInputAccessible && 
                     searchCapability.directoryNavigable && 
                     searchValidation.authenticatedElementCount > 0;

      diagnosticInfo.push(`Search validation: Inputs=${searchValidation.accessibleSearchInputs}, Directory=${searchCapability.directoryNavigable}, Auth=${searchValidation.authenticatedElementCount}`);

      return { capable };

    } catch (error) {
      diagnosticInfo.push(`Search validation error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { capable: false };
    }
  }

  private async validateSessionHealth(): Promise<boolean> {
    if (!this.sessionPage || (Date.now() - this.lastActivityTime) > 300000) { // 5 minutes
      return false;
    }

    try {
      const healthCheck = await this.sessionPage.evaluate(() => {
        return {
          authenticated: !window.location.href.includes('login'),
          responsive: document.readyState === 'complete'
        };
      });

      return healthCheck.authenticated && healthCheck.responsive;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    try {
      if (this.sessionPage) {
        await this.sessionPage.close();
        this.sessionPage = null;
      }
      if (this.persistentBrowser) {
        await this.persistentBrowser.close();
        this.persistentBrowser = null;
      }
      this.sessionEstablished = false;
      this.sessionCookies = [];
      this.lastActivityTime = 0;
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  getSessionStatus(): {
    active: boolean;
    established: boolean;
    lastActivity: number;
    cookieCount: number;
  } {
    return {
      active: this.persistentBrowser !== null && this.sessionPage !== null,
      established: this.sessionEstablished,
      lastActivity: this.lastActivityTime,
      cookieCount: this.sessionCookies.length
    };
  }
}

export const supplyNationDynamicSessionManager = new SupplyNationDynamicSessionManager();