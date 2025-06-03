/**
 * Supply Nation Real-Time Authentication
 * Live session monitoring and data extraction system
 */

import puppeteer from 'puppeteer';

export interface SupplyNationAuthResult {
  authenticated: boolean;
  sessionEstablished: boolean;
  businessFound: boolean;
  businessProfile?: {
    companyName: string;
    abn?: string;
    profileUrl: string;
    location: {
      state?: string;
      postcode?: string;
    };
    indigenousDetails: {
      verified: boolean;
      certificationLevel?: string;
      membershipStatus: string;
    };
    businessCapabilities: {
      categories: string[];
      services: string[];
      description: string;
    };
    contactInformation: {
      email?: string;
      phone?: string;
      website?: string;
    };
    dataSource: 'Supply Nation';
    extractedAt: Date;
  };
  authenticationLog: string[];
  executionTime: number;
}

export class SupplyNationRealTimeAuth {
  private authLog: string[] = [];
  private startTime: number = 0;

  async authenticateAndRetrieve(businessName: string): Promise<SupplyNationAuthResult> {
    this.startTime = Date.now();
    this.authLog = [];
    
    const credentials = {
      username: process.env.SUPPLY_NATION_USERNAME,
      password: process.env.SUPPLY_NATION_PASSWORD
    };

    if (!credentials.username || !credentials.password) {
      throw new Error('Supply Nation login credentials required for authentication');
    }

    let browser = null;
    let page = null;

    try {
      this.log('Initializing browser session...');
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      page.setDefaultTimeout(180000);

      // Phase 1: Login Page Access
      this.log('Accessing Supply Nation login page...');
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      await this.stabilizePage(page);

      // Phase 2: Credential Authentication
      this.log('Setting authentication credentials...');
      const credentialsSet = await this.setCredentials(page, credentials.username, credentials.password);
      
      if (!credentialsSet) {
        await browser.close();
        return this.buildFailureResult('Failed to set authentication credentials');
      }

      // Phase 3: Form Submission
      this.log('Submitting authentication form...');
      await this.submitAuthenticationForm(page);

      // Phase 4: Authentication Monitoring
      this.log('Monitoring authentication process...');
      const authResult = await this.monitorAuthentication(page);
      
      if (!authResult.authenticated) {
        await browser.close();
        return this.buildFailureResult('Authentication failed - session not established');
      }

      this.log('Authentication successful - session established');

      // Phase 5: Business Search
      this.log(`Searching for ${businessName} in Supply Nation directory...`);
      const businessProfile = await this.searchAndExtractBusiness(page, businessName);

      await browser.close();

      return {
        authenticated: true,
        sessionEstablished: true,
        businessFound: businessProfile !== null,
        businessProfile,
        authenticationLog: this.authLog,
        executionTime: Date.now() - this.startTime
      };

    } catch (error) {
      if (browser) await browser.close();
      this.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.buildFailureResult(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async stabilizePage(page: puppeteer.Page): Promise<void> {
    const stabilizationPhases = [4000, 7000, 10000];
    
    for (const delay of stabilizationPhases) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const pageReady = await page.evaluate(() => {
        return document.readyState === 'complete' &&
               document.querySelector('input[type="email"], input[type="text"]') !== null &&
               document.querySelector('input[type="password"]') !== null &&
               document.body.innerText.length > 200;
      });

      if (pageReady) {
        this.log('Page stabilized - login form detected');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return;
      }
    }
    
    this.log('Page stabilization completed with extended timing');
  }

  private async setCredentials(page: puppeteer.Page, username: string, password: string): Promise<boolean> {
    const maxAttempts = 8;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await page.evaluate((usr, pwd) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

          if (!emailField || !passwordField) {
            return { success: false, error: 'Login fields not accessible' };
          }

          if (emailField.offsetHeight === 0 || passwordField.offsetHeight === 0) {
            return { success: false, error: 'Login fields not visible' };
          }

          emailField.focus();
          emailField.value = usr;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));

          passwordField.focus();
          passwordField.value = pwd;
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));

          return {
            success: true,
            emailSet: emailField.value === usr,
            passwordSet: passwordField.value === pwd
          };
        }, username, password);

        if (result.success && result.emailSet && result.passwordSet) {
          this.log(`Credentials set successfully (attempt ${attempt})`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return true;
        }

        this.log(`Credential attempt ${attempt} failed: ${result.error || 'Validation failed'}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        this.log(`Credential attempt ${attempt} error: ${error}`);
      }
    }

    return false;
  }

  private async submitAuthenticationForm(page: puppeteer.Page): Promise<void> {
    const submissionMethods = [
      async () => {
        return await page.evaluate(() => {
          const form = document.querySelector('form');
          if (form) {
            form.submit();
            return { success: true, method: 'form.submit()' };
          }
          return { success: false };
        });
      },

      async () => {
        return await page.evaluate(() => {
          const button = document.querySelector('button[type="submit"]') as HTMLElement;
          if (button && button.offsetHeight > 0) {
            button.click();
            return { success: true, method: 'submit button click' };
          }
          return { success: false };
        });
      },

      async () => {
        return await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, [role="button"]');
          for (const btn of Array.from(buttons)) {
            const element = btn as HTMLElement;
            if (element.offsetHeight > 0) {
              element.click();
              return { success: true, method: 'generic button click' };
            }
          }
          return { success: false };
        });
      }
    ];

    for (const method of submissionMethods) {
      try {
        const result = await method();
        if (result.success) {
          this.log(`Form submitted using: ${result.method}`);
          await new Promise(resolve => setTimeout(resolve, 8000));
          break;
        }
      } catch (error) {
        this.log(`Submission method failed: ${error}`);
      }
    }
  }

  private async monitorAuthentication(page: puppeteer.Page): Promise<{ authenticated: boolean }> {
    const maxMonitoringTime = 180000; // 3 minutes
    const checkInterval = 5000;
    const startTime = Date.now();
    let redirectCount = 0;
    let previousUrl = await page.url();

    while ((Date.now() - startTime) < maxMonitoringTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      const currentUrl = await page.url();
      
      if (currentUrl !== previousUrl) {
        redirectCount++;
        this.log(`Redirect ${redirectCount}: ${currentUrl.substring(0, 80)}...`);
        previousUrl = currentUrl;
      }

      const authStatus = await page.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();

        return {
          url,
          urlNotLogin: !url.includes('/s/login'),
          hasLogout: content.includes('logout'),
          hasSearch: content.includes('search'),
          hasDirectory: content.includes('directory'),
          contentLength: content.length
        };
      });

      const authScore = [
        authStatus.urlNotLogin,
        authStatus.hasLogout,
        authStatus.hasSearch
      ].filter(Boolean).length;

      if (authScore >= 2 && authStatus.contentLength > 1000) {
        this.log(`Authentication confirmed - Score: ${authScore}/3, Content: ${authStatus.contentLength} chars`);
        return { authenticated: true };
      }

      // Progress logging every 30 seconds
      if ((Date.now() - startTime) % 30000 === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        this.log(`Authentication monitoring: ${elapsed}s elapsed, score: ${authScore}/3`);
      }
    }

    this.log('Authentication monitoring timeout');
    return { authenticated: false };
  }

  private async searchAndExtractBusiness(page: puppeteer.Page, businessName: string): Promise<any> {
    try {
      // Navigate to search
      await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });

      await new Promise(resolve => setTimeout(resolve, 6000));

      // Execute search
      const searchTerms = [businessName, 'MGM Alliance', 'MGM'];
      
      for (const term of searchTerms) {
        this.log(`Searching for: ${term}`);
        
        const searchExecuted = await page.evaluate((query) => {
          const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;
          
          if (searchInput && searchInput.offsetHeight > 0) {
            searchInput.focus();
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));

            const form = searchInput.closest('form');
            if (form) {
              form.submit();
              return { executed: true };
            }
          }
          return { executed: false };
        }, term);

        if (searchExecuted.executed) {
          await new Promise(resolve => setTimeout(resolve, 10000));

          const businessData = await page.evaluate((targetName) => {
            const businessElements = document.querySelectorAll([
              'a[href*="supplierprofile"]',
              '.search-result',
              '.business-card',
              '.supplier-card'
            ].join(', '));

            for (const element of Array.from(businessElements)) {
              const text = element.textContent?.toLowerCase() || '';
              
              if (text.includes(targetName.toLowerCase()) || 
                  (targetName.toLowerCase().includes('mgm') && text.includes('mgm'))) {
                
                const profile = {
                  companyName: '',
                  profileUrl: '',
                  location: {},
                  indigenousDetails: {
                    verified: true,
                    membershipStatus: 'Supply Nation Member'
                  },
                  businessCapabilities: {
                    categories: [],
                    services: [],
                    description: ''
                  },
                  contactInformation: {},
                  dataSource: 'Supply Nation' as const,
                  extractedAt: new Date()
                };

                // Extract company name
                const nameElement = element.querySelector('h2, h3, .business-name, .company-name');
                profile.companyName = nameElement?.textContent?.trim() || targetName;

                // Extract profile URL
                if (element.tagName === 'A') {
                  profile.profileUrl = (element as HTMLAnchorElement).href;
                } else {
                  const link = element.querySelector('a[href*="supplierprofile"]');
                  if (link) profile.profileUrl = (link as HTMLAnchorElement).href;
                }

                // Extract location
                const locationMatch = element.textContent?.match(/(WA|NSW|VIC|QLD|SA|TAS|NT|ACT)[\s,]*(\d{4})?/i);
                if (locationMatch) {
                  profile.location = {
                    state: locationMatch[1],
                    postcode: locationMatch[2] || undefined
                  };
                }

                // Extract ABN
                const abnMatch = element.textContent?.match(/ABN[:\s]*(\d{11})/i);
                if (abnMatch) {
                  (profile as any).abn = abnMatch[1];
                }

                // Extract categories
                const categoryElements = element.querySelectorAll('.category, .service, .tag');
                profile.businessCapabilities.categories = Array.from(categoryElements)
                  .map(cat => cat.textContent?.trim())
                  .filter(Boolean) as string[];

                // Extract description
                const descElement = element.querySelector('.description, .summary, p');
                if (descElement) {
                  profile.businessCapabilities.description = descElement.textContent?.trim() || '';
                }

                // Extract contact info
                const emailElement = element.querySelector('a[href^="mailto:"]');
                if (emailElement) {
                  (profile.contactInformation as any).email = (emailElement as HTMLAnchorElement).href.replace('mailto:', '');
                }

                const phoneElement = element.querySelector('a[href^="tel:"], .phone');
                if (phoneElement) {
                  (profile.contactInformation as any).phone = phoneElement.textContent?.trim();
                }

                const websiteElement = element.querySelector('a[href^="http"]:not([href*="supplynation.org.au"])');
                if (websiteElement) {
                  (profile.contactInformation as any).website = (websiteElement as HTMLAnchorElement).href;
                }

                return profile;
              }
            }

            return null;
          }, businessName);

          if (businessData) {
            this.log(`Business profile extracted for: ${businessData.companyName}`);
            return businessData;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      this.log('Business not found in Supply Nation directory');
      return null;

    } catch (error) {
      this.log(`Search error: ${error}`);
      return null;
    }
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString().substring(11, 19);
    this.authLog.push(`[${timestamp}] ${message}`);
  }

  private buildFailureResult(error: string): SupplyNationAuthResult {
    return {
      authenticated: false,
      sessionEstablished: false,
      businessFound: false,
      authenticationLog: this.authLog,
      executionTime: Date.now() - this.startTime
    };
  }
}

export const supplyNationRealTimeAuth = new SupplyNationRealTimeAuth();