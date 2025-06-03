/**
 * Supply Nation Comprehensive Session Manager
 * Advanced multi-phase authentication for MGM Alliance profile retrieval
 */

import puppeteer from 'puppeteer';

export interface SupplyNationBusinessProfile {
  companyName: string;
  abn?: string;
  profileUrl?: string;
  location: {
    state?: string;
    postcode?: string;
    fullAddress?: string;
  };
  indigenousVerification: {
    certified: boolean;
    ownership?: string;
    memberSince?: string;
    certificationLevel?: string;
  };
  businessCapabilities: {
    categories?: string[];
    services?: string[];
    industries?: string[];
    keyCapabilities?: string[];
  };
  contactInformation: {
    email?: string;
    phone?: string;
    website?: string;
    primaryContact?: string;
  };
  businessDetails: {
    established?: string;
    employeeCount?: string;
    annualTurnover?: string;
    businessType?: string;
  };
  projectExperience?: string[];
  certifications?: string[];
  description?: string;
  dataSource: 'Supply Nation';
  retrievalTimestamp: Date;
}

export class SupplyNationComprehensiveSession {
  private sessionBrowser: puppeteer.Browser | null = null;
  private sessionPage: puppeteer.Page | null = null;
  private sessionActive: boolean = false;

  async retrieveBusinessProfile(businessName: string): Promise<SupplyNationBusinessProfile | null> {
    const credentials = this.validateCredentials();
    if (!credentials.valid) {
      throw new Error('Supply Nation credentials required for business profile retrieval');
    }

    try {
      await this.establishComprehensiveSession(credentials.username, credentials.password);
      const profile = await this.searchAndExtractBusinessProfile(businessName);
      await this.cleanupSession();
      return profile;
    } catch (error) {
      await this.cleanupSession();
      throw error;
    }
  }

  private validateCredentials(): { valid: boolean; username?: string; password?: string } {
    const username = process.env.SUPPLY_NATION_USERNAME;
    const password = process.env.SUPPLY_NATION_PASSWORD;
    
    if (!username || !password) {
      return { valid: false };
    }
    
    return { valid: true, username, password };
  }

  private async establishComprehensiveSession(username: string, password: string): Promise<void> {
    console.log('Initializing Supply Nation comprehensive session...');

    this.sessionBrowser = await puppeteer.launch({
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
        '--no-first-run',
        '--disable-default-apps'
      ]
    });

    this.sessionPage = await this.sessionBrowser.newPage();
    await this.sessionPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await this.sessionPage.setViewport({ width: 1366, height: 768 });

    // Extended timeouts for comprehensive session
    this.sessionPage.setDefaultTimeout(240000); // 4 minutes
    this.sessionPage.setDefaultNavigationTimeout(240000);

    await this.performAuthenticationSequence(username, password);
    this.sessionActive = true;
    console.log('Supply Nation session established successfully');
  }

  private async performAuthenticationSequence(username: string, password: string): Promise<void> {
    console.log('Navigating to Supply Nation login...');
    await this.sessionPage!.goto('https://ibd.supplynation.org.au/s/login', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Multi-phase page stabilization
    await this.waitForPageStabilization();

    console.log('Setting authentication credentials...');
    const credentialsResult = await this.setCredentialsWithValidation(username, password);
    if (!credentialsResult.success) {
      throw new Error(`Credential setting failed: ${credentialsResult.error}`);
    }

    console.log('Submitting authentication form...');
    const submissionResult = await this.submitAuthenticationForm();
    if (!submissionResult.success) {
      throw new Error(`Form submission failed: ${submissionResult.error}`);
    }

    console.log('Monitoring authentication flow...');
    const authResult = await this.monitorAuthenticationFlow();
    if (!authResult.authenticated) {
      throw new Error(`Authentication failed: ${authResult.message}`);
    }

    console.log('Validating session access...');
    const sessionResult = await this.validateSessionAccess();
    if (!sessionResult.valid) {
      throw new Error(`Session validation failed: ${sessionResult.error}`);
    }
  }

  private async waitForPageStabilization(): Promise<void> {
    const stabilizationPhases = [3000, 5000, 7000, 9000];
    
    for (const delay of stabilizationPhases) {
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const pageState = await this.sessionPage!.evaluate(() => {
        return {
          documentReady: document.readyState === 'complete',
          formPresent: document.querySelector('form') !== null,
          emailField: document.querySelector('input[type="email"], input[type="text"]') !== null,
          passwordField: document.querySelector('input[type="password"]') !== null,
          submitButton: document.querySelector('button[type="submit"]') !== null,
          pageLoaded: document.body.innerText.length > 1000,
          noErrors: !document.body.innerText.toLowerCase().includes('error')
        };
      });

      if (pageState.documentReady && 
          pageState.formPresent && 
          pageState.emailField && 
          pageState.passwordField && 
          pageState.submitButton &&
          pageState.pageLoaded &&
          pageState.noErrors) {
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        return;
      }
    }
  }

  private async setCredentialsWithValidation(username: string, password: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    const maxAttempts = 10;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.sessionPage!.evaluate((usr, pwd) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

          if (!emailField || !passwordField) {
            return { success: false, error: 'Authentication fields not found' };
          }

          if (emailField.offsetHeight === 0 || passwordField.offsetHeight === 0) {
            return { success: false, error: 'Authentication fields not visible' };
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
          }, 600);

          return {
            success: true,
            emailSet: emailField.value === usr,
            passwordSet: passwordField.value === pwd
          };
        }, username, password);

        if (result.success && result.emailSet && result.passwordSet) {
          await new Promise(resolve => setTimeout(resolve, 3000));
          return { success: true };
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`Credential attempt ${attempt} error:`, error);
      }
    }

    return { success: false, error: 'Failed to set credentials after multiple attempts' };
  }

  private async submitAuthenticationForm(): Promise<{
    success: boolean;
    error?: string;
  }> {
    const maxAttempts = 6;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.sessionPage!.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;

          if (!submitButton) {
            return { success: false, error: 'Submit button not found' };
          }

          if (submitButton.offsetHeight === 0) {
            return { success: false, error: 'Submit button not visible' };
          }

          if (submitButton.hasAttribute('disabled')) {
            return { success: false, error: 'Submit button disabled' };
          }

          submitButton.focus();
          submitButton.click();

          const form = submitButton.closest('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true }));
          }

          return { success: true };
        });

        if (result.success) {
          await new Promise(resolve => setTimeout(resolve, 8000));
          return { success: true };
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`Form submission attempt ${attempt} error:`, error);
      }
    }

    return { success: false, error: 'Form submission failed after multiple attempts' };
  }

  private async monitorAuthenticationFlow(): Promise<{
    authenticated: boolean;
    message: string;
  }> {
    const maxMonitoringTime = 150000; // 2.5 minutes
    const checkInterval = 4000;
    const monitoringStart = Date.now();

    let previousUrl = await this.sessionPage!.url();
    let redirectCount = 0;

    while ((Date.now() - monitoringStart) < maxMonitoringTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));

      const currentUrl = await this.sessionPage!.url();

      if (currentUrl !== previousUrl) {
        redirectCount++;
        console.log(`Authentication redirect ${redirectCount}: ${currentUrl}`);
        previousUrl = currentUrl;
      }

      const authCheck = await this.sessionPage!.evaluate(() => {
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

      if (authCheck.successCount >= 5 && authCheck.hasLogout) {
        return {
          authenticated: true,
          message: `Authentication successful after ${Date.now() - monitoringStart}ms with ${redirectCount} redirects`
        };
      }

      if ((Date.now() - monitoringStart) % 30000 === 0) {
        console.log(`Authentication progress: ${Math.floor((Date.now() - monitoringStart) / 1000)}s, ${authCheck.successCount} indicators`);
      }
    }

    return {
      authenticated: false,
      message: `Authentication timeout after ${Date.now() - monitoringStart}ms with ${redirectCount} redirects`
    };
  }

  private async validateSessionAccess(): Promise<{
    valid: boolean;
    error?: string;
  }> {
    try {
      await this.sessionPage!.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 5000));

      const validationResult = await this.sessionPage!.evaluate(() => {
        return {
          hasSearchForm: document.querySelector('input[type="search"], form') !== null,
          authenticated: !window.location.href.includes('login'),
          pageLoaded: document.body.innerText.length > 1000,
          hasDirectory: document.body.innerText.toLowerCase().includes('directory')
        };
      });

      if (validationResult.hasSearchForm && 
          validationResult.authenticated && 
          validationResult.pageLoaded) {
        return { valid: true };
      } else {
        return { valid: false, error: 'Session validation failed - search functionality not accessible' };
      }

    } catch (error) {
      return { valid: false, error: `Session validation error: ${error instanceof Error ? error.message : 'Unknown'}` };
    }
  }

  private async searchAndExtractBusinessProfile(businessName: string): Promise<SupplyNationBusinessProfile | null> {
    console.log(`Searching for ${businessName} in Supply Nation directory...`);

    const searchTerms = [businessName, 'MGM', 'Alliance'];

    for (const term of searchTerms) {
      try {
        const searchExecuted = await this.sessionPage!.evaluate((searchTerm) => {
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
          await new Promise(resolve => setTimeout(resolve, 8000));

          const profileData = await this.extractBusinessProfileData(businessName);
          if (profileData) {
            console.log(`Business profile found for ${businessName}`);
            return profileData;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (error) {
        console.log(`Search attempt for "${term}" failed:`, error);
      }
    }

    console.log(`No Supply Nation profile found for ${businessName}`);
    return null;
  }

  private async extractBusinessProfileData(targetBusinessName: string): Promise<SupplyNationBusinessProfile | null> {
    try {
      const profileData = await this.sessionPage!.evaluate((businessName) => {
        const profile: any = {
          companyName: '',
          location: {},
          indigenousVerification: { certified: false },
          businessCapabilities: {},
          contactInformation: {},
          businessDetails: {},
          projectExperience: [],
          certifications: [],
          dataSource: 'Supply Nation',
          retrievalTimestamp: new Date()
        };

        const businessElements = document.querySelectorAll('a[href*="supplierprofile"], .search-result, .business-card, .supplier-card, .listing-item');

        for (const element of businessElements) {
          const textContent = element.textContent?.toLowerCase() || '';
          const innerHTML = element.innerHTML.toLowerCase();

          if (textContent.includes('mgm') && (textContent.includes('alliance') || innerHTML.includes('alliance'))) {
            // Extract company name
            const nameElement = element.querySelector('h2, h3, .business-name, .company-name') || element;
            profile.companyName = nameElement.textContent?.trim() || 'MGM Alliance';

            // Profile URL
            if (element.tagName === 'A') {
              profile.profileUrl = (element as HTMLAnchorElement).href;
            } else {
              const link = element.querySelector('a[href*="supplierprofile"]');
              if (link) profile.profileUrl = (link as HTMLAnchorElement).href;
            }

            // Location extraction
            const locationPattern = /(WA|NSW|VIC|QLD|SA|TAS|NT|ACT)[\s,]*(\d{4})?/i;
            const locationMatch = element.textContent?.match(locationPattern);
            if (locationMatch) {
              profile.location.state = locationMatch[1];
              if (locationMatch[2]) profile.location.postcode = locationMatch[2];
            }

            // ABN extraction
            const abnPattern = /ABN[:\s]*(\d{11})/i;
            const abnMatch = element.textContent?.match(abnPattern);
            if (abnMatch) {
              profile.abn = abnMatch[1];
            }

            // Categories and capabilities
            const categoryElements = element.querySelectorAll('.category, .service, .tag, .industry');
            if (categoryElements.length > 0) {
              profile.businessCapabilities.categories = Array.from(categoryElements)
                .map((cat: any) => cat.textContent?.trim())
                .filter(Boolean);
            }

            // Description
            const descElement = element.querySelector('.description, .summary, p');
            if (descElement) {
              profile.description = descElement.textContent?.trim();
            }

            // Contact information
            const emailElement = element.querySelector('a[href^="mailto:"]');
            if (emailElement) {
              profile.contactInformation.email = (emailElement as HTMLAnchorElement).href.replace('mailto:', '');
            }

            const phoneElement = element.querySelector('a[href^="tel:"], .phone');
            if (phoneElement) {
              profile.contactInformation.phone = phoneElement.textContent?.trim();
            }

            const websiteElement = element.querySelector('a[href^="http"]:not([href*="supplynation.org.au"])');
            if (websiteElement) {
              profile.contactInformation.website = (websiteElement as HTMLAnchorElement).href;
            }

            // Indigenous verification
            profile.indigenousVerification.certified = true;
            const verificationElement = element.querySelector('.verified, .certification, .member');
            if (verificationElement) {
              profile.indigenousVerification.certificationLevel = verificationElement.textContent?.trim();
            }

            // Business details
            const establishedPattern = /established[:\s]*(\d{4})/i;
            const establishedMatch = element.textContent?.match(establishedPattern);
            if (establishedMatch) {
              profile.businessDetails.established = establishedMatch[1];
            }

            const employeePattern = /(\d+)[+\s]*employees?/i;
            const employeeMatch = element.textContent?.match(employeePattern);
            if (employeeMatch) {
              profile.businessDetails.employeeCount = employeeMatch[0];
            }

            return profile.companyName ? profile : null;
          }
        }

        return null;
      }, targetBusinessName);

      return profileData;

    } catch (error) {
      console.log('Profile extraction error:', error);
      return null;
    }
  }

  private async cleanupSession(): Promise<void> {
    try {
      if (this.sessionPage) {
        await this.sessionPage.close();
        this.sessionPage = null;
      }
      if (this.sessionBrowser) {
        await this.sessionBrowser.close();
        this.sessionBrowser = null;
      }
      this.sessionActive = false;
    } catch (error) {
      console.log('Session cleanup error:', error);
    }
  }
}

export const supplyNationComprehensiveSession = new SupplyNationComprehensiveSession();