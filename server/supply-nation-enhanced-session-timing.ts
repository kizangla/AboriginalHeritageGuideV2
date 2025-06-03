/**
 * Supply Nation Enhanced Session Timing
 * Advanced redirect monitoring and session establishment optimization
 */

import puppeteer from 'puppeteer';

export interface EnhancedSessionResult {
  connectionEstablished: boolean;
  businessVerified: boolean;
  sessionDetails: {
    redirectSequence: string[];
    redirectCount: number;
    sessionDuration: number;
    stabilizationTime: number;
    searchAccessTime: number;
    totalExecutionTime: number;
  };
  businessData?: {
    companyName: string;
    abn?: string;
    location?: string;
    profileUrl: string;
    verified: boolean;
  };
  detailedLog: string[];
  statusMessage: string;
}

export class SupplyNationEnhancedSessionTiming {
  
  async establishConnectionWithEnhancedTiming(businessQuery: string): Promise<EnhancedSessionResult> {
    const executionStart = Date.now();
    const sessionDetails = {
      redirectSequence: [] as string[],
      redirectCount: 0,
      sessionDuration: 0,
      stabilizationTime: 0,
      searchAccessTime: 0,
      totalExecutionTime: 0
    };
    const detailedLog: string[] = [];
    
    let browser = null;
    let page = null;

    try {
      const credentials = {
        username: process.env.SUPPLY_NATION_USERNAME,
        password: process.env.SUPPLY_NATION_PASSWORD
      };

      if (!credentials.username || !credentials.password) {
        return {
          connectionEstablished: false,
          businessVerified: false,
          sessionDetails: { ...sessionDetails, totalExecutionTime: Date.now() - executionStart },
          detailedLog: ['Supply Nation credentials not configured'],
          statusMessage: 'Authentication credentials required for Supply Nation connection'
        };
      }

      detailedLog.push(`Initiating enhanced session timing for business: ${businessQuery}`);
      detailedLog.push(`Credentials configured: Username ${credentials.username.length} chars, Password ${credentials.password.length} chars`);

      // Enhanced browser configuration for session management
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
          '--disable-extensions',
          '--disable-default-apps',
          '--no-first-run',
          '--disable-sync',
          '--disable-translate',
          '--disable-plugins'
        ]
      });

      page = await browser.newPage();
      
      // Enhanced page configuration
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });
      await page.setDefaultTimeout(90000); // Extended timeout
      await page.setDefaultNavigationTimeout(90000);

      // Enable request interception for enhanced monitoring
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('supplynation.org.au')) {
          detailedLog.push(`Request: ${request.method()} ${url.substring(0, 80)}...`);
        }
        request.continue();
      });

      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('supplynation.org.au')) {
          detailedLog.push(`Response: ${response.status()} ${url.substring(0, 80)}...`);
        }
      });

      detailedLog.push('Enhanced browser and page configuration complete');

      // Phase 1: Initial navigation with extended monitoring
      detailedLog.push('Phase 1: Navigating to Supply Nation login page...');
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 45000
      });

      sessionDetails.redirectSequence.push(await page.url());
      detailedLog.push(`Initial page loaded: ${sessionDetails.redirectSequence[0]}`);

      // Phase 2: Enhanced stabilization with progressive validation
      const stabilizationStart = Date.now();
      await this.performEnhancedStabilization(page, detailedLog);
      sessionDetails.stabilizationTime = Date.now() - stabilizationStart;

      // Phase 3: Credential input with enhanced validation
      detailedLog.push('Phase 3: Executing enhanced credential input...');
      const credentialsSet = await this.executeEnhancedCredentialInput(page, credentials.username, credentials.password, detailedLog);

      if (!credentialsSet) {
        await browser.close();
        return {
          connectionEstablished: false,
          businessVerified: false,
          sessionDetails: { ...sessionDetails, totalExecutionTime: Date.now() - executionStart },
          detailedLog,
          statusMessage: 'Credential input failed - login form not accessible'
        };
      }

      // Phase 4: Authentication submission with comprehensive monitoring
      detailedLog.push('Phase 4: Submitting authentication with enhanced monitoring...');
      const submissionSuccess = await this.executeEnhancedSubmission(page, detailedLog);

      if (!submissionSuccess) {
        await browser.close();
        return {
          connectionEstablished: false,
          businessVerified: false,
          sessionDetails: { ...sessionDetails, totalExecutionTime: Date.now() - executionStart },
          detailedLog,
          statusMessage: 'Authentication submission failed'
        };
      }

      // Phase 5: Advanced redirect sequence monitoring
      detailedLog.push('Phase 5: Monitoring redirect sequence with enhanced timing...');
      const sessionStart = Date.now();
      const redirectResult = await this.monitorAdvancedRedirectSequence(page, sessionDetails, detailedLog);
      sessionDetails.sessionDuration = Date.now() - sessionStart;

      if (!redirectResult.sessionEstablished) {
        await browser.close();
        return {
          connectionEstablished: false,
          businessVerified: false,
          sessionDetails: { ...sessionDetails, totalExecutionTime: Date.now() - executionStart },
          detailedLog,
          statusMessage: redirectResult.message
        };
      }

      // Phase 6: Search functionality validation and access
      detailedLog.push('Phase 6: Validating search functionality access...');
      const searchStart = Date.now();
      const searchAccessible = await this.validateEnhancedSearchAccess(page, detailedLog);
      sessionDetails.searchAccessTime = Date.now() - searchStart;

      if (!searchAccessible) {
        await browser.close();
        return {
          connectionEstablished: true,
          businessVerified: false,
          sessionDetails: { ...sessionDetails, totalExecutionTime: Date.now() - executionStart },
          detailedLog,
          statusMessage: 'Session established but search functionality not accessible'
        };
      }

      // Phase 7: Business verification with enhanced search
      detailedLog.push(`Phase 7: Executing enhanced business search for: ${businessQuery}`);
      const businessResult = await this.executeEnhancedBusinessSearch(page, businessQuery, detailedLog);

      await browser.close();

      sessionDetails.totalExecutionTime = Date.now() - executionStart;

      if (businessResult.found) {
        detailedLog.push(`Business verification successful: ${businessResult.businessData?.companyName}`);
        return {
          connectionEstablished: true,
          businessVerified: true,
          sessionDetails,
          businessData: businessResult.businessData,
          detailedLog,
          statusMessage: `Successfully verified ${businessResult.businessData?.companyName} as Indigenous business in ${sessionDetails.totalExecutionTime}ms`
        };
      } else {
        detailedLog.push('Business not found in Supply Nation directory');
        return {
          connectionEstablished: true,
          businessVerified: false,
          sessionDetails,
          detailedLog,
          statusMessage: `Supply Nation connection established but ${businessQuery} not found in directory`
        };
      }

    } catch (error) {
      if (browser) await browser.close();
      sessionDetails.totalExecutionTime = Date.now() - executionStart;
      detailedLog.push(`Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        connectionEstablished: false,
        businessVerified: false,
        sessionDetails,
        detailedLog,
        statusMessage: `Connection attempt failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async performEnhancedStabilization(page: puppeteer.Page, log: string[]): Promise<void> {
    const stabilizationPhases = [3000, 5000, 7000, 9000];
    
    for (let phase = 0; phase < stabilizationPhases.length; phase++) {
      await new Promise(resolve => setTimeout(resolve, stabilizationPhases[phase]));
      
      const pageValidation = await page.evaluate(() => {
        const formElements = document.querySelectorAll('form');
        const inputElements = document.querySelectorAll('input');
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
        const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
        
        return {
          documentState: document.readyState,
          formCount: formElements.length,
          inputCount: inputElements.length,
          emailFieldValid: emailField && emailField.offsetHeight > 0 && !emailField.disabled,
          passwordFieldValid: passwordField && passwordField.offsetHeight > 0 && !passwordField.disabled,
          submitButtonValid: submitButton && submitButton.offsetHeight > 0 && !submitButton.hasAttribute('disabled'),
          pageTitle: document.title,
          bodyTextLength: document.body.innerText.length
        };
      });

      log.push(`Stabilization phase ${phase + 1}/${stabilizationPhases.length}: Document=${pageValidation.documentState}, Forms=${pageValidation.formCount}, Inputs=${pageValidation.inputCount}, Email=${pageValidation.emailFieldValid}, Password=${pageValidation.passwordFieldValid}, Submit=${pageValidation.submitButtonValid}, Content=${pageValidation.bodyTextLength} chars`);

      if (pageValidation.documentState === 'complete' && 
          pageValidation.emailFieldValid && 
          pageValidation.passwordFieldValid && 
          pageValidation.submitButtonValid &&
          pageValidation.bodyTextLength > 1000) {
        
        log.push(`Page fully stabilized after ${stabilizationPhases[phase]}ms with comprehensive validation`);
        return;
      }
    }

    log.push('Enhanced stabilization completed with extended timing phases');
  }

  private async executeEnhancedCredentialInput(page: puppeteer.Page, username: string, password: string, log: string[]): Promise<boolean> {
    const maxAttempts = 8;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      log.push(`Enhanced credential input attempt ${attempt}/${maxAttempts}`);

      try {
        // Pre-input validation
        const preValidation = await page.evaluate(() => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          return {
            emailFieldExists: !!emailField,
            passwordFieldExists: !!passwordField,
            emailFieldVisible: emailField ? emailField.offsetHeight > 0 : false,
            passwordFieldVisible: passwordField ? passwordField.offsetHeight > 0 : false,
            emailFieldEnabled: emailField ? !emailField.disabled : false,
            passwordFieldEnabled: passwordField ? !passwordField.disabled : false
          };
        });

        log.push(`Pre-validation: Email exists=${preValidation.emailFieldExists}, visible=${preValidation.emailFieldVisible}, enabled=${preValidation.emailFieldEnabled}; Password exists=${preValidation.passwordFieldExists}, visible=${preValidation.passwordFieldVisible}, enabled=${preValidation.passwordFieldEnabled}`);

        if (!preValidation.emailFieldExists || !preValidation.passwordFieldExists) {
          log.push(`Attempt ${attempt}: Required fields not found`);
          continue;
        }

        // Enhanced credential input with comprehensive event handling
        const inputResult = await page.evaluate((usr, pwd) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          if (!emailField || !passwordField) {
            return { success: false, issue: 'Fields not accessible' };
          }

          // Clear existing values
          emailField.value = '';
          passwordField.value = '';

          // Enhanced email input sequence
          emailField.focus();
          emailField.click();
          emailField.value = usr;
          
          // Comprehensive event dispatching for email field
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));
          emailField.dispatchEvent(new Event('keyup', { bubbles: true }));
          emailField.dispatchEvent(new Event('blur', { bubbles: true }));

          // Delay for email validation processing
          setTimeout(() => {
            // Enhanced password input sequence
            passwordField.focus();
            passwordField.click();
            passwordField.value = pwd;
            
            // Comprehensive event dispatching for password field
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('keyup', { bubbles: true }));
            passwordField.dispatchEvent(new Event('blur', { bubbles: true }));
          }, 500);

          return {
            success: true,
            emailSet: emailField.value === usr,
            passwordSet: passwordField.value === pwd,
            emailLength: emailField.value.length,
            passwordLength: passwordField.value.length
          };
        }, username, password);

        log.push(`Input result attempt ${attempt}: Success=${inputResult.success}, Email set=${inputResult.emailSet}, Password set=${inputResult.passwordSet}, Email len=${inputResult.emailLength}, Password len=${inputResult.passwordLength}`);

        if (inputResult.success && inputResult.emailSet && inputResult.passwordSet) {
          // Extended validation delay for form processing
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Post-input validation
          const postValidation = await page.evaluate((usr, pwd) => {
            const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
            const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
            
            return {
              emailStillSet: emailField ? emailField.value === usr : false,
              passwordStillSet: passwordField ? passwordField.value === pwd : false,
              formValidationErrors: document.querySelectorAll('.error, .invalid, .slds-has-error').length
            };
          }, username, password);

          log.push(`Post-validation: Email persisted=${postValidation.emailStillSet}, Password persisted=${postValidation.passwordStillSet}, Validation errors=${postValidation.formValidationErrors}`);

          if (postValidation.emailStillSet && postValidation.passwordStillSet && postValidation.formValidationErrors === 0) {
            log.push('Enhanced credential input successful with validation');
            return true;
          }
        }

        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2500));
        }

      } catch (error) {
        log.push(`Credential input attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    log.push('All enhanced credential input attempts exhausted');
    return false;
  }

  private async executeEnhancedSubmission(page: puppeteer.Page, log: string[]): Promise<boolean> {
    const maxSubmissionAttempts = 6;
    
    for (let attempt = 1; attempt <= maxSubmissionAttempts; attempt++) {
      log.push(`Enhanced submission attempt ${attempt}/${maxSubmissionAttempts}`);

      try {
        // Pre-submission validation
        const preSubmissionCheck = await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          const form = document.querySelector('form') as HTMLFormElement;
          
          return {
            submitButtonExists: !!submitButton,
            submitButtonVisible: submitButton ? submitButton.offsetHeight > 0 : false,
            submitButtonEnabled: submitButton ? !submitButton.hasAttribute('disabled') : false,
            submitButtonText: submitButton ? submitButton.textContent?.trim() : '',
            formExists: !!form,
            formAction: form ? form.action : ''
          };
        });

        log.push(`Pre-submission: Button exists=${preSubmissionCheck.submitButtonExists}, visible=${preSubmissionCheck.submitButtonVisible}, enabled=${preSubmissionCheck.submitButtonEnabled}, text="${preSubmissionCheck.submitButtonText}", form exists=${preSubmissionCheck.formExists}`);

        if (!preSubmissionCheck.submitButtonExists || !preSubmissionCheck.submitButtonEnabled) {
          log.push(`Attempt ${attempt}: Submit button not accessible`);
          continue;
        }

        // Enhanced submission with monitoring
        const submissionResult = await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          
          if (submitButton) {
            // Enhanced submission interaction
            submitButton.focus();
            submitButton.click();
            
            // Trigger form submission events
            const form = submitButton.closest('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { bubbles: true }));
            }
            
            return { success: true, method: 'button_click_with_form_events' };
          }
          
          return { success: false, method: 'no_accessible_button' };
        });

        log.push(`Submission attempt ${attempt}: ${submissionResult.success ? 'Executed' : 'Failed'} - Method: ${submissionResult.method}`);

        if (submissionResult.success) {
          // Extended wait for submission processing and potential redirects
          await new Promise(resolve => setTimeout(resolve, 4000));
          log.push('Enhanced authentication submission completed with extended processing time');
          return true;
        }

        if (attempt < maxSubmissionAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error) {
        log.push(`Submission attempt ${attempt} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    log.push('All enhanced submission attempts exhausted');
    return false;
  }

  private async monitorAdvancedRedirectSequence(page: puppeteer.Page, sessionDetails: any, log: string[]): Promise<{
    sessionEstablished: boolean;
    message: string;
  }> {
    const maxMonitoringTime = 45000; // 45 seconds
    const checkInterval = 2000; // 2 seconds
    const monitoringStart = Date.now();
    
    let previousUrl = await page.url();
    sessionDetails.redirectSequence = [previousUrl];
    sessionDetails.redirectCount = 0;

    log.push(`Advanced redirect monitoring initiated from: ${previousUrl}`);

    let consecutiveUrlChecks = 0;
    let sessionIndicators = 0;

    while ((Date.now() - monitoringStart) < maxMonitoringTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      
      const currentUrl = await page.url();
      
      // Track URL changes
      if (currentUrl !== previousUrl) {
        sessionDetails.redirectCount++;
        sessionDetails.redirectSequence.push(currentUrl);
        log.push(`Redirect ${sessionDetails.redirectCount}: ${currentUrl}`);
        previousUrl = currentUrl;
        consecutiveUrlChecks = 0;
      } else {
        consecutiveUrlChecks++;
      }

      // Comprehensive session establishment verification
      const sessionStatus = await page.evaluate(() => {
        const currentUrl = window.location.href;
        const pageContent = document.body.innerText.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        
        // Enhanced success indicators
        const authenticationSuccessPatterns = [
          currentUrl.includes('CommunitiesLanding'),
          currentUrl.includes('search-results'),
          currentUrl.includes('Communities'),
          currentUrl.includes('dashboard'),
          currentUrl.includes('home') && !currentUrl.includes('login'),
          currentUrl.includes('supplynation.org.au') && !currentUrl.includes('login') && !currentUrl.includes('auth'),
          pageContent.includes('search'),
          pageContent.includes('indigenous business directory'),
          pageContent.includes('communities'),
          pageContent.includes('profile'),
          pageContent.includes('logout'),
          pageContent.includes('welcome'),
          pageTitle.includes('communities'),
          pageTitle.includes('search'),
          pageTitle.includes('directory'),
          document.querySelector('a[href*="logout"]') !== null,
          document.querySelector('a[href*="profile"]') !== null,
          document.querySelector('.user-menu, .profile-menu') !== null
        ];

        // Enhanced error detection
        const authenticationFailurePatterns = [
          pageContent.includes('invalid credentials'),
          pageContent.includes('login failed'),
          pageContent.includes('authentication error'),
          pageContent.includes('access denied'),
          pageContent.includes('unauthorized'),
          document.querySelector('.error, .alert-danger, .slds-has-error, .login-error') !== null
        ];

        const successCount = authenticationSuccessPatterns.filter(Boolean).length;
        const failureCount = authenticationFailurePatterns.filter(Boolean).length;

        return {
          currentUrl,
          successIndicators: successCount,
          failureIndicators: failureCount,
          pageTitle,
          contentLength: pageContent.length,
          hasAuthenticatedElements: document.querySelector('a[href*="logout"], .user-menu') !== null
        };
      });

      sessionIndicators = sessionStatus.successIndicators;

      log.push(`Session check (${Math.floor((Date.now() - monitoringStart) / 1000)}s): URL=${sessionStatus.currentUrl.substring(0, 60)}..., Success=${sessionStatus.successIndicators}, Failures=${sessionStatus.failureIndicators}, Auth elements=${sessionStatus.hasAuthenticatedElements}, Content=${sessionStatus.contentLength} chars`);

      // Enhanced success condition
      if (sessionStatus.successIndicators >= 4 && sessionStatus.failureIndicators === 0) {
        log.push(`Session establishment confirmed after ${Date.now() - monitoringStart}ms with ${sessionDetails.redirectCount} redirects and ${sessionStatus.successIndicators} success indicators`);
        return {
          sessionEstablished: true,
          message: `Advanced session establishment successful in ${Date.now() - monitoringStart}ms`
        };
      }

      // Failure condition
      if (sessionStatus.failureIndicators > 0) {
        log.push(`Authentication failure detected: ${sessionStatus.failureIndicators} error indicators`);
        return {
          sessionEstablished: false,
          message: 'Authentication failed - error indicators detected'
        };
      }

      // Progressive success tracking
      if (sessionStatus.successIndicators >= 2 && consecutiveUrlChecks >= 3) {
        log.push(`Potential session establishment detected with ${sessionStatus.successIndicators} indicators, verifying stability...`);
        
        // Additional verification wait
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const verificationCheck = await page.evaluate(() => {
          const pageContent = document.body.innerText.toLowerCase();
          return {
            hasSearch: pageContent.includes('search'),
            hasDirectory: pageContent.includes('directory'),
            hasLogout: document.querySelector('a[href*="logout"]') !== null,
            stableUrl: window.location.href
          };
        });

        if (verificationCheck.hasSearch && verificationCheck.hasDirectory) {
          log.push(`Session establishment verified with stable indicators`);
          return {
            sessionEstablished: true,
            message: `Session established with verification in ${Date.now() - monitoringStart}ms`
          };
        }
      }

      // Progress indicators
      if ((Date.now() - monitoringStart) % 15000 === 0) {
        log.push(`Monitoring progress: ${Math.floor((Date.now() - monitoringStart) / 1000)}s elapsed, ${sessionDetails.redirectCount} redirects, ${sessionIndicators} success indicators`);
      }
    }

    log.push(`Advanced redirect monitoring timeout after ${Date.now() - monitoringStart}ms with ${sessionDetails.redirectCount} redirects and ${sessionIndicators} final success indicators`);
    return {
      sessionEstablished: false,
      message: `Session establishment timeout after ${Date.now() - monitoringStart}ms with ${sessionIndicators} success indicators`
    };
  }

  private async validateEnhancedSearchAccess(page: puppeteer.Page, log: string[]): Promise<boolean> {
    log.push('Validating enhanced search functionality access...');

    try {
      // Navigate to search page if not already there
      const currentUrl = await page.url();
      if (!currentUrl.includes('search-results') && !currentUrl.includes('search')) {
        log.push('Navigating to search results page for access validation...');
        await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 25000
        });
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Comprehensive search functionality validation
      const searchValidation = await page.evaluate(() => {
        const searchInputs = document.querySelectorAll('input[type="search"], input[name*="search"], input[placeholder*="search" i]');
        const forms = document.querySelectorAll('form');
        const authenticatedElements = document.querySelectorAll('a[href*="logout"], a[href*="profile"], .user-menu, .profile-menu');
        const pageContent = document.body.innerText.toLowerCase();
        
        const searchFunctionality = {
          searchInputCount: searchInputs.length,
          accessibleSearchInputs: Array.from(searchInputs).filter(input => (input as HTMLElement).offsetHeight > 0).length,
          formCount: forms.length,
          authenticatedElementCount: authenticatedElements.length,
          hasSearchContent: pageContent.includes('search'),
          hasDirectoryContent: pageContent.includes('directory'),
          hasBusinessContent: pageContent.includes('business'),
          pageUrl: window.location.href,
          pageTitle: document.title
        };

        return searchFunctionality;
      });

      log.push(`Search validation: Inputs=${searchValidation.searchInputCount}, Accessible=${searchValidation.accessibleSearchInputs}, Forms=${searchValidation.formCount}, Auth elements=${searchValidation.authenticatedElementCount}, Has search content=${searchValidation.hasSearchContent}, Has directory content=${searchValidation.hasDirectoryContent}`);

      const accessConfirmed = searchValidation.accessibleSearchInputs > 0 && 
                            searchValidation.authenticatedElementCount > 0 && 
                            (searchValidation.hasSearchContent || searchValidation.hasDirectoryContent);
      
      if (accessConfirmed) {
        log.push('Enhanced search functionality access validated successfully');
      } else {
        log.push('Enhanced search functionality access validation incomplete');
      }

      return accessConfirmed;

    } catch (error) {
      log.push(`Enhanced search validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  private async executeEnhancedBusinessSearch(page: puppeteer.Page, businessQuery: string, log: string[]): Promise<{
    found: boolean;
    businessData?: {
      companyName: string;
      abn?: string;
      location?: string;
      profileUrl: string;
      verified: boolean;
    };
  }> {
    log.push(`Executing enhanced business search for: ${businessQuery}`);

    try {
      // Enhanced search execution with multiple methodologies
      const searchExecuted = await this.performComprehensiveSearch(page, businessQuery, log);

      if (!searchExecuted) {
        log.push('Enhanced search execution failed - search inputs not accessible');
        return { found: false };
      }

      // Extended wait for comprehensive search results
      log.push('Waiting for enhanced search results with extended timing...');
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Comprehensive business data extraction
      const businessResults = await page.evaluate(() => {
        const profileSelectors = [
          'a[href*="supplierprofile"]',
          'a[href*="profile"]',
          'a[href*="business"]',
          'a[href*="company"]'
        ];

        const extractedBusinesses: any[] = [];

        profileSelectors.forEach(selector => {
          const profileLinks = document.querySelectorAll(selector);
          
          profileLinks.forEach((link) => {
            const companyName = link.textContent?.trim();
            const profileUrl = (link as HTMLAnchorElement).href;
            
            if (companyName && profileUrl && companyName.length > 2) {
              // Enhanced context extraction from multiple surrounding elements
              const contextElements = [
                link.closest('article'),
                link.closest('.result-item'),
                link.closest('.business-listing'),
                link.closest('.search-result'),
                link.closest('.profile-card'),
                link.closest('.business-card'),
                link.parentElement
              ].filter(Boolean);

              let contextText = '';
              contextElements.forEach(element => {
                if (element && element.textContent) {
                  contextText += ' ' + element.textContent;
                }
              });

              // Advanced data extraction with multiple patterns
              const abnPatterns = [
                /ABN:?\s*(\d{11})/i,
                /Australian Business Number:?\s*(\d{11})/i,
                /(\d{11})/
              ];
              
              let abnNumber;
              for (const pattern of abnPatterns) {
                const match = contextText.match(pattern);
                if (match && match[1]) {
                  abnNumber = match[1];
                  break;
                }
              }

              const locationPatterns = [
                /([A-Z]{2,3})\s*(\d{4})/,
                /(\w+),\s*([A-Z]{2,3})\s*(\d{4})/,
                /(\d{4})\s*([A-Z]{2,3})/
              ];

              let location;
              for (const pattern of locationPatterns) {
                const match = contextText.match(pattern);
                if (match) {
                  location = match[0];
                  break;
                }
              }

              extractedBusinesses.push({
                companyName: companyName.trim(),
                abn: abnNumber,
                location,
                profileUrl,
                verified: true,
                contextLength: contextText.length,
                selector: selector
              });
            }
          });
        });

        return extractedBusinesses;
      });

      log.push(`Enhanced business extraction completed: ${businessResults.length} businesses found`);

      // Advanced business matching with comprehensive algorithms
      const matchingBusiness = this.performComprehensiveBusinessMatching(businessResults, businessQuery, log);

      if (matchingBusiness) {
        log.push(`Enhanced matching business identified: ${matchingBusiness.companyName} (extracted via ${matchingBusiness.selector})`);
        return {
          found: true,
          businessData: {
            companyName: matchingBusiness.companyName,
            abn: matchingBusiness.abn,
            location: matchingBusiness.location,
            profileUrl: matchingBusiness.profileUrl,
            verified: matchingBusiness.verified
          }
        };
      } else {
        log.push('No matching business found in enhanced search results');
        return { found: false };
      }

    } catch (error) {
      log.push(`Enhanced business search error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { found: false };
    }
  }

  private async performComprehensiveSearch(page: puppeteer.Page, businessQuery: string, log: string[]): Promise<boolean> {
    const searchStrategies = [
      { selector: 'input[type="search"]', method: 'search_input' },
      { selector: 'input[name*="search"]', method: 'name_search' },
      { selector: 'input[placeholder*="search" i]', method: 'placeholder_search' },
      { selector: 'input[placeholder*="business" i]', method: 'business_input' },
      { selector: 'input[placeholder*="company" i]', method: 'company_input' },
      { selector: 'input[class*="search"]', method: 'class_search' }
    ];

    for (let strategyIndex = 0; strategyIndex < searchStrategies.length; strategyIndex++) {
      const strategy = searchStrategies[strategyIndex];
      log.push(`Comprehensive search strategy ${strategyIndex + 1}: ${strategy.method} with selector ${strategy.selector}`);

      try {
        const searchResult = await page.evaluate((query, searchSelector, methodName) => {
          const searchInputs = document.querySelectorAll(searchSelector);
          
          for (let i = 0; i < searchInputs.length; i++) {
            const searchInput = searchInputs[i] as HTMLInputElement;
            
            if (searchInput && searchInput.offsetHeight > 0 && !searchInput.disabled) {
              // Enhanced search input interaction
              searchInput.focus();
              searchInput.click();
              searchInput.value = '';
              searchInput.value = query;
              
              // Comprehensive event dispatching
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
              searchInput.dispatchEvent(new Event('change', { bubbles: true }));
              searchInput.dispatchEvent(new Event('keyup', { bubbles: true }));

              // Multiple submission methods
              const parentForm = searchInput.closest('form');
              if (parentForm) {
                parentForm.submit();
                return { success: true, method: `${methodName}_form_submit`, inputIndex: i };
              }

              // Enter key simulation
              const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
              searchInput.dispatchEvent(enterEvent);
              
              // Search button click attempt
              const searchButton = document.querySelector('button[type="submit"], button[class*="search"], .search-button');
              if (searchButton) {
                (searchButton as HTMLElement).click();
              }

              return { success: true, method: `${methodName}_enter_key`, inputIndex: i };
            }
          }
          
          return { success: false, method: `${methodName}_no_accessible_input`, inputCount: searchInputs.length };
        }, businessQuery, strategy.selector, strategy.method);

        log.push(`Search strategy ${strategyIndex + 1}: ${searchResult.success ? 'Success' : 'Failed'} - Method: ${searchResult.method}, Input: ${searchResult.inputIndex !== undefined ? searchResult.inputIndex : 'N/A'}`);

        if (searchResult.success) {
          // Extended wait for search processing
          await new Promise(resolve => setTimeout(resolve, 3000));
          return true;
        }

      } catch (error) {
        log.push(`Search strategy ${strategyIndex + 1} error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }

      // Brief delay between strategies
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    log.push('All comprehensive search strategies exhausted');
    return false;
  }

  private performComprehensiveBusinessMatching(businesses: any[], searchQuery: string, log: string[]): any {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    log.push(`Performing comprehensive business matching for: "${normalizedQuery}" against ${businesses.length} businesses`);

    // Strategy 1: Exact match
    let match = businesses.find(business => {
      const normalizedName = business.companyName.toLowerCase();
      return normalizedName === normalizedQuery;
    });

    if (match) {
      log.push(`Exact match found: ${match.companyName}`);
      return match;
    }

    // Strategy 2: Substring match
    match = businesses.find(business => {
      const normalizedName = business.companyName.toLowerCase();
      return normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName);
    });

    if (match) {
      log.push(`Substring match found: ${match.companyName}`);
      return match;
    }

    // Strategy 3: Word-based matching
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
    log.push(`Word-based matching with ${queryWords.length} words: ${queryWords.join(', ')}`);

    match = businesses.find(business => {
      const businessWords = business.companyName.toLowerCase().split(/\s+/);
      const matchingWords = queryWords.filter(queryWord => 
        businessWords.some(businessWord => 
          businessWord.includes(queryWord) || 
          queryWord.includes(businessWord) ||
          this.calculateWordSimilarity(businessWord, queryWord) > 0.85
        )
      );
      
      const matchRatio = matchingWords.length / Math.max(queryWords.length, 1);
      return matchRatio >= 0.6; // 60% word match threshold
    });

    if (match) {
      log.push(`Word-based match found: ${match.companyName}`);
      return match;
    }

    // Strategy 4: Fuzzy string matching
    const fuzzyMatches = businesses.map(business => ({
      business,
      similarity: this.calculateStringSimilarity(business.companyName.toLowerCase(), normalizedQuery)
    })).filter(item => item.similarity > 0.7).sort((a, b) => b.similarity - a.similarity);

    if (fuzzyMatches.length > 0) {
      log.push(`Fuzzy match found: ${fuzzyMatches[0].business.companyName} (similarity: ${fuzzyMatches[0].similarity.toFixed(3)})`);
      return fuzzyMatches[0].business;
    }

    log.push('No matching business found with comprehensive algorithms');
    return null;
  }

  private calculateWordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1;
    if (word1.length === 0 || word2.length === 0) return 0;

    const maxLength = Math.max(word1.length, word2.length);
    const distance = this.calculateLevenshteinDistance(word1, word2);
    return (maxLength - distance) / maxLength;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/).filter(word => word.length > 2);
    const words2 = str2.split(/\s+/).filter(word => word.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (const word1 of words1) {
      let bestMatch = 0;
      for (const word2 of words2) {
        const similarity = this.calculateWordSimilarity(word1, word2);
        bestMatch = Math.max(bestMatch, similarity);
      }
      totalSimilarity += bestMatch;
      comparisons++;
    }

    return totalSimilarity / comparisons;
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

export const supplyNationEnhancedSessionTiming = new SupplyNationEnhancedSessionTiming();