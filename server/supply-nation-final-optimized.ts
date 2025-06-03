/**
 * Supply Nation Final Optimized Authentication
 * Ultimate timing optimization with comprehensive session management
 */

import puppeteer from 'puppeteer';

export interface FinalOptimizedResult {
  authenticationSuccessful: boolean;
  businessVerified: boolean;
  sessionMetrics: {
    loginPageLoad: number;
    credentialInput: number;
    authSubmission: number;
    redirectMonitoring: number;
    sessionValidation: number;
    businessLookup: number;
    totalExecution: number;
  };
  businessData?: {
    companyName: string;
    abnNumber?: string;
    businessLocation?: string;
    profileLink: string;
    verificationConfirmed: boolean;
  };
  executionLog: string[];
  finalMessage: string;
}

export class SupplyNationFinalOptimized {
  
  async executeOptimizedVerification(businessQuery: string): Promise<FinalOptimizedResult> {
    const executionStart = Date.now();
    const sessionMetrics = {
      loginPageLoad: 0,
      credentialInput: 0,
      authSubmission: 0,
      redirectMonitoring: 0,
      sessionValidation: 0,
      businessLookup: 0,
      totalExecution: 0
    };
    const executionLog: string[] = [];
    
    let browserInstance = null;
    let pageInstance = null;

    try {
      const credentials = {
        username: process.env.SUPPLY_NATION_USERNAME,
        password: process.env.SUPPLY_NATION_PASSWORD
      };

      if (!credentials.username || !credentials.password) {
        return {
          authenticationSuccessful: false,
          businessVerified: false,
          sessionMetrics: { ...sessionMetrics, totalExecution: Date.now() - executionStart },
          executionLog: ['Supply Nation credentials not available in environment'],
          finalMessage: 'Authentication credentials required for Supply Nation verification'
        };
      }

      executionLog.push(`Verification initiated for: ${businessQuery}`);
      executionLog.push(`Credentials available: Username ${credentials.username.length} chars, Password ${credentials.password.length} chars`);

      // Phase 1: Browser initialization with optimized settings
      browserInstance = await puppeteer.launch({
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
          '--no-first-run'
        ]
      });

      pageInstance = await browserInstance.newPage();
      await pageInstance.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await pageInstance.setViewport({ width: 1366, height: 768 });

      // Extended timeouts for complex authentication flow
      pageInstance.setDefaultTimeout(60000);
      pageInstance.setDefaultNavigationTimeout(60000);

      executionLog.push('Browser initialized with optimized configuration');

      // Phase 2: Login page access with comprehensive waiting
      const loginStart = Date.now();
      executionLog.push('Accessing Supply Nation login page...');
      
      await pageInstance.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 35000
      });

      sessionMetrics.loginPageLoad = Date.now() - loginStart;
      executionLog.push(`Login page loaded successfully in ${sessionMetrics.loginPageLoad}ms`);

      // Progressive stabilization with multiple validation points
      await this.performProgressiveStabilization(pageInstance, executionLog);

      // Phase 3: Credential entry with enhanced validation
      const credentialStart = Date.now();
      const credentialSuccess = await this.executeEnhancedCredentialEntry(
        pageInstance, 
        credentials.username, 
        credentials.password, 
        executionLog
      );

      sessionMetrics.credentialInput = Date.now() - credentialStart;

      if (!credentialSuccess) {
        await browserInstance.close();
        return {
          authenticationSuccessful: false,
          businessVerified: false,
          sessionMetrics: { ...sessionMetrics, totalExecution: Date.now() - executionStart },
          executionLog,
          finalMessage: 'Credential entry failed - login form not accessible'
        };
      }

      // Phase 4: Authentication submission with monitoring
      const submissionStart = Date.now();
      const submissionSuccess = await this.executeAuthSubmissionWithMonitoring(pageInstance, executionLog);
      sessionMetrics.authSubmission = Date.now() - submissionStart;

      if (!submissionSuccess) {
        await browserInstance.close();
        return {
          authenticationSuccessful: false,
          businessVerified: false,
          sessionMetrics: { ...sessionMetrics, totalExecution: Date.now() - executionStart },
          executionLog,
          finalMessage: 'Authentication form submission failed'
        };
      }

      // Phase 5: Comprehensive redirect and session monitoring
      const redirectStart = Date.now();
      const sessionEstablished = await this.performComprehensiveSessionMonitoring(pageInstance, executionLog);
      sessionMetrics.redirectMonitoring = Date.now() - redirectStart;

      if (!sessionEstablished.success) {
        await browserInstance.close();
        return {
          authenticationSuccessful: false,
          businessVerified: false,
          sessionMetrics: { ...sessionMetrics, totalExecution: Date.now() - executionStart },
          executionLog,
          finalMessage: sessionEstablished.message
        };
      }

      // Phase 6: Session validation and search access
      const validationStart = Date.now();
      const searchAccessible = await this.validateSessionAndSearchAccess(pageInstance, executionLog);
      sessionMetrics.sessionValidation = Date.now() - validationStart;

      if (!searchAccessible) {
        await browserInstance.close();
        return {
          authenticationSuccessful: true,
          businessVerified: false,
          sessionMetrics: { ...sessionMetrics, totalExecution: Date.now() - executionStart },
          executionLog,
          finalMessage: 'Authentication successful but search functionality not accessible'
        };
      }

      // Phase 7: Business verification with comprehensive search
      const lookupStart = Date.now();
      const businessResult = await this.executeComprehensiveBusinessLookup(pageInstance, businessQuery, executionLog);
      sessionMetrics.businessLookup = Date.now() - lookupStart;

      await browserInstance.close();

      sessionMetrics.totalExecution = Date.now() - executionStart;

      if (businessResult.found) {
        executionLog.push(`Business verification successful: ${businessResult.businessData?.companyName}`);
        return {
          authenticationSuccessful: true,
          businessVerified: true,
          sessionMetrics,
          businessData: businessResult.businessData,
          executionLog,
          finalMessage: `${businessResult.businessData?.companyName} verified as Indigenous business in Supply Nation directory`
        };
      } else {
        executionLog.push(`Business not found in Supply Nation directory: ${businessQuery}`);
        return {
          authenticationSuccessful: true,
          businessVerified: false,
          sessionMetrics,
          executionLog,
          finalMessage: `${businessQuery} not found in Supply Nation Indigenous business directory`
        };
      }

    } catch (error) {
      if (browserInstance) await browserInstance.close();
      sessionMetrics.totalExecution = Date.now() - executionStart;
      executionLog.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        authenticationSuccessful: false,
        businessVerified: false,
        sessionMetrics,
        executionLog,
        finalMessage: `Verification process failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async performProgressiveStabilization(page: puppeteer.Page, log: string[]): Promise<void> {
    const stabilizationPhases = [2500, 4000, 5500];
    
    for (let phase = 0; phase < stabilizationPhases.length; phase++) {
      await new Promise(resolve => setTimeout(resolve, stabilizationPhases[phase]));
      
      const pageReadiness = await page.evaluate(() => {
        return {
          documentReady: document.readyState === 'complete',
          emailFieldPresent: document.querySelector('input[type="email"], input[type="text"]') !== null,
          passwordFieldPresent: document.querySelector('input[type="password"]') !== null,
          submitButtonPresent: document.querySelector('button[type="submit"], input[type="submit"]') !== null,
          formElements: document.querySelectorAll('form').length,
          inputElements: document.querySelectorAll('input').length
        };
      });

      log.push(`Stabilization phase ${phase + 1}: Document=${pageReadiness.documentReady}, Email=${pageReadiness.emailFieldPresent}, Password=${pageReadiness.passwordFieldPresent}, Submit=${pageReadiness.submitButtonPresent}, Forms=${pageReadiness.formElements}, Inputs=${pageReadiness.inputElements}`);

      if (pageReadiness.documentReady && pageReadiness.emailFieldPresent && pageReadiness.passwordFieldPresent && pageReadiness.submitButtonPresent) {
        log.push(`Page fully stabilized after ${stabilizationPhases[phase]}ms`);
        return;
      }
    }

    log.push('Page stabilization completed with extended timing');
  }

  private async executeEnhancedCredentialEntry(page: puppeteer.Page, username: string, password: string, log: string[]): Promise<boolean> {
    const maxRetries = 6;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      log.push(`Credential entry attempt ${attempt}/${maxRetries}`);

      try {
        const entryResult = await page.evaluate((usr, pwd) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          if (!emailField || !passwordField) {
            return { success: false, issue: 'Required fields not found' };
          }

          if (emailField.offsetHeight === 0 || passwordField.offsetHeight === 0) {
            return { success: false, issue: 'Fields not visible' };
          }

          // Clear any existing values
          emailField.value = '';
          passwordField.value = '';

          // Enhanced field interaction sequence
          emailField.focus();
          emailField.click();
          emailField.value = usr;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));
          emailField.dispatchEvent(new Event('blur', { bubbles: true }));

          // Delay for field validation processing
          setTimeout(() => {
            passwordField.focus();
            passwordField.click();
            passwordField.value = pwd;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('blur', { bubbles: true }));
          }, 300);

          return {
            success: true,
            emailLength: emailField.value.length,
            passwordLength: passwordField.value.length,
            emailMatches: emailField.value === usr,
            passwordMatches: passwordField.value === pwd
          };
        }, username, password);

        log.push(`Entry attempt ${attempt}: ${entryResult.success ? 'Success' : entryResult.issue} - Email: ${entryResult.emailLength || 0} chars, Password: ${entryResult.passwordLength || 0} chars`);

        if (entryResult.success && entryResult.emailMatches && entryResult.passwordMatches) {
          // Additional stabilization for form validation
          await new Promise(resolve => setTimeout(resolve, 1200));
          log.push('Credentials successfully entered and validated');
          return true;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        log.push(`Credential entry attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    log.push('All credential entry attempts exhausted');
    return false;
  }

  private async executeAuthSubmissionWithMonitoring(page: puppeteer.Page, log: string[]): Promise<boolean> {
    const maxSubmissionAttempts = 4;
    
    for (let attempt = 1; attempt <= maxSubmissionAttempts; attempt++) {
      log.push(`Authentication submission attempt ${attempt}/${maxSubmissionAttempts}`);

      try {
        const submissionResult = await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          
          if (!submitButton) {
            return { success: false, issue: 'Submit button not found' };
          }

          if (submitButton.offsetHeight === 0) {
            return { success: false, issue: 'Submit button not visible' };
          }

          if (submitButton.hasAttribute('disabled')) {
            return { success: false, issue: 'Submit button disabled' };
          }

          // Enhanced submission interaction
          submitButton.focus();
          submitButton.click();
          
          return { success: true, buttonText: submitButton.textContent?.trim() };
        });

        log.push(`Submission attempt ${attempt}: ${submissionResult.success ? 'Executed' : submissionResult.issue} - Button: "${submissionResult.buttonText || 'Unknown'}"`);

        if (submissionResult.success) {
          // Extended wait for submission processing
          await new Promise(resolve => setTimeout(resolve, 3000));
          log.push('Authentication form submitted successfully');
          return true;
        }

        if (attempt < maxSubmissionAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

      } catch (error) {
        log.push(`Submission attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    log.push('All authentication submission attempts exhausted');
    return false;
  }

  private async performComprehensiveSessionMonitoring(page: puppeteer.Page, log: string[]): Promise<{
    success: boolean;
    message: string;
  }> {
    const maxMonitoringDuration = 30000; // 30 seconds
    const monitoringInterval = 3000; // 3 seconds
    const monitoringStart = Date.now();
    
    let previousUrl = await page.url();
    let redirectSequence = [previousUrl];
    let redirectCount = 0;

    log.push(`Session monitoring initiated from: ${previousUrl}`);

    while ((Date.now() - monitoringStart) < maxMonitoringDuration) {
      await new Promise(resolve => setTimeout(resolve, monitoringInterval));
      
      const currentUrl = await page.url();
      
      if (currentUrl !== previousUrl) {
        redirectCount++;
        redirectSequence.push(currentUrl);
        log.push(`Redirect ${redirectCount}: ${currentUrl}`);
        previousUrl = currentUrl;
      }

      // Comprehensive authentication verification
      const authenticationStatus = await page.evaluate(() => {
        const currentUrl = window.location.href;
        const pageContent = document.body.innerText.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        
        const successPatterns = [
          currentUrl.includes('CommunitiesLanding'),
          currentUrl.includes('search-results'),
          currentUrl.includes('supplynation.org.au') && !currentUrl.includes('login'),
          pageContent.includes('search'),
          pageContent.includes('indigenous business directory'),
          pageContent.includes('communities'),
          pageContent.includes('dashboard'),
          pageTitle.includes('communities'),
          pageTitle.includes('search')
        ];

        const errorPatterns = [
          pageContent.includes('invalid credentials'),
          pageContent.includes('login failed'),
          pageContent.includes('authentication error'),
          document.querySelector('.error, .alert-danger, .slds-has-error') !== null
        ];

        return {
          currentUrl,
          successIndicators: successPatterns.filter(Boolean).length,
          errorIndicators: errorPatterns.filter(Boolean).length,
          pageTitle,
          contentLength: pageContent.length
        };
      });

      log.push(`Auth status: URL=${authenticationStatus.currentUrl.substring(0, 50)}..., Success=${authenticationStatus.successIndicators}, Errors=${authenticationStatus.errorIndicators}, Content=${authenticationStatus.contentLength} chars`);

      // Success condition: Multiple positive indicators
      if (authenticationStatus.successIndicators >= 3) {
        log.push(`Session establishment confirmed after ${Date.now() - monitoringStart}ms with ${redirectCount} redirects`);
        return {
          success: true,
          message: `Authentication session established successfully in ${Date.now() - monitoringStart}ms`
        };
      }

      // Error condition: Authentication failure detected
      if (authenticationStatus.errorIndicators > 0) {
        log.push('Authentication error indicators detected');
        return {
          success: false,
          message: 'Authentication failed - error indicators found on page'
        };
      }

      // Timeout warning at 75% of monitoring duration
      if ((Date.now() - monitoringStart) > (maxMonitoringDuration * 0.75) && redirectCount === 0) {
        log.push('Warning: No redirects detected, potential authentication stall');
      }
    }

    log.push(`Session monitoring timeout after ${Date.now() - monitoringStart}ms with ${redirectCount} redirects`);
    return {
      success: false,
      message: `Session establishment timeout after ${Date.now() - monitoringStart}ms`
    };
  }

  private async validateSessionAndSearchAccess(page: puppeteer.Page, log: string[]): Promise<boolean> {
    log.push('Validating authenticated session and search access...');

    try {
      // Ensure navigation to search functionality
      const currentUrl = await page.url();
      if (!currentUrl.includes('search-results')) {
        log.push('Navigating to search results page for validation...');
        await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      // Validate search functionality access
      const searchValidation = await page.evaluate(() => {
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"], input[placeholder*="search" i]');
        const hasSearchInputs = searchInputs.length > 0;
        
        const authenticatedIndicators = [
          document.querySelector('a[href*="logout"]') !== null,
          document.querySelector('a[href*="profile"]') !== null,
          document.querySelector('.user-menu') !== null,
          document.body.innerText.toLowerCase().includes('search'),
          document.body.innerText.toLowerCase().includes('directory')
        ];

        return {
          hasSearchInputs,
          searchInputCount: searchInputs.length,
          authenticatedFeatures: authenticatedIndicators.filter(Boolean).length,
          pageUrl: window.location.href
        };
      });

      log.push(`Search validation: Inputs=${searchValidation.searchInputCount}, Auth features=${searchValidation.authenticatedFeatures}, URL=${searchValidation.pageUrl.substring(0, 50)}...`);

      const accessConfirmed = searchValidation.hasSearchInputs && searchValidation.authenticatedFeatures >= 2;
      
      if (accessConfirmed) {
        log.push('Session validation successful - search functionality accessible');
      } else {
        log.push('Session validation incomplete - limited search access detected');
      }

      return accessConfirmed;

    } catch (error) {
      log.push(`Session validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  private async executeComprehensiveBusinessLookup(page: puppeteer.Page, businessQuery: string, log: string[]): Promise<{
    found: boolean;
    businessData?: {
      companyName: string;
      abnNumber?: string;
      businessLocation?: string;
      profileLink: string;
      verificationConfirmed: boolean;
    };
  }> {
    log.push(`Executing comprehensive business lookup for: ${businessQuery}`);

    try {
      // Execute search with multiple methodologies
      const searchExecutionSuccess = await this.performMultiMethodSearch(page, businessQuery, log);

      if (!searchExecutionSuccess) {
        log.push('Search execution failed - input methods not accessible');
        return { found: false };
      }

      // Extended wait for comprehensive results
      log.push('Waiting for search results with extended timing...');
      await new Promise(resolve => setTimeout(resolve, 7000));

      // Extract and analyze business results
      const businessResults = await page.evaluate(() => {
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"], a[href*="profile"]');
        const extractedBusinesses: any[] = [];

        profileLinks.forEach((link) => {
          const companyName = link.textContent?.trim();
          const profileUrl = (link as HTMLAnchorElement).href;
          
          if (companyName && profileUrl && companyName.length > 2) {
            // Enhanced context extraction from surrounding elements
            const contextElement = link.closest('article, .result-item, .business-listing, .search-result, .profile-card') || link.parentElement;
            const contextText = contextElement?.textContent || '';
            
            // Advanced data extraction
            const abnPattern = /ABN:?\s*(\d{11})/i;
            const abnMatch = contextText.match(abnPattern);
            const abnNumber = abnMatch ? abnMatch[1] : undefined;
            
            const locationPattern = /([A-Z]{2,3})\s*(\d{4})/;
            const locationMatch = contextText.match(locationPattern);
            const businessLocation = locationMatch ? `${locationMatch[1]} ${locationMatch[2]}` : undefined;

            extractedBusinesses.push({
              companyName: companyName.trim(),
              abnNumber,
              businessLocation,
              profileLink: profileUrl,
              verificationConfirmed: true,
              contextLength: contextText.length
            });
          }
        });

        return extractedBusinesses;
      });

      log.push(`Business extraction completed: ${businessResults.length} businesses found`);

      // Advanced business matching with multiple algorithms
      const matchingBusiness = this.performAdvancedBusinessMatching(businessResults, businessQuery, log);

      if (matchingBusiness) {
        log.push(`Matching business identified: ${matchingBusiness.companyName}`);
        return {
          found: true,
          businessData: matchingBusiness
        };
      } else {
        log.push('No matching business found in search results');
        return { found: false };
      }

    } catch (error) {
      log.push(`Business lookup error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { found: false };
    }
  }

  private async performMultiMethodSearch(page: puppeteer.Page, businessQuery: string, log: string[]): Promise<boolean> {
    const searchMethods = [
      'input[type="search"]',
      'input[name*="search"]',
      'input[placeholder*="search" i]',
      'input[placeholder*="business" i]',
      'input[placeholder*="company" i]'
    ];

    for (let methodIndex = 0; methodIndex < searchMethods.length; methodIndex++) {
      const selector = searchMethods[methodIndex];
      log.push(`Attempting search method ${methodIndex + 1}: ${selector}`);

      try {
        const searchResult = await page.evaluate((query, searchSelector) => {
          const searchInput = document.querySelector(searchSelector) as HTMLInputElement;
          
          if (searchInput && searchInput.offsetHeight > 0) {
            searchInput.focus();
            searchInput.click();
            searchInput.value = '';
            searchInput.value = query;
            
            // Comprehensive event dispatching
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
            searchInput.dispatchEvent(new Event('keyup', { bubbles: true }));

            // Form submission attempt
            const parentForm = searchInput.closest('form');
            if (parentForm) {
              parentForm.submit();
              return { success: true, method: 'form_submission' };
            }

            // Enter key simulation
            const enterKeyEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
            searchInput.dispatchEvent(enterKeyEvent);
            return { success: true, method: 'enter_key' };
          }
          
          return { success: false, method: 'input_not_accessible' };
        }, businessQuery, selector);

        log.push(`Search method ${methodIndex + 1}: ${searchResult.success ? 'Success' : 'Failed'} - ${searchResult.method}`);

        if (searchResult.success) {
          return true;
        }

      } catch (error) {
        log.push(`Search method ${methodIndex + 1} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    log.push('All search methods exhausted without success');
    return false;
  }

  private performAdvancedBusinessMatching(businesses: any[], searchQuery: string, log: string[]): any {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    log.push(`Performing advanced matching for: "${normalizedQuery}"`);

    // Direct exact match
    let match = businesses.find(business => {
      const normalizedName = business.companyName.toLowerCase();
      return normalizedName === normalizedQuery || 
             normalizedName.includes(normalizedQuery) || 
             normalizedQuery.includes(normalizedName);
    });

    if (match) {
      log.push(`Direct match found: ${match.companyName}`);
      return match;
    }

    // Word-based comprehensive matching
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
    log.push(`Word-based matching with: ${queryWords.join(', ')}`);

    match = businesses.find(business => {
      const businessWords = business.companyName.toLowerCase().split(/\s+/);
      const matchingWords = queryWords.filter(queryWord => 
        businessWords.some(businessWord => 
          businessWord.includes(queryWord) || 
          queryWord.includes(businessWord) ||
          this.calculateWordSimilarity(businessWord, queryWord) > 0.8
        )
      );
      
      return matchingWords.length >= Math.min(queryWords.length, 2);
    });

    if (match) {
      log.push(`Word-based match found: ${match.companyName}`);
      return match;
    }

    // Fuzzy matching for partial similarities
    match = businesses.find(business => {
      const similarity = this.calculateStringSimilarity(business.companyName.toLowerCase(), normalizedQuery);
      return similarity > 0.7;
    });

    if (match) {
      log.push(`Fuzzy match found: ${match.companyName}`);
    } else {
      log.push('No matching business found with any algorithm');
    }

    return match;
  }

  private calculateWordSimilarity(word1: string, word2: string): number {
    const maxLength = Math.max(word1.length, word2.length);
    if (maxLength === 0) return 1;

    const distance = this.calculateLevenshteinDistance(word1, word2);
    return (maxLength - distance) / maxLength;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let totalSimilarity = 0;
    let comparisons = 0;

    for (const word1 of words1) {
      for (const word2 of words2) {
        if (word1.length > 2 && word2.length > 2) {
          totalSimilarity += this.calculateWordSimilarity(word1, word2);
          comparisons++;
        }
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

export const supplyNationFinalOptimized = new SupplyNationFinalOptimized();