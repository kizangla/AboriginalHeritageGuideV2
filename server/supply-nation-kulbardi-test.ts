/**
 * Supply Nation Kulbardi Search Test
 * Focused test for Kulbardi business verification
 */

import puppeteer from 'puppeteer';

export interface KulbardiSearchResult {
  searchExecuted: boolean;
  businessFound: boolean;
  executionTime: number;
  authenticationStatus: {
    loginAccessed: boolean;
    credentialsEntered: boolean;
    formSubmitted: boolean;
    redirectsDetected: number;
  };
  kulbardiData?: {
    businessName: string;
    profileUrl: string;
    verified: boolean;
  };
  searchLog: string[];
  status: string;
}

export class SupplyNationKulbardiTest {
  
  async searchKulbardi(): Promise<KulbardiSearchResult> {
    const startTime = Date.now();
    const authenticationStatus = {
      loginAccessed: false,
      credentialsEntered: false,
      formSubmitted: false,
      redirectsDetected: 0
    };
    const searchLog: string[] = [];
    
    let browser = null;

    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        return {
          searchExecuted: false,
          businessFound: false,
          executionTime: Date.now() - startTime,
          authenticationStatus,
          searchLog: ['Supply Nation credentials not available'],
          status: 'Credentials required for Kulbardi search'
        };
      }

      searchLog.push('Initiating Kulbardi search in Supply Nation directory');

      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Login page access
      searchLog.push('Accessing Supply Nation login page');
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      authenticationStatus.loginAccessed = true;
      searchLog.push('Login page loaded successfully');

      // Wait for page stabilization
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Enter credentials
      searchLog.push('Entering authentication credentials');
      const credentialsEntered = await page.evaluate((usr, pwd) => {
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

      authenticationStatus.credentialsEntered = credentialsEntered;
      searchLog.push(`Credentials entered: ${credentialsEntered}`);

      if (!credentialsEntered) {
        await browser.close();
        return {
          searchExecuted: false,
          businessFound: false,
          executionTime: Date.now() - startTime,
          authenticationStatus,
          searchLog,
          status: 'Login form not accessible'
        };
      }

      // Submit form
      searchLog.push('Submitting authentication form');
      const formSubmitted = await page.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
        if (submitButton) {
          submitButton.click();
          return true;
        }
        return false;
      });

      authenticationStatus.formSubmitted = formSubmitted;
      searchLog.push(`Form submitted: ${formSubmitted}`);

      if (!formSubmitted) {
        await browser.close();
        return {
          searchExecuted: false,
          businessFound: false,
          executionTime: Date.now() - startTime,
          authenticationStatus,
          searchLog,
          status: 'Form submission failed'
        };
      }

      // Monitor authentication and search
      searchLog.push('Monitoring authentication response');
      let redirectCount = 0;
      let searchExecuted = false;
      let kulbardiFound = false;
      let kulbardiData;

      // Wait for authentication response and attempt search
      for (let i = 0; i < 8; i++) {
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const currentUrl = await page.url();
        
        if (!currentUrl.includes('login')) {
          redirectCount++;
          searchLog.push(`Redirect detected: ${currentUrl}`);
          
          // Try to navigate to search page
          try {
            await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
              waitUntil: 'domcontentloaded',
              timeout: 15000
            });
            
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Execute Kulbardi search
            searchLog.push('Executing Kulbardi search');
            const searchResult = await page.evaluate(() => {
              const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;
              
              if (searchInput) {
                searchInput.value = 'KULBARDI';
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                
                const form = searchInput.closest('form');
                if (form) {
                  form.submit();
                  return true;
                }
              }
              
              return false;
            });

            if (searchResult) {
              searchExecuted = true;
              searchLog.push('Kulbardi search executed successfully');
              
              // Wait for search results
              await new Promise(resolve => setTimeout(resolve, 4000));

              // Extract Kulbardi results
              const kulbardiResults = await page.evaluate(() => {
                const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
                const kulbardiBusinesses: any[] = [];

                profileLinks.forEach((link) => {
                  const businessName = link.textContent?.trim();
                  const profileUrl = (link as HTMLAnchorElement).href;
                  
                  if (businessName && profileUrl && businessName.toLowerCase().includes('kulbardi')) {
                    kulbardiBusinesses.push({
                      businessName: businessName.trim(),
                      profileUrl,
                      verified: true
                    });
                  }
                });

                return kulbardiBusinesses;
              });

              if (kulbardiResults.length > 0) {
                kulbardiFound = true;
                kulbardiData = kulbardiResults[0];
                searchLog.push(`Kulbardi business found: ${kulbardiData.businessName}`);
              } else {
                searchLog.push('No Kulbardi businesses found in search results');
              }
            } else {
              searchLog.push('Search input not accessible');
            }
            
            break; // Exit loop after search attempt
          } catch (searchError) {
            searchLog.push(`Search navigation error: ${searchError instanceof Error ? searchError.message : 'Unknown'}`);
          }
        }
      }

      authenticationStatus.redirectsDetected = redirectCount;

      await browser.close();

      return {
        searchExecuted,
        businessFound: kulbardiFound,
        executionTime: Date.now() - startTime,
        authenticationStatus,
        kulbardiData,
        searchLog,
        status: kulbardiFound ? 
          'Kulbardi business found and verified' : 
          (searchExecuted ? 'Search executed but Kulbardi not found' : 'Authentication or search access incomplete')
      };

    } catch (error) {
      if (browser) await browser.close();
      
      return {
        searchExecuted: false,
        businessFound: false,
        executionTime: Date.now() - startTime,
        authenticationStatus,
        searchLog: [...searchLog, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        status: 'Kulbardi search test failed'
      };
    }
  }
}

export const supplyNationKulbardiTest = new SupplyNationKulbardiTest();