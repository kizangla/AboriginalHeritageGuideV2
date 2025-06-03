/**
 * Supply Nation Streamlined Connection
 * Focused authentication flow with essential timing capture
 */

import puppeteer from 'puppeteer';

export interface StreamlinedConnectionResult {
  connected: boolean;
  businessFound: boolean;
  executionTime: number;
  authenticationFlow: {
    loginPageAccessed: boolean;
    credentialsEntered: boolean;
    formSubmitted: boolean;
    redirectsDetected: number;
    finalUrl: string;
  };
  businessData?: {
    name: string;
    profile: string;
    verified: boolean;
  };
  connectionLog: string[];
  status: string;
}

export class SupplyNationStreamlinedConnection {
  
  async testConnection(businessQuery: string = 'GAWUN SUPPLIES'): Promise<StreamlinedConnectionResult> {
    const startTime = Date.now();
    const authenticationFlow = {
      loginPageAccessed: false,
      credentialsEntered: false,
      formSubmitted: false,
      redirectsDetected: 0,
      finalUrl: ''
    };
    const connectionLog: string[] = [];
    
    let browser = null;

    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        return {
          connected: false,
          businessFound: false,
          executionTime: Date.now() - startTime,
          authenticationFlow,
          connectionLog: ['Supply Nation credentials not configured'],
          status: 'Credentials required'
        };
      }

      connectionLog.push(`Testing connection for business: ${businessQuery}`);

      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Step 1: Access login page
      connectionLog.push('Accessing Supply Nation login page');
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      authenticationFlow.loginPageAccessed = true;
      authenticationFlow.finalUrl = await page.url();
      connectionLog.push(`Login page accessed: ${authenticationFlow.finalUrl}`);

      // Wait for page stabilization
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 2: Enter credentials
      connectionLog.push('Entering authentication credentials');
      const credentialsSet = await page.evaluate((usr, pwd) => {
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailField && passwordField) {
          emailField.value = usr;
          passwordField.value = pwd;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      }, username, password);

      authenticationFlow.credentialsEntered = credentialsSet;
      connectionLog.push(`Credentials entered: ${credentialsSet}`);

      if (!credentialsSet) {
        await browser.close();
        return {
          connected: false,
          businessFound: false,
          executionTime: Date.now() - startTime,
          authenticationFlow,
          connectionLog,
          status: 'Login form not accessible'
        };
      }

      // Step 3: Submit authentication
      connectionLog.push('Submitting authentication form');
      const formSubmitted = await page.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
        if (submitButton) {
          submitButton.click();
          return true;
        }
        return false;
      });

      authenticationFlow.formSubmitted = formSubmitted;
      connectionLog.push(`Form submitted: ${formSubmitted}`);

      if (!formSubmitted) {
        await browser.close();
        return {
          connected: false,
          businessFound: false,
          executionTime: Date.now() - startTime,
          authenticationFlow,
          connectionLog,
          status: 'Form submission failed'
        };
      }

      // Step 4: Monitor authentication result
      connectionLog.push('Monitoring authentication response');
      const initialUrl = await page.url();
      let redirectCount = 0;
      
      // Wait and monitor for changes
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const currentUrl = await page.url();
        if (currentUrl !== initialUrl) {
          redirectCount++;
          connectionLog.push(`Redirect ${redirectCount}: ${currentUrl}`);
          
          // Check for authentication success indicators
          const authStatus = await page.evaluate(() => {
            const url = window.location.href;
            const content = document.body.innerText.toLowerCase();
            
            return {
              url,
              hasSearch: content.includes('search'),
              hasDirectory: content.includes('directory'),
              hasLogout: document.querySelector('a[href*="logout"]') !== null,
              authenticated: !url.includes('login') && url.includes('supplynation.org.au')
            };
          });

          if (authStatus.authenticated && (authStatus.hasSearch || authStatus.hasDirectory || authStatus.hasLogout)) {
            authenticationFlow.redirectsDetected = redirectCount;
            authenticationFlow.finalUrl = currentUrl;
            connectionLog.push('Authentication successful - session established');

            // Test business search
            const businessResult = await this.testBusinessSearch(page, businessQuery, connectionLog);
            
            await browser.close();
            return {
              connected: true,
              businessFound: businessResult.found,
              executionTime: Date.now() - startTime,
              authenticationFlow,
              businessData: businessResult.data,
              connectionLog,
              status: businessResult.found ? 
                'Connection and business verification successful' : 
                'Connection successful, business not found'
            };
          }
          
          break; // Exit loop after first redirect
        }
      }

      authenticationFlow.redirectsDetected = redirectCount;
      authenticationFlow.finalUrl = await page.url();

      await browser.close();

      return {
        connected: redirectCount > 0,
        businessFound: false,
        executionTime: Date.now() - startTime,
        authenticationFlow,
        connectionLog,
        status: redirectCount > 0 ? 
          'Authentication initiated but session establishment incomplete' : 
          'No authentication response detected'
      };

    } catch (error) {
      if (browser) await browser.close();
      
      return {
        connected: false,
        businessFound: false,
        executionTime: Date.now() - startTime,
        authenticationFlow,
        connectionLog: [...connectionLog, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        status: 'Connection test failed'
      };
    }
  }

  private async testBusinessSearch(page: puppeteer.Page, businessQuery: string, log: string[]): Promise<{
    found: boolean;
    data?: { name: string; profile: string; verified: boolean };
  }> {
    try {
      log.push(`Testing business search for: ${businessQuery}`);

      // Navigate to search if not already there
      const currentUrl = await page.url();
      if (!currentUrl.includes('search')) {
        await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Execute search
      const searchExecuted = await page.evaluate((query) => {
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

      if (!searchExecuted) {
        log.push('Search input not accessible');
        return { found: false };
      }

      // Wait for results
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Extract results
      const searchResults = await page.evaluate(() => {
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
        const businesses: any[] = [];

        profileLinks.forEach((link) => {
          const name = link.textContent?.trim();
          const profile = (link as HTMLAnchorElement).href;
          
          if (name && profile) {
            businesses.push({
              name: name.trim(),
              profile,
              verified: true
            });
          }
        });

        return businesses;
      });

      log.push(`Found ${searchResults.length} businesses in search results`);

      // Find matching business
      const match = searchResults.find(business => 
        business.name.toLowerCase().includes(businessQuery.toLowerCase()) ||
        businessQuery.toLowerCase().includes(business.name.toLowerCase())
      );

      if (match) {
        log.push(`Matching business found: ${match.name}`);
        return { found: true, data: match };
      } else {
        log.push('No matching business found');
        return { found: false };
      }

    } catch (error) {
      log.push(`Business search error: ${error instanceof Error ? error.message : 'Unknown'}`);
      return { found: false };
    }
  }
}

export const supplyNationStreamlinedConnection = new SupplyNationStreamlinedConnection();