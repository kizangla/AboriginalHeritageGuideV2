/**
 * Supply Nation Timing Optimized Authentication
 * Advanced timing controls with extended session establishment monitoring
 */

import puppeteer from 'puppeteer';

export interface TimingOptimizedResult {
  success: boolean;
  authenticated: boolean;
  businessFound: boolean;
  timingMetrics: {
    pageLoad: number;
    credentialEntry: number;
    formSubmission: number;
    sessionEstablishment: number;
    businessSearch: number;
    totalTime: number;
  };
  businessDetails?: {
    companyName: string;
    abn?: string;
    location?: string;
    profileUrl: string;
    verified: boolean;
  };
  message: string;
  debugInfo?: string[];
}

export class SupplyNationTimingOptimized {
  
  async verifyBusinessWithTimingOptimization(businessName: string): Promise<TimingOptimizedResult> {
    const startTime = Date.now();
    const timingMetrics = {
      pageLoad: 0,
      credentialEntry: 0,
      formSubmission: 0,
      sessionEstablishment: 0,
      businessSearch: 0,
      totalTime: 0
    };
    const debugInfo: string[] = [];
    
    let browser = null;
    let page = null;

    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        return {
          success: false,
          authenticated: false,
          businessFound: false,
          timingMetrics: { ...timingMetrics, totalTime: Date.now() - startTime },
          message: 'Supply Nation credentials required for verification',
          debugInfo: ['Credentials missing from environment variables']
        };
      }

      debugInfo.push('Credentials detected, initializing browser...');

      browser = await puppeteer.launch({
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
          '--disable-extensions'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      // Extended timeouts for all operations
      page.setDefaultTimeout(45000);
      page.setDefaultNavigationTimeout(45000);

      debugInfo.push('Browser initialized, navigating to login page...');

      // Phase 1: Page Load with Extended Timing
      const loadStart = Date.now();
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      timingMetrics.pageLoad = Date.now() - loadStart;
      debugInfo.push(`Page loaded in ${timingMetrics.pageLoad}ms`);

      // Extended page stabilization with progressive checks
      await this.extendedPageStabilization(page, debugInfo);

      // Phase 2: Credential Entry with Timing Optimization
      const credentialStart = Date.now();
      const credentialsSuccess = await this.optimizedCredentialEntry(page, username, password, debugInfo);
      timingMetrics.credentialEntry = Date.now() - credentialStart;

      if (!credentialsSuccess) {
        await browser.close();
        return {
          success: false,
          authenticated: false,
          businessFound: false,
          timingMetrics: { ...timingMetrics, totalTime: Date.now() - startTime },
          message: 'Failed to enter credentials in login form',
          debugInfo
        };
      }

      // Phase 3: Form Submission with Enhanced Timing
      const submissionStart = Date.now();
      const submissionSuccess = await this.optimizedFormSubmission(page, debugInfo);
      timingMetrics.formSubmission = Date.now() - submissionStart;

      if (!submissionSuccess) {
        await browser.close();
        return {
          success: false,
          authenticated: false,
          businessFound: false,
          timingMetrics: { ...timingMetrics, totalTime: Date.now() - startTime },
          message: 'Failed to submit authentication form',
          debugInfo
        };
      }

      // Phase 4: Extended Session Establishment Monitoring
      const sessionStart = Date.now();
      const sessionResult = await this.extendedSessionMonitoring(page, debugInfo);
      timingMetrics.sessionEstablishment = Date.now() - sessionStart;

      if (!sessionResult.authenticated) {
        await browser.close();
        return {
          success: false,
          authenticated: false,
          businessFound: false,
          timingMetrics: { ...timingMetrics, totalTime: Date.now() - startTime },
          message: sessionResult.message,
          debugInfo
        };
      }

      debugInfo.push('Authentication successful, proceeding to business search...');

      // Phase 5: Business Search with Optimized Timing
      const searchStart = Date.now();
      const searchResult = await this.optimizedBusinessSearch(page, businessName, debugInfo);
      timingMetrics.businessSearch = Date.now() - searchStart;

      await browser.close();

      timingMetrics.totalTime = Date.now() - startTime;

      if (searchResult.found) {
        return {
          success: true,
          authenticated: true,
          businessFound: true,
          timingMetrics,
          businessDetails: searchResult.businessDetails,
          message: `${searchResult.businessDetails?.companyName} verified as Indigenous business in ${timingMetrics.totalTime}ms`,
          debugInfo
        };
      } else {
        return {
          success: true,
          authenticated: true,
          businessFound: false,
          timingMetrics,
          message: `${businessName} not found in Supply Nation directory (search completed in ${timingMetrics.businessSearch}ms)`,
          debugInfo
        };
      }

    } catch (error) {
      if (browser) await browser.close();
      timingMetrics.totalTime = Date.now() - startTime;
      debugInfo.push(`Error encountered: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        success: false,
        authenticated: false,
        businessFound: false,
        timingMetrics,
        message: `Verification failed after ${timingMetrics.totalTime}ms`,
        debugInfo
      };
    }
  }

  private async extendedPageStabilization(page: puppeteer.Page, debugInfo: string[]): Promise<void> {
    const stabilizationIntervals = [2000, 3000, 4000];
    
    for (let i = 0; i < stabilizationIntervals.length; i++) {
      await new Promise(resolve => setTimeout(resolve, stabilizationIntervals[i]));
      
      const pageState = await page.evaluate(() => {
        return {
          readyState: document.readyState,
          hasEmailField: document.querySelector('input[type="email"], input[type="text"]') !== null,
          hasPasswordField: document.querySelector('input[type="password"]') !== null,
          hasSubmitButton: document.querySelector('button[type="submit"], input[type="submit"]') !== null,
          formCount: document.querySelectorAll('form').length
        };
      });

      debugInfo.push(`Stabilization check ${i + 1}: Ready=${pageState.readyState}, Email=${pageState.hasEmailField}, Password=${pageState.hasPasswordField}, Submit=${pageState.hasSubmitButton}, Forms=${pageState.formCount}`);

      if (pageState.readyState === 'complete' && pageState.hasEmailField && pageState.hasPasswordField && pageState.hasSubmitButton) {
        debugInfo.push(`Page fully stabilized after ${stabilizationIntervals[i]}ms`);
        return;
      }
    }

    debugInfo.push('Page stabilization completed with extended timing');
  }

  private async optimizedCredentialEntry(page: puppeteer.Page, username: string, password: string, debugInfo: string[]): Promise<boolean> {
    const maxAttempts = 5;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        debugInfo.push(`Credential entry attempt ${attempt}/${maxAttempts}`);

        const entryResult = await page.evaluate((usr, pwd) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          if (!emailField || !passwordField) {
            return { success: false, reason: 'Fields not found' };
          }

          if (emailField.offsetHeight === 0 || passwordField.offsetHeight === 0) {
            return { success: false, reason: 'Fields not visible' };
          }

          // Clear existing values
          emailField.value = '';
          passwordField.value = '';

          // Focus and enter email with events
          emailField.focus();
          emailField.value = usr;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));
          emailField.dispatchEvent(new Event('blur', { bubbles: true }));

          // Small delay for field validation
          setTimeout(() => {
            // Focus and enter password with events
            passwordField.focus();
            passwordField.value = pwd;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('blur', { bubbles: true }));
          }, 200);

          return {
            success: emailField.value === usr && passwordField.value === pwd,
            emailValue: emailField.value,
            passwordLength: passwordField.value.length
          };
        }, username, password);

        debugInfo.push(`Entry result: Success=${entryResult.success}, Email=${entryResult.emailValue?.substring(0, 5)}..., PasswordLen=${entryResult.passwordLength}`);

        if (entryResult.success) {
          // Additional delay for form validation
          await new Promise(resolve => setTimeout(resolve, 1000));
          return true;
        }

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

      } catch (error) {
        debugInfo.push(`Credential entry attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return false;
  }

  private async optimizedFormSubmission(page: puppeteer.Page, debugInfo: string[]): Promise<boolean> {
    const maxAttempts = 3;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        debugInfo.push(`Form submission attempt ${attempt}/${maxAttempts}`);

        const submissionResult = await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          
          if (!submitButton) {
            return { success: false, reason: 'Submit button not found' };
          }

          if (submitButton.offsetHeight === 0 || submitButton.hasAttribute('disabled')) {
            return { success: false, reason: 'Submit button not accessible' };
          }

          // Click submit button
          submitButton.click();
          return { success: true, reason: 'Submit button clicked' };
        });

        debugInfo.push(`Submission result: ${submissionResult.reason}`);

        if (submissionResult.success) {
          // Allow time for form submission processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          return true;
        }

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        debugInfo.push(`Form submission attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return false;
  }

  private async extendedSessionMonitoring(page: puppeteer.Page, debugInfo: string[]): Promise<{
    authenticated: boolean;
    message: string;
  }> {
    const maxMonitoringTime = 25000; // 25 seconds
    const checkInterval = 2500; // 2.5 seconds
    const startTime = Date.now();
    
    let previousUrl = await page.url();
    debugInfo.push(`Session monitoring started from: ${previousUrl}`);

    let redirectCount = 0;
    
    while ((Date.now() - startTime) < maxMonitoringTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
      const currentUrl = await page.url();
      
      if (currentUrl !== previousUrl) {
        redirectCount++;
        debugInfo.push(`Redirect ${redirectCount}: ${currentUrl}`);
        previousUrl = currentUrl;
      }

      // Check for authentication success indicators
      const authCheck = await page.evaluate(() => {
        const url = window.location.href;
        const pageText = document.body.innerText.toLowerCase();
        
        const successIndicators = [
          url.includes('CommunitiesLanding'),
          url.includes('search-results'),
          (url.includes('supplynation.org.au') && !url.includes('login')),
          pageText.includes('search'),
          pageText.includes('indigenous business directory'),
          pageText.includes('communities')
        ];

        const errorIndicators = [
          pageText.includes('invalid'),
          pageText.includes('incorrect'),
          pageText.includes('error'),
          document.querySelector('.error, .alert-danger, .slds-has-error') !== null
        ];

        return {
          currentUrl: url,
          successCount: successIndicators.filter(Boolean).length,
          hasErrors: errorIndicators.some(Boolean),
          pageTitle: document.title,
          bodyTextLength: pageText.length
        };
      });

      debugInfo.push(`Auth check: URL=${authCheck.currentUrl}, SuccessIndicators=${authCheck.successCount}, HasErrors=${authCheck.hasErrors}, PageLen=${authCheck.bodyTextLength}`);

      // Success condition
      if (authCheck.successCount >= 2) {
        debugInfo.push(`Authentication successful after ${Date.now() - startTime}ms with ${redirectCount} redirects`);
        return {
          authenticated: true,
          message: `Session established successfully in ${Date.now() - startTime}ms`
        };
      }

      // Error condition
      if (authCheck.hasErrors) {
        debugInfo.push('Authentication error detected on page');
        return {
          authenticated: false,
          message: 'Authentication failed - error messages detected'
        };
      }

      // Stuck on login page check
      if (authCheck.currentUrl.includes('login') && (Date.now() - startTime) > 15000) {
        debugInfo.push('Still on login page after extended time - possible authentication failure');
      }
    }

    debugInfo.push(`Session monitoring timeout after ${Date.now() - startTime}ms with ${redirectCount} redirects`);
    return {
      authenticated: false,
      message: `Session establishment timeout after ${Date.now() - startTime}ms`
    };
  }

  private async optimizedBusinessSearch(page: puppeteer.Page, businessName: string, debugInfo: string[]): Promise<{
    found: boolean;
    businessDetails?: {
      companyName: string;
      abn?: string;
      location?: string;
      profileUrl: string;
      verified: boolean;
    };
  }> {
    try {
      debugInfo.push(`Starting business search for: ${businessName}`);

      // Navigate to search page if not already there
      const currentUrl = await page.url();
      if (!currentUrl.includes('search-results')) {
        debugInfo.push('Navigating to search results page...');
        await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Execute search with multiple retry attempts
      const searchSuccess = await this.executeSearchWithRetries(page, businessName, debugInfo);

      if (!searchSuccess) {
        debugInfo.push('Search input not accessible after multiple attempts');
        return { found: false };
      }

      // Wait for search results with extended timing
      debugInfo.push('Waiting for search results...');
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Extract business results
      const searchResults = await page.evaluate(() => {
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
        const businesses: any[] = [];

        profileLinks.forEach((link) => {
          const companyName = link.textContent?.trim();
          const profileUrl = (link as HTMLAnchorElement).href;
          
          if (companyName && profileUrl) {
            // Extract additional business information from context
            const parentElement = link.closest('article, .result-item, .business-listing, .search-result') || link.parentElement;
            const contextText = parentElement?.textContent || '';
            
            // Extract ABN
            const abnMatch = contextText.match(/ABN:?\s*(\d{11})/i);
            const abn = abnMatch ? abnMatch[1] : undefined;
            
            // Extract location
            const locationMatch = contextText.match(/([A-Z]{2,3})\s*(\d{4})/);
            const location = locationMatch ? `${locationMatch[1]} ${locationMatch[2]}` : undefined;

            businesses.push({
              companyName: companyName.trim(),
              abn,
              location,
              profileUrl,
              verified: true
            });
          }
        });

        return businesses;
      });

      debugInfo.push(`Extracted ${searchResults.length} businesses from search results`);

      // Find matching business with enhanced matching
      const matchingBusiness = this.findEnhancedMatch(searchResults, businessName, debugInfo);

      if (matchingBusiness) {
        debugInfo.push(`Found matching business: ${matchingBusiness.companyName}`);
        return {
          found: true,
          businessDetails: matchingBusiness
        };
      } else {
        debugInfo.push('No matching business found in search results');
        return { found: false };
      }

    } catch (error) {
      debugInfo.push(`Business search error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { found: false };
    }
  }

  private async executeSearchWithRetries(page: puppeteer.Page, businessName: string, debugInfo: string[]): Promise<boolean> {
    const maxRetries = 4;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        debugInfo.push(`Search execution attempt ${attempt}/${maxRetries}`);

        const searchResult = await page.evaluate((query) => {
          const searchSelectors = [
            'input[type="search"]',
            'input[name*="search"]',
            'input[placeholder*="search" i]',
            'input[placeholder*="business" i]',
            'input[placeholder*="company" i]'
          ];

          for (const selector of searchSelectors) {
            const searchInput = document.querySelector(selector) as HTMLInputElement;
            if (searchInput && searchInput.offsetHeight > 0) {
              // Clear and set value
              searchInput.focus();
              searchInput.value = '';
              searchInput.value = query;
              
              // Dispatch events
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              searchInput.dispatchEvent(new Event('change', { bubbles: true }));

              // Try form submission
              const form = searchInput.closest('form');
              if (form) {
                form.submit();
                return { success: true, method: 'form_submit', selector };
              }

              // Try enter key
              const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
              searchInput.dispatchEvent(enterEvent);
              return { success: true, method: 'enter_key', selector };
            }
          }
          return { success: false, method: 'none', selector: 'none' };
        }, businessName);

        debugInfo.push(`Search attempt ${attempt}: Success=${searchResult.success}, Method=${searchResult.method}, Selector=${searchResult.selector}`);

        if (searchResult.success) {
          return true;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        debugInfo.push(`Search attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    return false;
  }

  private findEnhancedMatch(businesses: any[], searchTerm: string, debugInfo: string[]): any {
    const normalizedSearch = searchTerm.toLowerCase();
    debugInfo.push(`Searching for matches to: "${normalizedSearch}"`);

    // Exact name match
    let match = businesses.find(business => {
      const normalizedName = business.companyName.toLowerCase();
      return normalizedName.includes(normalizedSearch) || normalizedSearch.includes(normalizedName);
    });

    if (match) {
      debugInfo.push(`Exact match found: ${match.companyName}`);
      return match;
    }

    // Word-based matching
    const searchWords = normalizedSearch.split(/\s+/).filter(word => word.length > 2);
    debugInfo.push(`Trying word-based matching with: ${searchWords.join(', ')}`);

    match = businesses.find(business => {
      const businessWords = business.companyName.toLowerCase().split(/\s+/);
      const wordMatches = searchWords.filter(searchWord => 
        businessWords.some(businessWord => 
          businessWord.includes(searchWord) || searchWord.includes(businessWord)
        )
      );
      return wordMatches.length >= Math.min(2, searchWords.length);
    });

    if (match) {
      debugInfo.push(`Word-based match found: ${match.companyName}`);
    } else {
      debugInfo.push('No matches found in business directory');
    }

    return match;
  }
}

export const supplyNationTimingOptimized = new SupplyNationTimingOptimized();