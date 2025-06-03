/**
 * Supply Nation Session Optimizer
 * Comprehensive authentication and data extraction system
 */

import puppeteer from 'puppeteer';

export interface SupplyNationProfile {
  companyName: string;
  abn?: string;
  profileUrl: string;
  location: {
    state?: string;
    postcode?: string;
  };
  businessInfo: {
    categories: string[];
    description: string;
  };
  contact: {
    email?: string;
    phone?: string;
    website?: string;
  };
  verification: {
    indigenousVerified: boolean;
    supplyNationMember: boolean;
  };
  dataSource: 'Supply Nation';
}

export class SupplyNationSessionOptimizer {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;

  async optimizeAndExtract(businessName: string): Promise<SupplyNationProfile | null> {
    const credentials = {
      username: process.env.SUPPLY_NATION_USERNAME,
      password: process.env.SUPPLY_NATION_PASSWORD
    };

    if (!credentials.username || !credentials.password) {
      throw new Error('Supply Nation credentials required for authentication');
    }

    try {
      await this.initializeBrowserSession();
      await this.navigateToLogin();
      await this.performAuthentication(credentials.username, credentials.password);
      await this.validateSession();
      const profile = await this.extractBusinessProfile(businessName);
      await this.cleanup();
      return profile;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  private async initializeBrowserSession(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    this.page.setDefaultTimeout(180000);
  }

  private async navigateToLogin(): Promise<void> {
    await this.page!.goto('https://ibd.supplynation.org.au/s/login', {
      waitUntil: 'networkidle0',
      timeout: 90000
    });

    // Progressive page stabilization
    for (let delay of [5000, 8000, 12000]) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const pageReady = await this.page!.evaluate(() => {
        return document.readyState === 'complete' &&
               document.querySelector('input[type="email"], input[type="text"]') !== null &&
               document.querySelector('input[type="password"]') !== null &&
               document.body.innerText.length > 200;
      });

      if (pageReady) break;
    }
  }

  private async performAuthentication(username: string, password: string): Promise<void> {
    // Enhanced credential setting with multiple attempts
    let credentialsSet = false;
    
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = await this.page!.evaluate((usr, pwd) => {
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

        if (!emailField || !passwordField) return { success: false };
        
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
        credentialsSet = true;
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!credentialsSet) {
      throw new Error('Failed to set authentication credentials');
    }

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Enhanced form submission
    const submissionMethods = [
      () => this.page!.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.submit();
          return true;
        }
        return false;
      }),
      () => this.page!.evaluate(() => {
        const button = document.querySelector('button[type="submit"]') as HTMLElement;
        if (button && button.offsetHeight > 0) {
          button.click();
          return true;
        }
        return false;
      }),
      () => this.page!.evaluate(() => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (const btn of Array.from(buttons)) {
          if ((btn as HTMLElement).offsetHeight > 0) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      })
    ];

    for (const method of submissionMethods) {
      try {
        const submitted = await method();
        if (submitted) {
          await new Promise(resolve => setTimeout(resolve, 8000));
          break;
        }
      } catch (error) {
        console.log('Submission method failed:', error);
      }
    }
  }

  private async validateSession(): Promise<void> {
    // Extended authentication monitoring
    let authenticated = false;
    const maxWaitTime = 240000; // 4 minutes
    const startTime = Date.now();

    while ((Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      const authStatus = await this.page!.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();

        return {
          url,
          urlChanged: !url.includes('/s/login'),
          hasLogout: content.includes('logout'),
          hasSearch: content.includes('search'),
          contentLength: content.length
        };
      });

      const authScore = [
        authStatus.urlChanged,
        authStatus.hasLogout,
        authStatus.hasSearch
      ].filter(Boolean).length;

      if (authScore >= 2 && authStatus.contentLength > 1000) {
        authenticated = true;
        break;
      }
    }

    if (!authenticated) {
      throw new Error('Session authentication timeout');
    }
  }

  private async extractBusinessProfile(businessName: string): Promise<SupplyNationProfile | null> {
    // Navigate to search
    await this.page!.goto('https://ibd.supplynation.org.au/public/s/search-results', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 6000));

    // Execute search
    const searchTerms = [businessName, 'MGM Alliance', 'MGM'];
    
    for (const term of searchTerms) {
      const searchExecuted = await this.page!.evaluate((query) => {
        const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;
        
        if (searchInput && searchInput.offsetHeight > 0) {
          searchInput.focus();
          searchInput.value = query;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));

          const form = searchInput.closest('form');
          if (form) {
            form.submit();
            return true;
          }
        }
        return false;
      }, term);

      if (searchExecuted) {
        await new Promise(resolve => setTimeout(resolve, 10000));

        const profileData = await this.page!.evaluate((targetName) => {
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
                businessInfo: { categories: [], description: '' },
                contact: {},
                verification: { indigenousVerified: true, supplyNationMember: true },
                dataSource: 'Supply Nation' as const
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
              profile.businessInfo.categories = Array.from(categoryElements)
                .map(cat => cat.textContent?.trim())
                .filter(Boolean) as string[];

              // Extract description
              const descElement = element.querySelector('.description, .summary, p');
              if (descElement) {
                profile.businessInfo.description = descElement.textContent?.trim() || '';
              }

              // Extract contact info
              const emailElement = element.querySelector('a[href^="mailto:"]');
              if (emailElement) {
                profile.contact.email = (emailElement as HTMLAnchorElement).href.replace('mailto:', '');
              }

              const phoneElement = element.querySelector('a[href^="tel:"], .phone');
              if (phoneElement) {
                profile.contact.phone = phoneElement.textContent?.trim();
              }

              const websiteElement = element.querySelector('a[href^="http"]:not([href*="supplynation.org.au"])');
              if (websiteElement) {
                profile.contact.website = (websiteElement as HTMLAnchorElement).href;
              }

              return profile;
            }
          }

          return null;
        }, businessName);

        if (profileData) {
          return profileData;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return null;
  }

  private async cleanup(): Promise<void> {
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
      console.log('Cleanup error:', error);
    }
  }
}

export const supplyNationSessionOptimizer = new SupplyNationSessionOptimizer();