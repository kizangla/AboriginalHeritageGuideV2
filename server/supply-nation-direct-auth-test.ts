/**
 * Direct Supply Nation Authentication Test
 * Streamlined authentication verification with detailed logging
 */

import puppeteer from 'puppeteer';

export class SupplyNationDirectAuthTest {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async testDirectAuthentication(): Promise<{
    success: boolean;
    stage: string;
    details: string;
    error?: string;
  }> {
    try {
      console.log('Starting direct Supply Nation authentication test...');

      // Initialize browser
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

      console.log('Browser initialized, navigating to Supply Nation...');

      // Navigate to login page
      const response = await this.page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 25000
      });

      if (!response || response.status() !== 200) {
        await this.cleanup();
        return {
          success: false,
          stage: 'navigation',
          details: `HTTP ${response?.status() || 'unknown'}`,
          error: 'Failed to access Supply Nation login page'
        };
      }

      console.log('Login page accessed successfully');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for form elements
      const formElements = await this.page.evaluate(() => {
        const emailInputs = document.querySelectorAll('input[type="email"], input[type="text"]');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        
        return {
          emailCount: emailInputs.length,
          passwordCount: passwordInputs.length,
          submitCount: submitButtons.length,
          pageTitle: document.title,
          currentUrl: window.location.href
        };
      });

      console.log('Form analysis:', formElements);

      if (formElements.emailCount === 0 || formElements.passwordCount === 0) {
        await this.cleanup();
        return {
          success: false,
          stage: 'form_detection',
          details: `Found ${formElements.emailCount} email fields, ${formElements.passwordCount} password fields`,
          error: 'Login form not properly detected'
        };
      }

      // Test credential input
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        await this.cleanup();
        return {
          success: false,
          stage: 'credentials',
          details: 'Missing credentials',
          error: 'Supply Nation credentials not available'
        };
      }

      console.log('Filling credentials...');

      // Fill username
      const usernameInput = await this.page.$('input[type="email"], input[type="text"]');
      if (usernameInput) {
        await usernameInput.click();
        await usernameInput.type(username, { delay: 100 });
        console.log('Username filled');
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Fill password
      const passwordInput = await this.page.$('input[type="password"]');
      if (passwordInput) {
        await passwordInput.click();
        await passwordInput.type(password, { delay: 100 });
        console.log('Password filled');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Submit form
      console.log('Submitting form...');
      const submitButton = await this.page.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      } else {
        await this.page.keyboard.press('Enter');
      }

      // Monitor authentication result
      console.log('Monitoring authentication result...');
      
      try {
        await Promise.race([
          this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }),
          this.page.waitForSelector('.error, .alert, .message', { timeout: 15000 }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 20000))
        ]);
      } catch (waitError) {
        console.log('Navigation/response timeout');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check final state
      const finalState = await this.page.evaluate(() => {
        const currentUrl = window.location.href;
        const pageTitle = document.title;
        const errorElements = document.querySelectorAll('.error, .alert, .message, .notification');
        const errors = Array.from(errorElements).map(el => el.textContent?.trim()).filter(Boolean);
        
        return {
          currentUrl,
          pageTitle,
          errors,
          isOnLoginPage: currentUrl.includes('/login'),
          bodyText: document.body.textContent?.substring(0, 500)
        };
      });

      console.log('Final state:', finalState);

      await this.cleanup();

      if (!finalState.isOnLoginPage && finalState.currentUrl.includes('supplynation.org.au')) {
        return {
          success: true,
          stage: 'authentication_complete',
          details: `Successfully authenticated, redirected to ${finalState.currentUrl}`
        };
      } else if (finalState.errors.length > 0) {
        return {
          success: false,
          stage: 'authentication_failed',
          details: finalState.errors.join(', '),
          error: 'Authentication rejected by Supply Nation'
        };
      } else {
        return {
          success: false,
          stage: 'authentication_timeout',
          details: 'No clear authentication response received',
          error: 'Authentication process incomplete'
        };
      }

    } catch (error) {
      await this.cleanup();
      return {
        success: false,
        stage: 'error',
        details: (error as Error).message,
        error: 'Test execution failed'
      };
    }
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    } catch (error) {
      console.error('Cleanup error:', (error as Error).message);
    }
  }
}

export const supplyNationDirectAuthTest = new SupplyNationDirectAuthTest();