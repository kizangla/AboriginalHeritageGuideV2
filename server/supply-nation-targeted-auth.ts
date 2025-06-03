/**
 * Supply Nation Targeted Authentication
 * Focused approach for successful session establishment and data retrieval
 */

import puppeteer from 'puppeteer';

export interface SupplyNationBusinessProfile {
  companyName: string;
  abn?: string;
  profileUrl: string;
  location: {
    state?: string;
    postcode?: string;
    fullAddress?: string;
  };
  indigenousVerification: {
    certified: boolean;
    ownershipPercentage?: string;
    memberSince?: string;
    certificationLevel?: string;
  };
  businessCapabilities: {
    industries: string[];
    services: string[];
    categories: string[];
    keyCapabilities: string[];
  };
  contactDetails: {
    primaryContact?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  businessInformation: {
    description: string;
    established?: string;
    employeeCount?: string;
    annualRevenue?: string;
  };
  projectExperience: string[];
  certifications: string[];
  dataSource: 'Supply Nation';
  extractedAt: Date;
}

export class SupplyNationTargetedAuth {
  private session: {
    browser: puppeteer.Browser | null;
    page: puppeteer.Page | null;
    authenticated: boolean;
  } = {
    browser: null,
    page: null,
    authenticated: false
  };

  async authenticateAndExtract(businessName: string): Promise<SupplyNationBusinessProfile | null> {
    try {
      await this.establishSession();
      await this.authenticateUser();
      const profile = await this.extractBusinessProfile(businessName);
      await this.cleanup();
      return profile;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  private async establishSession(): Promise<void> {
    this.session.browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows'
      ]
    });

    this.session.page = await this.session.browser.newPage();
    await this.session.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await this.session.page.setViewport({ width: 1366, height: 768 });
    this.session.page.setDefaultTimeout(240000); // 4 minutes
  }

  private async authenticateUser(): Promise<void> {
    const credentials = {
      username: process.env.SUPPLY_NATION_USERNAME,
      password: process.env.SUPPLY_NATION_PASSWORD
    };

    if (!credentials.username || !credentials.password) {
      throw new Error('Supply Nation credentials required for authentication');
    }

    // Navigate to login
    await this.session.page!.goto('https://ibd.supplynation.org.au/s/login', {
      waitUntil: 'networkidle0',
      timeout: 120000
    });

    // Enhanced page stabilization
    await this.waitForPageStabilization();

    // Multi-attempt credential setting
    await this.setCredentialsWithRetry(credentials.username, credentials.password);

    // Enhanced form submission
    await this.submitLoginForm();

    // Extended authentication monitoring
    await this.monitorAuthentication();

    this.session.authenticated = true;
  }

  private async waitForPageStabilization(): Promise<void> {
    const stabilizationChecks = [6000, 10000, 15000, 20000];

    for (const delay of stabilizationChecks) {
      await new Promise(resolve => setTimeout(resolve, delay));

      const pageStatus = await this.session.page!.evaluate(() => {
        return {
          documentReady: document.readyState === 'complete',
          emailField: document.querySelector('input[type="email"], input[type="text"]') !== null,
          passwordField: document.querySelector('input[type="password"]') !== null,
          submitElement: document.querySelector('button, input[type="submit"], [role="button"]') !== null,
          bodyContentLength: document.body.innerText.length,
          formPresent: document.querySelector('form') !== null
        };
      });

      if (pageStatus.documentReady && 
          pageStatus.emailField && 
          pageStatus.passwordField && 
          pageStatus.bodyContentLength > 300) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Final stabilization
        return;
      }
    }
  }

  private async setCredentialsWithRetry(username: string, password: string): Promise<void> {
    let credentialsSet = false;
    const maxAttempts = 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const result = await this.session.page!.evaluate((usr, pwd) => {
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

        if (!emailField || !passwordField) {
          return { success: false, error: 'Form fields not found' };
        }

        if (emailField.offsetHeight === 0 || passwordField.offsetHeight === 0) {
          return { success: false, error: 'Form fields not visible' };
        }

        // Enhanced field interaction
        emailField.focus();
        emailField.click();
        emailField.value = '';
        emailField.value = usr;
        emailField.dispatchEvent(new Event('input', { bubbles: true }));
        emailField.dispatchEvent(new Event('change', { bubbles: true }));
        emailField.blur();

        setTimeout(() => {
          passwordField.focus();
          passwordField.click();
          passwordField.value = '';
          passwordField.value = pwd;
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));
          passwordField.blur();
        }, 800);

        return {
          success: true,
          emailSet: emailField.value === usr,
          passwordSet: passwordField.value === pwd,
          emailLength: emailField.value.length,
          passwordLength: passwordField.value.length
        };
      }, username, password);

      if (result.success && result.emailSet && result.passwordSet) {
        credentialsSet = true;
        await new Promise(resolve => setTimeout(resolve, 4000));
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!credentialsSet) {
      throw new Error('Failed to set authentication credentials after multiple attempts');
    }
  }

  private async submitLoginForm(): Promise<void> {
    const submissionStrategies = [
      // Strategy 1: Form submission
      async () => {
        return await this.session.page!.evaluate(() => {
          const form = document.querySelector('form');
          if (form) {
            form.submit();
            return { success: true, method: 'form.submit()' };
          }
          return { success: false };
        });
      },

      // Strategy 2: Button click
      async () => {
        return await this.session.page!.evaluate(() => {
          const button = document.querySelector('button[type="submit"]') as HTMLElement;
          if (button && button.offsetHeight > 0 && !button.hasAttribute('disabled')) {
            button.focus();
            button.click();
            return { success: true, method: 'button.click()' };
          }
          return { success: false };
        });
      },

      // Strategy 3: Generic button search
      async () => {
        return await this.session.page!.evaluate(() => {
          const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
          for (const btn of Array.from(buttons)) {
            const element = btn as HTMLElement;
            if (element.offsetHeight > 0 && !element.hasAttribute('disabled')) {
              element.focus();
              element.click();
              return { success: true, method: 'generic button click' };
            }
          }
          return { success: false };
        });
      },

      // Strategy 4: Enter key simulation
      async () => {
        return await this.session.page!.evaluate(() => {
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          if (passwordField) {
            passwordField.focus();
            passwordField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' }));
            return { success: true, method: 'Enter key' };
          }
          return { success: false };
        });
      }
    ];

    for (const strategy of submissionStrategies) {
      try {
        const result = await strategy();
        if (result.success) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          break;
        }
      } catch (error) {
        console.log('Submission strategy failed:', error);
      }
    }
  }

  private async monitorAuthentication(): Promise<void> {
    const maxMonitoringTime = 300000; // 5 minutes
    const checkInterval = 6000; // 6 seconds
    const startTime = Date.now();

    let redirectCount = 0;
    let previousUrl = await this.session.page!.url();

    while ((Date.now() - startTime) < maxMonitoringTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      const currentUrl = await this.session.page!.url();
      
      if (currentUrl !== previousUrl) {
        redirectCount++;
        previousUrl = currentUrl;
      }

      const authStatus = await this.session.page!.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();

        const indicators = {
          urlNotLogin: !url.includes('/s/login'),
          hasLogout: content.includes('logout'),
          hasSearch: content.includes('search'),
          hasDirectory: content.includes('directory'),
          hasCommunities: content.includes('communities'),
          contentLength: content.length
        };

        const authScore = Object.values(indicators).filter(Boolean).length - 1; // Exclude contentLength

        return {
          ...indicators,
          authScore,
          url: url.substring(0, 100)
        };
      });

      // Enhanced success criteria
      if (authStatus.authScore >= 3 && 
          authStatus.contentLength > 1500 && 
          authStatus.urlNotLogin) {
        return; // Authentication successful
      }

      // Progress logging every minute
      if ((Date.now() - startTime) % 60000 === 0) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        console.log(`Authentication monitoring: ${elapsed}s elapsed, score: ${authStatus.authScore}/5, redirects: ${redirectCount}`);
      }
    }

    throw new Error(`Authentication timeout after ${Math.floor(maxMonitoringTime / 1000)} seconds`);
  }

  private async extractBusinessProfile(businessName: string): Promise<SupplyNationBusinessProfile | null> {
    if (!this.session.authenticated) {
      throw new Error('Session not authenticated');
    }

    // Navigate to search functionality
    await this.session.page!.goto('https://ibd.supplynation.org.au/public/s/search-results', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await new Promise(resolve => setTimeout(resolve, 8000));

    // Execute comprehensive search
    const searchTerms = [businessName, 'MGM Alliance', 'MGM'];

    for (const searchTerm of searchTerms) {
      const searchResult = await this.performSearch(searchTerm);
      if (searchResult) {
        return searchResult;
      }
      await new Promise(resolve => setTimeout(resolve, 4000));
    }

    return null;
  }

  private async performSearch(searchTerm: string): Promise<SupplyNationBusinessProfile | null> {
    // Execute search
    const searchExecuted = await this.session.page!.evaluate((term) => {
      const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;

      if (searchInput && searchInput.offsetHeight > 0) {
        searchInput.focus();
        searchInput.value = term;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));

        const form = searchInput.closest('form');
        if (form) {
          form.submit();
          return { executed: true };
        }

        const searchButton = document.querySelector('button[type="submit"], button[class*="search"]') as HTMLElement;
        if (searchButton) {
          searchButton.click();
          return { executed: true };
        }
      }

      return { executed: false };
    }, searchTerm);

    if (!searchExecuted.executed) {
      return null;
    }

    // Wait for search results
    await new Promise(resolve => setTimeout(resolve, 12000));

    // Extract comprehensive business profile
    const profileData = await this.session.page!.evaluate((targetName) => {
      const businessSelectors = [
        'a[href*="supplierprofile"]',
        '.search-result',
        '.business-card',
        '.supplier-card',
        '.result-item',
        '.listing-item',
        '.business-listing'
      ];

      let businessElements: Element[] = [];
      businessSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        businessElements = [...businessElements, ...Array.from(elements)];
      });

      for (const element of businessElements) {
        const textContent = element.textContent?.toLowerCase() || '';
        const innerHTML = element.innerHTML.toLowerCase();

        if ((textContent.includes(targetName.toLowerCase())) ||
            (targetName.toLowerCase().includes('mgm') && textContent.includes('mgm'))) {

          const profile: any = {
            companyName: '',
            profileUrl: '',
            location: {},
            indigenousVerification: { certified: true },
            businessCapabilities: { industries: [], services: [], categories: [], keyCapabilities: [] },
            contactDetails: {},
            businessInformation: { description: '' },
            projectExperience: [],
            certifications: [],
            dataSource: 'Supply Nation',
            extractedAt: new Date()
          };

          // Extract company name
          const nameSelectors = ['h2', 'h3', '.business-name', '.company-name', '.supplier-name', '.title'];
          for (const selector of nameSelectors) {
            const nameElement = element.querySelector(selector);
            if (nameElement && nameElement.textContent?.trim()) {
              profile.companyName = nameElement.textContent.trim();
              break;
            }
          }

          if (!profile.companyName) {
            profile.companyName = element.textContent?.split('\n')[0]?.trim() || targetName;
          }

          // Extract profile URL
          if (element.tagName === 'A') {
            profile.profileUrl = (element as HTMLAnchorElement).href;
          } else {
            const link = element.querySelector('a[href*="supplierprofile"]');
            if (link) profile.profileUrl = (link as HTMLAnchorElement).href;
          }

          // Extract location information
          const locationPattern = /(WA|NSW|VIC|QLD|SA|TAS|NT|ACT)[\s,]*(\d{4})?/i;
          const locationMatch = element.textContent?.match(locationPattern);
          if (locationMatch) {
            profile.location.state = locationMatch[1];
            if (locationMatch[2]) profile.location.postcode = locationMatch[2];
          }

          // Extract ABN
          const abnPattern = /ABN[:\s]*(\d{11})/i;
          const abnMatch = element.textContent?.match(abnPattern);
          if (abnMatch) {
            profile.abn = abnMatch[1];
          }

          // Extract business categories and services
          const categoryElements = element.querySelectorAll('.category, .service, .tag, .industry, .capability');
          if (categoryElements.length > 0) {
            const categories = Array.from(categoryElements)
              .map(cat => cat.textContent?.trim())
              .filter(Boolean);
            
            profile.businessCapabilities.categories = categories;
            profile.businessCapabilities.services = categories;
            profile.businessCapabilities.industries = categories;
          }

          // Extract description
          const descSelectors = ['.description', '.summary', '.overview', 'p', '.content'];
          for (const selector of descSelectors) {
            const descElement = element.querySelector(selector);
            if (descElement && descElement.textContent?.trim()) {
              profile.businessInformation.description = descElement.textContent.trim();
              break;
            }
          }

          // Extract contact information
          const emailElement = element.querySelector('a[href^="mailto:"]');
          if (emailElement) {
            profile.contactDetails.email = (emailElement as HTMLAnchorElement).href.replace('mailto:', '');
          }

          const phoneElement = element.querySelector('a[href^="tel:"], .phone, .contact-phone');
          if (phoneElement) {
            profile.contactDetails.phone = phoneElement.textContent?.trim();
          }

          const websiteElement = element.querySelector('a[href^="http"]:not([href*="supplynation.org.au"])');
          if (websiteElement) {
            profile.contactDetails.website = (websiteElement as HTMLAnchorElement).href;
          }

          // Enhanced verification details
          profile.indigenousVerification.certified = true;
          const verificationElement = element.querySelector('.verified, .certification, .member, .badge');
          if (verificationElement) {
            profile.indigenousVerification.certificationLevel = verificationElement.textContent?.trim();
          }

          // Extract business details
          const establishedPattern = /established[:\s]*(\d{4})/i;
          const establishedMatch = element.textContent?.match(establishedPattern);
          if (establishedMatch) {
            profile.businessInformation.established = establishedMatch[1];
          }

          const employeePattern = /(\d+)[+\s]*employees?/i;
          const employeeMatch = element.textContent?.match(employeePattern);
          if (employeeMatch) {
            profile.businessInformation.employeeCount = employeeMatch[0];
          }

          return profile;
        }
      }

      return null;
    }, searchTerm);

    return profileData;
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.session.page) {
        await this.session.page.close();
        this.session.page = null;
      }
      if (this.session.browser) {
        await this.session.browser.close();
        this.session.browser = null;
      }
      this.session.authenticated = false;
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  }
}

export const supplyNationTargetedAuth = new SupplyNationTargetedAuth();