/**
 * Supply Nation MGM Alliance Retriever
 * Specialized system for retrieving MGM Alliance business profile
 */

import puppeteer from 'puppeteer';

export interface MGMAllianceProfile {
  companyName: string;
  abn?: string;
  location: {
    state?: string;
    postcode?: string;
    fullAddress?: string;
  };
  businessDetails: {
    established?: string;
    employeeCount?: string;
    annualTurnover?: string;
    businessType?: string;
  };
  indigenousVerification: {
    ownership?: string;
    certified: boolean;
    memberSince?: string;
    certificationLevel?: string;
  };
  services: {
    categories?: string[];
    capabilities?: string[];
    industries?: string[];
  };
  contact: {
    email?: string;
    phone?: string;
    website?: string;
    primaryContact?: string;
  };
  profileUrl?: string;
  description?: string;
  projects?: string[];
  certifications?: string[];
  dataSource: 'Supply Nation';
  lastUpdated: Date;
}

export class SupplyNationMGMRetriever {
  private maxRetries = 3;
  private timeoutDuration = 180000; // 3 minutes

  async retrieveMGMAllianceProfile(): Promise<MGMAllianceProfile | null> {
    const credentials = {
      username: process.env.SUPPLY_NATION_USERNAME,
      password: process.env.SUPPLY_NATION_PASSWORD
    };

    if (!credentials.username || !credentials.password) {
      throw new Error('Supply Nation credentials required for MGM Alliance profile retrieval');
    }

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`MGM Alliance retrieval attempt ${attempt}/${this.maxRetries}`);
        const profile = await this.executeMGMSearch(credentials, attempt);
        if (profile) return profile;
      } catch (error) {
        console.log(`Attempt ${attempt} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        if (attempt === this.maxRetries) throw error;
      }
    }

    return null;
  }

  private async executeMGMSearch(credentials: any, attempt: number): Promise<MGMAllianceProfile | null> {
    let browser = null;
    let page = null;

    try {
      // Initialize browser with attempt-specific optimizations
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
          '--no-first-run'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      // Set extended timeouts
      page.setDefaultTimeout(this.timeoutDuration);
      page.setDefaultNavigationTimeout(this.timeoutDuration);

      // Navigate to login with comprehensive waiting
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      // Multi-phase stabilization based on attempt
      const stabilizationDelay = 4000 + (attempt * 2000);
      await new Promise(resolve => setTimeout(resolve, stabilizationDelay));

      // Advanced credential setting with multiple validation phases
      const credentialsResult = await this.setCredentialsWithAdvancedValidation(page, credentials, attempt);
      if (!credentialsResult.success) {
        throw new Error(`Credential setting failed: ${credentialsResult.issue}`);
      }

      // Enhanced form submission with attempt-specific timing
      const submissionResult = await this.submitFormWithAdvancedMonitoring(page, attempt);
      if (!submissionResult.success) {
        throw new Error(`Form submission failed: ${submissionResult.issue}`);
      }

      // Comprehensive authentication monitoring
      const authResult = await this.monitorAuthenticationWithDetailedLogging(page, attempt);
      if (!authResult.authenticated) {
        throw new Error(`Authentication failed: ${authResult.message}`);
      }

      // Navigate to search with enhanced error handling
      const searchNavigationResult = await this.navigateToSearchWithValidation(page);
      if (!searchNavigationResult.success) {
        throw new Error(`Search navigation failed: ${searchNavigationResult.issue}`);
      }

      // Execute MGM Alliance search with multiple strategies
      const searchResult = await this.performMGMAllianceSearch(page, attempt);
      if (!searchResult.success) {
        throw new Error(`MGM search failed: ${searchResult.issue}`);
      }

      // Extract comprehensive MGM Alliance profile data
      const profileData = await this.extractMGMAllianceProfile(page);
      
      await browser.close();
      return profileData;

    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }

  private async setCredentialsWithAdvancedValidation(page: puppeteer.Page, credentials: any, attempt: number): Promise<{
    success: boolean;
    issue?: string;
  }> {
    const maxAttempts = 8 + (attempt * 2);

    for (let credAttempt = 1; credAttempt <= maxAttempts; credAttempt++) {
      try {
        const result = await page.evaluate((usr, pwd, attemptNum) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

          if (!emailField || !passwordField) {
            return { success: false, issue: 'Form fields not found' };
          }

          if (emailField.offsetHeight === 0 || passwordField.offsetHeight === 0) {
            return { success: false, issue: 'Form fields not visible' };
          }

          // Enhanced field interaction
          emailField.value = '';
          passwordField.value = '';

          emailField.focus();
          emailField.click();
          emailField.value = usr;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));
          emailField.dispatchEvent(new Event('blur', { bubbles: true }));

          setTimeout(() => {
            passwordField.focus();
            passwordField.click();
            passwordField.value = pwd;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
            passwordField.dispatchEvent(new Event('blur', { bubbles: true }));
          }, 500 + (attemptNum * 200));

          return {
            success: true,
            emailSet: emailField.value === usr,
            passwordSet: passwordField.value === pwd,
            emailLength: emailField.value.length,
            passwordLength: passwordField.value.length
          };
        }, credentials.username, credentials.password, attempt);

        if (result.success && result.emailSet && result.passwordSet) {
          const validationDelay = 2000 + (attempt * 1000);
          await new Promise(resolve => setTimeout(resolve, validationDelay));
          return { success: true };
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.log(`Credential attempt ${credAttempt} error:`, error);
      }
    }

    return { success: false, issue: 'Failed to set credentials after multiple attempts' };
  }

  private async submitFormWithAdvancedMonitoring(page: puppeteer.Page, attempt: number): Promise<{
    success: boolean;
    issue?: string;
  }> {
    const maxAttempts = 6;

    for (let submitAttempt = 1; submitAttempt <= maxAttempts; submitAttempt++) {
      try {
        const result = await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;

          if (!submitButton) {
            return { success: false, issue: 'Submit button not found' };
          }

          if (submitButton.offsetHeight === 0) {
            return { success: false, issue: 'Submit button not visible' };
          }

          if (submitButton.hasAttribute('disabled')) {
            return { success: false, issue: 'Submit button disabled' };
          }

          submitButton.focus();
          submitButton.click();

          // Enhanced form submission
          const form = submitButton.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true }));
          }

          return { success: true };
        });

        if (result.success) {
          const processingDelay = 5000 + (attempt * 1000);
          await new Promise(resolve => setTimeout(resolve, processingDelay));
          return { success: true };
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.log(`Form submission attempt ${submitAttempt} error:`, error);
      }
    }

    return { success: false, issue: 'Form submission failed after multiple attempts' };
  }

  private async monitorAuthenticationWithDetailedLogging(page: puppeteer.Page, attempt: number): Promise<{
    authenticated: boolean;
    message: string;
  }> {
    const maxMonitoringTime = 90000 + (attempt * 30000); // Extended monitoring for later attempts
    const checkInterval = 3000;
    const monitoringStart = Date.now();

    let previousUrl = await page.url();
    let redirectCount = 0;

    while ((Date.now() - monitoringStart) < maxMonitoringTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      const currentUrl = await page.url();

      if (currentUrl !== previousUrl) {
        redirectCount++;
        console.log(`Redirect ${redirectCount}: ${currentUrl}`);
        previousUrl = currentUrl;
      }

      const authCheck = await page.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();

        const successIndicators = [
          !url.includes('login'),
          url.includes('Communities') || url.includes('communities'),
          url.includes('search-results') || url.includes('search'),
          content.includes('search'),
          content.includes('directory'),
          content.includes('logout'),
          document.querySelector('a[href*="logout"]') !== null,
          document.querySelector('.user-menu, .profile-menu') !== null
        ];

        return {
          currentUrl: url,
          successCount: successIndicators.filter(Boolean).length,
          contentLength: content.length,
          hasLogout: content.includes('logout'),
          hasSearch: content.includes('search')
        };
      });

      // Enhanced success criteria
      if (authCheck.successCount >= 4 && authCheck.hasLogout) {
        return {
          authenticated: true,
          message: `Authentication successful after ${Date.now() - monitoringStart}ms with ${redirectCount} redirects`
        };
      }

      // Progress logging
      if ((Date.now() - monitoringStart) % 15000 === 0) {
        console.log(`Auth monitoring: ${Math.floor((Date.now() - monitoringStart) / 1000)}s, ${authCheck.successCount} indicators`);
      }
    }

    return {
      authenticated: false,
      message: `Authentication timeout after ${Date.now() - monitoringStart}ms with ${redirectCount} redirects`
    };
  }

  private async navigateToSearchWithValidation(page: puppeteer.Page): Promise<{
    success: boolean;
    issue?: string;
  }> {
    try {
      await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 4000));

      const validationResult = await page.evaluate(() => {
        return {
          hasSearchForm: document.querySelector('input[type="search"], form') !== null,
          authenticated: !window.location.href.includes('login'),
          pageLoaded: document.body.innerText.length > 1000
        };
      });

      if (validationResult.hasSearchForm && validationResult.authenticated && validationResult.pageLoaded) {
        return { success: true };
      } else {
        return { success: false, issue: 'Search page validation failed' };
      }

    } catch (error) {
      return { success: false, issue: `Navigation error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
  }

  private async performMGMAllianceSearch(page: puppeteer.Page, attempt: number): Promise<{
    success: boolean;
    issue?: string;
  }> {
    const searchTerms = ['MGM Alliance', 'MGM', 'Alliance'];

    for (const term of searchTerms) {
      try {
        const searchExecuted = await page.evaluate((searchTerm) => {
          const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;

          if (searchInput && searchInput.offsetHeight > 0) {
            searchInput.focus();
            searchInput.value = searchTerm;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));

            const form = searchInput.closest('form');
            if (form) {
              form.submit();
              return true;
            }

            const searchButton = document.querySelector('button[type="submit"], button[class*="search"]');
            if (searchButton) {
              (searchButton as HTMLElement).click();
              return true;
            }
          }
          return false;
        }, term);

        if (searchExecuted) {
          await new Promise(resolve => setTimeout(resolve, 6000 + (attempt * 1000)));

          const hasResults = await page.evaluate(() => {
            const businessElements = document.querySelectorAll('a[href*="supplierprofile"], .search-result, .business-card');
            return businessElements.length > 0;
          });

          if (hasResults) {
            return { success: true };
          }
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`Search attempt for "${term}" failed:`, error);
      }
    }

    return { success: false, issue: 'No search results found for MGM Alliance variants' };
  }

  private async extractMGMAllianceProfile(page: puppeteer.Page): Promise<MGMAllianceProfile | null> {
    try {
      const profileData = await page.evaluate(() => {
        const mgmProfile: any = {
          companyName: '',
          location: {},
          businessDetails: {},
          indigenousVerification: { certified: false },
          services: {},
          contact: {},
          dataSource: 'Supply Nation',
          lastUpdated: new Date()
        };

        // Search for MGM Alliance specific elements
        const businessElements = document.querySelectorAll('a[href*="supplierprofile"], .search-result, .business-card, .supplier-card');

        for (const element of businessElements) {
          const textContent = element.textContent?.toLowerCase() || '';
          const innerHTML = element.innerHTML.toLowerCase();

          if (textContent.includes('mgm') && (textContent.includes('alliance') || innerHTML.includes('alliance'))) {
            // Extract company name
            const nameElement = element.querySelector('h2, h3, .business-name, .company-name') || element;
            mgmProfile.companyName = nameElement.textContent?.trim() || 'MGM Alliance';

            // Profile URL
            if (element.tagName === 'A') {
              mgmProfile.profileUrl = (element as HTMLAnchorElement).href;
            } else {
              const link = element.querySelector('a[href*="supplierprofile"]');
              if (link) mgmProfile.profileUrl = (link as HTMLAnchorElement).href;
            }

            // Location extraction
            const locationPattern = /(WA|NSW|VIC|QLD|SA|TAS|NT|ACT)[\s,]*(\d{4})?/i;
            const locationMatch = element.textContent?.match(locationPattern);
            if (locationMatch) {
              mgmProfile.location.state = locationMatch[1];
              if (locationMatch[2]) mgmProfile.location.postcode = locationMatch[2];
            }

            // ABN extraction
            const abnPattern = /ABN[:\s]*(\d{11})/i;
            const abnMatch = element.textContent?.match(abnPattern);
            if (abnMatch) {
              mgmProfile.abn = abnMatch[1];
            }

            // Categories
            const categoryElements = element.querySelectorAll('.category, .service, .tag');
            if (categoryElements.length > 0) {
              mgmProfile.services.categories = Array.from(categoryElements)
                .map(cat => cat.textContent?.trim())
                .filter(Boolean);
            }

            // Description
            const descElement = element.querySelector('.description, .summary, p');
            if (descElement) {
              mgmProfile.description = descElement.textContent?.trim();
            }

            // Contact information
            const emailElement = element.querySelector('a[href^="mailto:"]');
            if (emailElement) {
              mgmProfile.contact.email = (emailElement as HTMLAnchorElement).href.replace('mailto:', '');
            }

            const phoneElement = element.querySelector('a[href^="tel:"], .phone');
            if (phoneElement) {
              mgmProfile.contact.phone = phoneElement.textContent?.trim();
            }

            const websiteElement = element.querySelector('a[href^="http"]:not([href*="supplynation.org.au"])');
            if (websiteElement) {
              mgmProfile.contact.website = (websiteElement as HTMLAnchorElement).href;
            }

            // Indigenous verification
            mgmProfile.indigenousVerification.certified = true;
            const verificationElement = element.querySelector('.verified, .certification, .member');
            if (verificationElement) {
              mgmProfile.indigenousVerification.certificationLevel = verificationElement.textContent?.trim();
            }

            break;
          }
        }

        return mgmProfile.companyName ? mgmProfile : null;
      });

      return profileData;

    } catch (error) {
      console.log('Profile extraction error:', error);
      return null;
    }
  }
}

export const supplyNationMGMRetriever = new SupplyNationMGMRetriever();