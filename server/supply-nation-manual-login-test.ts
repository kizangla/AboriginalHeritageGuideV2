/**
 * Supply Nation Manual Login Verification
 * Tests account status and identifies authentication requirements
 */

import puppeteer from 'puppeteer';

export interface ManualLoginResult {
  success: boolean;
  accountStatus: 'active' | 'needs_verification' | 'requires_2fa' | 'suspended' | 'unknown';
  authenticationMethod: 'standard' | 'sso' | '2fa_required' | 'unknown';
  pageDetails: {
    title: string;
    url: string;
    hasLoginForm: boolean;
    errorMessages: string[];
    requiredFields: string[];
    authenticationIndicators: string[];
  };
  recommendations: string[];
  message: string;
}

export class SupplyNationManualLoginTest {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async verifyAccountStatus(): Promise<ManualLoginResult> {
    try {
      // Initialize browser for manual testing
      this.browser = await puppeteer.launch({
        headless: false, // Use visible browser for manual verification
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--start-maximized'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1366, height: 768 });

      // Navigate to Supply Nation login
      console.log('Navigating to Supply Nation login page...');
      const response = await this.page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 20000
      });

      if (!response || response.status() !== 200) {
        await this.cleanup();
        return {
          success: false,
          accountStatus: 'unknown',
          authenticationMethod: 'unknown',
          pageDetails: {
            title: '',
            url: '',
            hasLoginForm: false,
            errorMessages: ['Failed to access login page'],
            requiredFields: [],
            authenticationIndicators: []
          },
          recommendations: ['Check Supply Nation website availability'],
          message: 'Cannot access Supply Nation login page'
        };
      }

      // Wait for page to fully load
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Analyze page structure and authentication requirements
      const pageAnalysis = await this.analyzePage();
      
      // Attempt automated credential input for testing
      const credentials = this.getCredentials();
      if (credentials.username && credentials.password) {
        const loginAttempt = await this.attemptLogin(credentials.username, credentials.password);
        
        return {
          success: true,
          accountStatus: loginAttempt.accountStatus,
          authenticationMethod: loginAttempt.authenticationMethod,
          pageDetails: {
            ...pageAnalysis,
            errorMessages: [...pageAnalysis.errorMessages, ...loginAttempt.errorMessages]
          },
          recommendations: loginAttempt.recommendations,
          message: loginAttempt.message
        };
      } else {
        return {
          success: true,
          accountStatus: 'unknown',
          authenticationMethod: 'unknown',
          pageDetails: pageAnalysis,
          recommendations: ['Provide Supply Nation credentials for testing'],
          message: 'Manual verification required - credentials not available'
        };
      }

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        accountStatus: 'unknown',
        authenticationMethod: 'unknown',
        pageDetails: {
          title: '',
          url: '',
          hasLoginForm: false,
          errorMessages: [error instanceof Error ? error.message : 'Unknown error'],
          requiredFields: [],
          authenticationIndicators: []
        },
        recommendations: ['Check network connectivity and try again'],
        message: 'Manual login test failed'
      };
    }
  }

  private async analyzePage(): Promise<{
    title: string;
    url: string;
    hasLoginForm: boolean;
    errorMessages: string[];
    requiredFields: string[];
    authenticationIndicators: string[];
  }> {
    if (!this.page) throw new Error('Page not initialized');

    return await this.page.evaluate(() => {
      const analysis = {
        title: document.title,
        url: window.location.href,
        hasLoginForm: false,
        errorMessages: [] as string[],
        requiredFields: [] as string[],
        authenticationIndicators: [] as string[]
      };

      // Check for login form
      const emailInput = document.querySelector('input[type="email"], input[type="text"]');
      const passwordInput = document.querySelector('input[type="password"]');
      analysis.hasLoginForm = !!(emailInput && passwordInput);

      // Look for error messages
      const errorSelectors = [
        '.error', '.alert-danger', '.slds-has-error', '.error-message',
        '[class*="error"]', '[class*="alert"]', '.message-error'
      ];
      
      errorSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 0) {
            analysis.errorMessages.push(text);
          }
        });
      });

      // Identify required fields
      const requiredInputs = document.querySelectorAll('input[required], input[aria-required="true"]');
      requiredInputs.forEach(input => {
        const placeholder = (input as HTMLInputElement).placeholder;
        const label = (input as HTMLInputElement).labels?.[0]?.textContent;
        const fieldName = placeholder || label || (input as HTMLInputElement).name || 'Unknown field';
        analysis.requiredFields.push(fieldName);
      });

      // Look for authentication indicators
      const pageText = document.body.innerText.toLowerCase();
      const indicators = [
        { pattern: '2fa', indicator: 'Two-factor authentication' },
        { pattern: 'verification', indicator: 'Account verification required' },
        { pattern: 'activate', indicator: 'Account activation needed' },
        { pattern: 'suspended', indicator: 'Account suspended' },
        { pattern: 'sso', indicator: 'Single sign-on required' },
        { pattern: 'forgot password', indicator: 'Password reset available' },
        { pattern: 'contact support', indicator: 'Support contact required' }
      ];

      indicators.forEach(({ pattern, indicator }) => {
        if (pageText.includes(pattern)) {
          analysis.authenticationIndicators.push(indicator);
        }
      });

      return analysis;
    });
  }

  private async attemptLogin(username: string, password: string): Promise<{
    accountStatus: 'active' | 'needs_verification' | 'requires_2fa' | 'suspended' | 'unknown';
    authenticationMethod: 'standard' | 'sso' | '2fa_required' | 'unknown';
    errorMessages: string[];
    recommendations: string[];
    message: string;
  }> {
    if (!this.page) throw new Error('Page not initialized');

    console.log('Attempting login with provided credentials...');

    // Fill credentials
    const credentialsFilled = await this.page.evaluate((usr, pwd) => {
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

    if (!credentialsFilled) {
      return {
        accountStatus: 'unknown',
        authenticationMethod: 'unknown',
        errorMessages: ['Login form fields not accessible'],
        recommendations: ['Check page structure and form elements'],
        message: 'Cannot fill login credentials'
      };
    }

    // Submit form
    const formSubmitted = await this.page.evaluate(() => {
      const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
      if (submitButton) {
        submitButton.click();
        return true;
      }
      return false;
    });

    if (!formSubmitted) {
      return {
        accountStatus: 'unknown',
        authenticationMethod: 'unknown',
        errorMessages: ['Submit button not found'],
        recommendations: ['Check form submission method'],
        message: 'Cannot submit login form'
      };
    }

    // Wait for response and analyze result
    console.log('Waiting for authentication response...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Check for navigation or page changes
    const currentUrl = await this.page.url();
    console.log(`Current URL after login attempt: ${currentUrl}`);

    // Analyze post-login page
    const postLoginAnalysis = await this.page.evaluate(() => {
      const pageText = document.body.innerText.toLowerCase();
      const currentUrl = window.location.href;
      
      const analysis = {
        redirected: !currentUrl.includes('/login'),
        errorMessages: [] as string[],
        authenticationIndicators: [] as string[],
        successIndicators: [] as string[]
      };

      // Look for error messages
      const errorSelectors = [
        '.error', '.alert-danger', '.slds-has-error', '.error-message',
        '[class*="error"]', '[class*="alert"]'
      ];
      
      errorSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 0) {
            analysis.errorMessages.push(text);
          }
        });
      });

      // Check for specific authentication requirements
      if (pageText.includes('verify') || pageText.includes('verification')) {
        analysis.authenticationIndicators.push('Email verification required');
      }
      if (pageText.includes('2fa') || pageText.includes('two-factor')) {
        analysis.authenticationIndicators.push('Two-factor authentication required');
      }
      if (pageText.includes('suspended') || pageText.includes('disabled')) {
        analysis.authenticationIndicators.push('Account suspended or disabled');
      }
      if (pageText.includes('invalid') || pageText.includes('incorrect')) {
        analysis.errorMessages.push('Invalid credentials');
      }

      // Check for success indicators
      const successIndicators = [
        'dashboard', 'profile', 'search', 'logout', 'welcome'
      ];
      
      successIndicators.forEach(indicator => {
        if (pageText.includes(indicator)) {
          analysis.successIndicators.push(indicator);
        }
      });

      return analysis;
    });

    // Determine account status based on analysis
    if (postLoginAnalysis.successIndicators.length > 0 || postLoginAnalysis.redirected) {
      return {
        accountStatus: 'active',
        authenticationMethod: 'standard',
        errorMessages: [],
        recommendations: ['Account is active and accessible'],
        message: 'Login successful - account is active'
      };
    } else if (postLoginAnalysis.authenticationIndicators.some(indicator => 
      indicator.includes('verification'))) {
      return {
        accountStatus: 'needs_verification',
        authenticationMethod: 'unknown',
        errorMessages: postLoginAnalysis.errorMessages,
        recommendations: [
          'Check email for verification link',
          'Complete email verification process',
          'Contact Supply Nation support if needed'
        ],
        message: 'Account requires email verification'
      };
    } else if (postLoginAnalysis.authenticationIndicators.some(indicator => 
      indicator.includes('two-factor'))) {
      return {
        accountStatus: 'requires_2fa',
        authenticationMethod: '2fa_required',
        errorMessages: postLoginAnalysis.errorMessages,
        recommendations: [
          'Complete two-factor authentication setup',
          'Use authenticator app or SMS verification'
        ],
        message: 'Two-factor authentication required'
      };
    } else if (postLoginAnalysis.authenticationIndicators.some(indicator => 
      indicator.includes('suspended'))) {
      return {
        accountStatus: 'suspended',
        authenticationMethod: 'unknown',
        errorMessages: postLoginAnalysis.errorMessages,
        recommendations: [
          'Contact Supply Nation support',
          'Review account terms and conditions'
        ],
        message: 'Account appears to be suspended'
      };
    } else {
      return {
        accountStatus: 'unknown',
        authenticationMethod: 'unknown',
        errorMessages: postLoginAnalysis.errorMessages,
        recommendations: [
          'Verify credentials are correct',
          'Try manual login through web browser',
          'Contact Supply Nation support'
        ],
        message: 'Login status unclear - manual verification recommended'
      };
    }
  }

  private getCredentials(): { username?: string; password?: string } {
    return {
      username: process.env.SUPPLY_NATION_USERNAME,
      password: process.env.SUPPLY_NATION_PASSWORD
    };
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
}

export const supplyNationManualLoginTest = new SupplyNationManualLoginTest();