/**
 * Supply Nation Account Diagnostic System
 * Comprehensive authentication testing and account status analysis
 */

import puppeteer from 'puppeteer';

export interface AccountDiagnosticResult {
  accountStatus: 'active' | 'verification_required' | 'two_factor_required' | 'credentials_invalid' | 'account_locked' | 'unknown';
  authenticationFlow: string[];
  errorDetails: string[];
  pageStructure: {
    loginFormDetected: boolean;
    fieldTypes: string[];
    submitMethods: string[];
    securityFeatures: string[];
  };
  recommendations: string[];
  nextSteps: string[];
}

export class SupplyNationAccountDiagnostic {
  
  async diagnoseAccount(): Promise<AccountDiagnosticResult> {
    const username = process.env.SUPPLY_NATION_USERNAME;
    const password = process.env.SUPPLY_NATION_PASSWORD;

    if (!username || !password) {
      return {
        accountStatus: 'unknown',
        authenticationFlow: ['Credentials not provided'],
        errorDetails: ['SUPPLY_NATION_USERNAME and SUPPLY_NATION_PASSWORD required'],
        pageStructure: {
          loginFormDetected: false,
          fieldTypes: [],
          submitMethods: [],
          securityFeatures: []
        },
        recommendations: ['Provide Supply Nation credentials'],
        nextSteps: ['Set environment variables and retry']
      };
    }

    let browser = null;
    let page = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      page = await browser.newPage();
      
      // Set realistic browser characteristics
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      const authenticationFlow: string[] = [];
      const errorDetails: string[] = [];

      // Step 1: Navigate to login page
      authenticationFlow.push('Navigating to Supply Nation login page');
      const response = await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      if (!response || response.status() !== 200) {
        errorDetails.push(`HTTP ${response?.status() || 'unknown'} - Cannot access login page`);
        await browser.close();
        return this.createFailureResult('unknown', authenticationFlow, errorDetails, 'Cannot access Supply Nation website');
      }

      authenticationFlow.push('Login page loaded successfully');

      // Step 2: Analyze page structure
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const pageStructure = await page.evaluate(() => {
        const structure = {
          loginFormDetected: false,
          fieldTypes: [] as string[],
          submitMethods: [] as string[],
          securityFeatures: [] as string[]
        };

        // Detect login form
        const emailInput = document.querySelector('input[type="email"], input[type="text"]');
        const passwordInput = document.querySelector('input[type="password"]');
        structure.loginFormDetected = !!(emailInput && passwordInput);

        // Analyze field types
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
          const type = input.type;
          if (!structure.fieldTypes.includes(type)) {
            structure.fieldTypes.push(type);
          }
        });

        // Analyze submit methods
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        if (submitButtons.length > 0) {
          structure.submitMethods.push('Standard form submission');
        }

        const forms = document.querySelectorAll('form');
        if (forms.length > 0) {
          structure.submitMethods.push('Form element detected');
        }

        // Check for security features
        const pageText = document.body.innerText.toLowerCase();
        if (pageText.includes('captcha')) {
          structure.securityFeatures.push('CAPTCHA protection');
        }
        if (pageText.includes('two-factor') || pageText.includes('2fa')) {
          structure.securityFeatures.push('Two-factor authentication');
        }
        if (pageText.includes('verify') || pageText.includes('verification')) {
          structure.securityFeatures.push('Email verification');
        }

        return structure;
      });

      authenticationFlow.push(`Form analysis: ${pageStructure.loginFormDetected ? 'Login form detected' : 'No login form found'}`);

      if (!pageStructure.loginFormDetected) {
        errorDetails.push('Login form not detected on page');
        await browser.close();
        return this.createFailureResult('unknown', authenticationFlow, errorDetails, 'Login form structure not recognized');
      }

      // Step 3: Attempt credential input
      authenticationFlow.push('Attempting credential input');
      
      const credentialsEntered = await page.evaluate((usr, pwd) => {
        const emailInput = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailInput && passwordInput) {
          emailInput.focus();
          emailInput.value = usr;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));

          passwordInput.focus();
          passwordInput.value = pwd;
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('change', { bubbles: true }));

          return true;
        }
        return false;
      }, username, password);

      if (!credentialsEntered) {
        errorDetails.push('Cannot interact with login form fields');
        await browser.close();
        return this.createFailureResult('unknown', authenticationFlow, errorDetails, 'Form fields not accessible');
      }

      authenticationFlow.push('Credentials entered successfully');

      // Step 4: Submit authentication
      authenticationFlow.push('Submitting authentication request');
      
      const formSubmitted = await page.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
        if (submitButton) {
          submitButton.click();
          return true;
        }

        // Try form submission as fallback
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) {
          form.submit();
          return true;
        }

        return false;
      });

      if (!formSubmitted) {
        errorDetails.push('Cannot submit login form');
        await browser.close();
        return this.createFailureResult('unknown', authenticationFlow, errorDetails, 'Form submission failed');
      }

      authenticationFlow.push('Authentication request submitted');

      // Step 5: Analyze response
      authenticationFlow.push('Waiting for authentication response');
      
      // Wait for page response
      try {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
        authenticationFlow.push('Page navigation detected');
      } catch (navError) {
        authenticationFlow.push('No navigation - analyzing current page');
      }

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Analyze post-authentication state
      const authAnalysis = await page.evaluate(() => {
        const currentUrl = window.location.href;
        const pageText = document.body.innerText.toLowerCase();
        
        const analysis = {
          currentUrl,
          redirected: !currentUrl.includes('/login'),
          errorMessages: [] as string[],
          successIndicators: [] as string[],
          securityRequirements: [] as string[]
        };

        // Look for error messages
        const errorSelectors = ['.error', '.alert-danger', '.slds-has-error', '.error-message'];
        errorSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 0 && !analysis.errorMessages.includes(text)) {
              analysis.errorMessages.push(text);
            }
          });
        });

        // Check for success indicators
        const successKeywords = ['dashboard', 'profile', 'search', 'logout', 'welcome'];
        successKeywords.forEach(keyword => {
          if (pageText.includes(keyword)) {
            analysis.successIndicators.push(keyword);
          }
        });

        // Check for security requirements
        if (pageText.includes('verify') && pageText.includes('email')) {
          analysis.securityRequirements.push('Email verification required');
        }
        if (pageText.includes('two-factor') || pageText.includes('2fa')) {
          analysis.securityRequirements.push('Two-factor authentication required');
        }
        if (pageText.includes('invalid') || pageText.includes('incorrect')) {
          analysis.errorMessages.push('Invalid credentials provided');
        }
        if (pageText.includes('locked') || pageText.includes('suspended')) {
          analysis.securityRequirements.push('Account locked or suspended');
        }

        return analysis;
      });

      authenticationFlow.push(`Response analysis: URL=${authAnalysis.currentUrl}`);

      await browser.close();

      // Determine account status
      return this.analyzeAuthenticationResult(authAnalysis, authenticationFlow, pageStructure);

    } catch (error) {
      if (browser) await browser.close();
      errorDetails.push(error instanceof Error ? error.message : 'Unknown error');
      return this.createFailureResult('unknown', authenticationFlow, errorDetails, 'Diagnostic process failed');
    }
  }

  private analyzeAuthenticationResult(authAnalysis: any, authenticationFlow: string[], pageStructure: any): AccountDiagnosticResult {
    
    if (authAnalysis.successIndicators.length > 0 || (authAnalysis.redirected && !authAnalysis.errorMessages.length)) {
      return {
        accountStatus: 'active',
        authenticationFlow,
        errorDetails: [],
        pageStructure,
        recommendations: [
          'Account is active and accessible',
          'Supply Nation integration ready for business verification'
        ],
        nextSteps: [
          'Proceed with Supply Nation business search and verification',
          'Test GAWUN SUPPLIES PTY LTD verification'
        ]
      };
    }

    if (authAnalysis.securityRequirements.some((req: string) => req.includes('verification'))) {
      return {
        accountStatus: 'verification_required',
        authenticationFlow,
        errorDetails: authAnalysis.errorMessages,
        pageStructure,
        recommendations: [
          'Check email inbox for verification message from Supply Nation',
          'Complete email verification process',
          'Look for emails from noreply@supplynation.org.au or similar'
        ],
        nextSteps: [
          'Verify email address with Supply Nation',
          'Complete account activation process',
          'Retry authentication after verification'
        ]
      };
    }

    if (authAnalysis.securityRequirements.some((req: string) => req.includes('two-factor'))) {
      return {
        accountStatus: 'two_factor_required',
        authenticationFlow,
        errorDetails: authAnalysis.errorMessages,
        pageStructure,
        recommendations: [
          'Set up two-factor authentication',
          'Use authenticator app or SMS verification',
          'Complete 2FA setup in Supply Nation account settings'
        ],
        nextSteps: [
          'Configure two-factor authentication',
          'Update authentication flow to handle 2FA',
          'Test login with 2FA enabled'
        ]
      };
    }

    if (authAnalysis.errorMessages.some((msg: string) => msg.toLowerCase().includes('invalid'))) {
      return {
        accountStatus: 'credentials_invalid',
        authenticationFlow,
        errorDetails: authAnalysis.errorMessages,
        pageStructure,
        recommendations: [
          'Verify username and password are correct',
          'Check for typos in credentials',
          'Try password reset if needed'
        ],
        nextSteps: [
          'Double-check Supply Nation credentials',
          'Reset password if necessary',
          'Contact Supply Nation support if issues persist'
        ]
      };
    }

    if (authAnalysis.securityRequirements.some((req: string) => req.includes('locked') || req.includes('suspended'))) {
      return {
        accountStatus: 'account_locked',
        authenticationFlow,
        errorDetails: authAnalysis.errorMessages,
        pageStructure,
        recommendations: [
          'Contact Supply Nation support immediately',
          'Review account terms and conditions',
          'Provide account details for assistance'
        ],
        nextSteps: [
          'Contact support@supplynation.org.au',
          'Provide account username and issue description',
          'Wait for account status resolution'
        ]
      };
    }

    return {
      accountStatus: 'unknown',
      authenticationFlow,
      errorDetails: authAnalysis.errorMessages,
      pageStructure,
      recommendations: [
        'Manual verification required',
        'Test login through web browser',
        'Contact Supply Nation support for assistance'
      ],
      nextSteps: [
        'Try manual login at https://ibd.supplynation.org.au/s/login',
        'Document any error messages or requirements',
        'Contact Supply Nation support with specific details'
      ]
    };
  }

  private createFailureResult(status: any, flow: string[], errors: string[], message: string): AccountDiagnosticResult {
    return {
      accountStatus: status,
      authenticationFlow: flow,
      errorDetails: errors,
      pageStructure: {
        loginFormDetected: false,
        fieldTypes: [],
        submitMethods: [],
        securityFeatures: []
      },
      recommendations: [message],
      nextSteps: ['Resolve connection issues and retry']
    };
  }
}

export const supplyNationAccountDiagnostic = new SupplyNationAccountDiagnostic();