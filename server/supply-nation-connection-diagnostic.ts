/**
 * Supply Nation Connection Diagnostic
 * Comprehensive authentication flow analysis with detailed timing capture
 */

import puppeteer from 'puppeteer';

export interface ConnectionDiagnostic {
  success: boolean;
  authenticated: boolean;
  businessVerified: boolean;
  diagnosticData: {
    pageLoadSuccess: boolean;
    formAccessible: boolean;
    credentialsAccepted: boolean;
    submissionExecuted: boolean;
    redirectSequence: string[];
    finalDestination: string;
    authenticationIndicators: string[];
    executionTimeMs: number;
  };
  businessResult?: {
    companyName: string;
    profileUrl: string;
    isVerified: boolean;
  };
  diagnosticLog: string[];
  statusMessage: string;
}

export class SupplyNationConnectionDiagnostic {
  
  async executeDiagnostic(businessQuery: string = 'GAWUN SUPPLIES'): Promise<ConnectionDiagnostic> {
    const startTime = Date.now();
    const diagnosticLog: string[] = [];
    const redirectSequence: string[] = [];
    const authenticationIndicators: string[] = [];
    
    let browser = null;
    let page = null;

    try {
      const credentials = {
        username: process.env.SUPPLY_NATION_USERNAME,
        password: process.env.SUPPLY_NATION_PASSWORD
      };

      if (!credentials.username || !credentials.password) {
        return {
          success: false,
          authenticated: false,
          businessVerified: false,
          diagnosticData: {
            pageLoadSuccess: false,
            formAccessible: false,
            credentialsAccepted: false,
            submissionExecuted: false,
            redirectSequence: [],
            finalDestination: '',
            authenticationIndicators: [],
            executionTimeMs: Date.now() - startTime
          },
          diagnosticLog: ['Supply Nation credentials not configured in environment'],
          statusMessage: 'Authentication credentials required for diagnostic'
        };
      }

      diagnosticLog.push(`Diagnostic initiated for business: ${businessQuery}`);
      diagnosticLog.push(`Credentials available: ${credentials.username.length} char username, ${credentials.password.length} char password`);

      // Initialize browser with diagnostic configuration
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      diagnosticLog.push('Browser initialized successfully');

      // Diagnostic Phase 1: Page Load Assessment
      diagnosticLog.push('Phase 1: Assessing login page accessibility');
      
      try {
        await page.goto('https://ibd.supplynation.org.au/s/login', {
          waitUntil: 'domcontentloaded',
          timeout: 25000
        });
        
        const initialUrl = await page.url();
        redirectSequence.push(initialUrl);
        diagnosticLog.push(`Login page loaded successfully: ${initialUrl}`);
        
        // Page stabilization
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        const pageLoadSuccess = true;

        // Diagnostic Phase 2: Form Element Assessment
        diagnosticLog.push('Phase 2: Assessing form element accessibility');
        
        const formAssessment = await page.evaluate(() => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          
          return {
            emailFieldPresent: !!emailField,
            passwordFieldPresent: !!passwordField,
            submitButtonPresent: !!submitButton,
            emailFieldVisible: emailField ? emailField.offsetHeight > 0 : false,
            passwordFieldVisible: passwordField ? passwordField.offsetHeight > 0 : false,
            submitButtonVisible: submitButton ? submitButton.offsetHeight > 0 : false,
            formCount: document.querySelectorAll('form').length,
            inputCount: document.querySelectorAll('input').length
          };
        });

        const formAccessible = formAssessment.emailFieldPresent && 
                              formAssessment.passwordFieldPresent && 
                              formAssessment.submitButtonPresent;

        diagnosticLog.push(`Form assessment: Email=${formAssessment.emailFieldPresent}, Password=${formAssessment.passwordFieldPresent}, Submit=${formAssessment.submitButtonPresent}`);
        diagnosticLog.push(`Visibility check: Email visible=${formAssessment.emailFieldVisible}, Password visible=${formAssessment.passwordFieldVisible}, Submit visible=${formAssessment.submitButtonVisible}`);

        if (!formAccessible) {
          await browser.close();
          return {
            success: false,
            authenticated: false,
            businessVerified: false,
            diagnosticData: {
              pageLoadSuccess,
              formAccessible: false,
              credentialsAccepted: false,
              submissionExecuted: false,
              redirectSequence,
              finalDestination: initialUrl,
              authenticationIndicators,
              executionTimeMs: Date.now() - startTime
            },
            diagnosticLog,
            statusMessage: 'Login form elements not accessible'
          };
        }

        // Diagnostic Phase 3: Credential Input Assessment
        diagnosticLog.push('Phase 3: Assessing credential input process');
        
        const credentialResult = await page.evaluate((username, password) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          if (emailField && passwordField) {
            // Clear and set values
            emailField.value = '';
            passwordField.value = '';
            
            emailField.focus();
            emailField.value = username;
            emailField.dispatchEvent(new Event('input', { bubbles: true }));
            emailField.dispatchEvent(new Event('change', { bubbles: true }));
            
            passwordField.focus();
            passwordField.value = password;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            
            return {
              success: true,
              emailSet: emailField.value === username,
              passwordSet: passwordField.value === password,
              emailLength: emailField.value.length,
              passwordLength: passwordField.value.length
            };
          }
          
          return { success: false, emailSet: false, passwordSet: false, emailLength: 0, passwordLength: 0 };
        }, credentials.username, credentials.password);

        const credentialsAccepted = credentialResult.success && credentialResult.emailSet && credentialResult.passwordSet;

        diagnosticLog.push(`Credential input: Success=${credentialResult.success}, Email set=${credentialResult.emailSet}, Password set=${credentialResult.passwordSet}`);

        if (!credentialsAccepted) {
          await browser.close();
          return {
            success: false,
            authenticated: false,
            businessVerified: false,
            diagnosticData: {
              pageLoadSuccess,
              formAccessible,
              credentialsAccepted: false,
              submissionExecuted: false,
              redirectSequence,
              finalDestination: initialUrl,
              authenticationIndicators,
              executionTimeMs: Date.now() - startTime
            },
            diagnosticLog,
            statusMessage: 'Credential input process failed'
          };
        }

        // Additional stabilization after credential input
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Diagnostic Phase 4: Form Submission Assessment
        diagnosticLog.push('Phase 4: Assessing form submission process');
        
        const submissionResult = await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          
          if (submitButton && !submitButton.hasAttribute('disabled')) {
            submitButton.click();
            return { success: true, buttonClicked: true };
          }
          
          return { success: false, buttonClicked: false };
        });

        const submissionExecuted = submissionResult.success;

        diagnosticLog.push(`Form submission: Success=${submissionResult.success}, Button clicked=${submissionResult.buttonClicked}`);

        if (!submissionExecuted) {
          await browser.close();
          return {
            success: false,
            authenticated: false,
            businessVerified: false,
            diagnosticData: {
              pageLoadSuccess,
              formAccessible,
              credentialsAccepted,
              submissionExecuted: false,
              redirectSequence,
              finalDestination: initialUrl,
              authenticationIndicators,
              executionTimeMs: Date.now() - startTime
            },
            diagnosticLog,
            statusMessage: 'Form submission process failed'
          };
        }

        // Diagnostic Phase 5: Authentication Response Monitoring
        diagnosticLog.push('Phase 5: Monitoring authentication response and redirects');
        
        let currentUrl = initialUrl;
        let redirectCount = 0;
        const maxMonitoringTime = 20000; // 20 seconds
        const checkInterval = 2000; // 2 seconds
        const monitoringStart = Date.now();

        while ((Date.now() - monitoringStart) < maxMonitoringTime) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          
          const newUrl = await page.url();
          
          if (newUrl !== currentUrl) {
            redirectCount++;
            redirectSequence.push(newUrl);
            currentUrl = newUrl;
            diagnosticLog.push(`Redirect ${redirectCount}: ${newUrl}`);

            // Check for authentication indicators
            const authCheck = await page.evaluate(() => {
              const url = window.location.href;
              const content = document.body.innerText.toLowerCase();
              const title = document.title.toLowerCase();
              
              const indicators: string[] = [];
              
              if (!url.includes('login')) indicators.push('not_on_login_page');
              if (url.includes('Communities') || url.includes('communities')) indicators.push('communities_page');
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
                title
              };
            });

            authenticationIndicators.push(...authCheck.indicators);
            
            if (authCheck.indicators.length >= 3) {
              diagnosticLog.push(`Authentication success detected with ${authCheck.indicators.length} indicators: ${authCheck.indicators.join(', ')}`);
              break;
            }
          }
        }

        const finalDestination = await page.url();
        const authenticated = authenticationIndicators.length >= 2;

        diagnosticLog.push(`Authentication monitoring completed: ${redirectCount} redirects, ${authenticationIndicators.length} auth indicators`);

        // Diagnostic Phase 6: Business Search Test (if authenticated)
        let businessResult;
        let businessVerified = false;

        if (authenticated) {
          diagnosticLog.push('Phase 6: Testing business search functionality');
          
          try {
            // Navigate to search page if not already there
            if (!finalDestination.includes('search')) {
              await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
              });
              await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Execute search
            const searchResult = await page.evaluate((query) => {
              const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;
              
              if (searchInput) {
                searchInput.value = query;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                const form = searchInput.closest('form');
                if (form) {
                  form.submit();
                  return true;
                }
              }
              
              return false;
            }, businessQuery);

            if (searchResult) {
              await new Promise(resolve => setTimeout(resolve, 5000));

              // Extract business results
              const businesses = await page.evaluate(() => {
                const links = document.querySelectorAll('a[href*="supplierprofile"]');
                const results: any[] = [];

                links.forEach((link) => {
                  const name = link.textContent?.trim();
                  const url = (link as HTMLAnchorElement).href;
                  
                  if (name && url) {
                    results.push({
                      companyName: name,
                      profileUrl: url,
                      isVerified: true
                    });
                  }
                });

                return results;
              });

              const matchingBusiness = businesses.find(business => 
                business.companyName.toLowerCase().includes(businessQuery.toLowerCase()) ||
                businessQuery.toLowerCase().includes(business.companyName.toLowerCase())
              );

              if (matchingBusiness) {
                businessResult = matchingBusiness;
                businessVerified = true;
                diagnosticLog.push(`Business found: ${matchingBusiness.companyName}`);
              } else {
                diagnosticLog.push(`No matching business found for: ${businessQuery}`);
              }
            } else {
              diagnosticLog.push('Search input not accessible');
            }
          } catch (searchError) {
            diagnosticLog.push(`Business search error: ${searchError instanceof Error ? searchError.message : 'Unknown'}`);
          }
        }

        await browser.close();

        return {
          success: true,
          authenticated,
          businessVerified,
          diagnosticData: {
            pageLoadSuccess,
            formAccessible,
            credentialsAccepted,
            submissionExecuted,
            redirectSequence,
            finalDestination,
            authenticationIndicators,
            executionTimeMs: Date.now() - startTime
          },
          businessResult,
          diagnosticLog,
          statusMessage: authenticated ? 
            (businessVerified ? 'Authentication and business verification successful' : 'Authentication successful, business not found') :
            'Authentication process completed but session not established'
        };

      } catch (pageError) {
        diagnosticLog.push(`Page load error: ${pageError instanceof Error ? pageError.message : 'Unknown error'}`);
        
        if (browser) await browser.close();
        
        return {
          success: false,
          authenticated: false,
          businessVerified: false,
          diagnosticData: {
            pageLoadSuccess: false,
            formAccessible: false,
            credentialsAccepted: false,
            submissionExecuted: false,
            redirectSequence,
            finalDestination: '',
            authenticationIndicators,
            executionTimeMs: Date.now() - startTime
          },
          diagnosticLog,
          statusMessage: 'Page load failed'
        };
      }

    } catch (error) {
      if (browser) await browser.close();
      
      diagnosticLog.push(`Diagnostic error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        success: false,
        authenticated: false,
        businessVerified: false,
        diagnosticData: {
          pageLoadSuccess: false,
          formAccessible: false,
          credentialsAccepted: false,
          submissionExecuted: false,
          redirectSequence,
          finalDestination: '',
          authenticationIndicators,
          executionTimeMs: Date.now() - startTime
        },
        diagnosticLog,
        statusMessage: 'Diagnostic process failed'
      };
    }
  }
}

export const supplyNationConnectionDiagnostic = new SupplyNationConnectionDiagnostic();