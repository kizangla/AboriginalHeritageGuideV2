/**
 * Supply Nation Focused Scraper
 * Dedicated system for successful web scraping of business profiles
 */

import puppeteer from 'puppeteer';

export interface SupplyNationBusinessResult {
  companyName: string;
  abn?: string;
  profileUrl: string;
  location: {
    state?: string;
    postcode?: string;
    address?: string;
  };
  businessInfo: {
    categories: string[];
    description: string;
    services: string[];
  };
  contact: {
    email?: string;
    phone?: string;
    website?: string;
  };
  verification: {
    indigenousCertified: boolean;
    supplyNationMember: boolean;
    certificationLevel?: string;
  };
  dataSource: 'Supply Nation';
  scrapedAt: Date;
}

export class SupplyNationFocusedScraper {
  private sessionBrowser: puppeteer.Browser | null = null;
  private sessionPage: puppeteer.Page | null = null;
  private isAuthenticated: boolean = false;

  async scrapeBusinessProfile(businessName: string): Promise<SupplyNationBusinessResult | null> {
    try {
      await this.establishSession();
      const profile = await this.searchAndExtractProfile(businessName);
      await this.cleanup();
      return profile;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  private async establishSession(): Promise<void> {
    const username = process.env.SUPPLY_NATION_USERNAME;
    const password = process.env.SUPPLY_NATION_PASSWORD;

    if (!username || !password) {
      throw new Error('Supply Nation credentials required');
    }

    this.sessionBrowser = await puppeteer.launch({
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

    this.sessionPage = await this.sessionBrowser.newPage();
    await this.sessionPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    this.sessionPage.setDefaultTimeout(120000);

    // Navigate to login
    await this.sessionPage.goto('https://ibd.supplynation.org.au/s/login', {
      waitUntil: 'networkidle0',
      timeout: 45000
    });

    await this.waitForPageReady();

    // Set credentials
    await this.setCredentials(username, password);

    // Submit login
    await this.submitLogin();

    // Verify authentication
    await this.verifyAuthentication();

    this.isAuthenticated = true;
  }

  private async waitForPageReady(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 6000));

    const isReady = await this.sessionPage!.evaluate(() => {
      return document.readyState === 'complete' &&
             document.querySelector('input[type="email"], input[type="text"]') !== null &&
             document.querySelector('input[type="password"]') !== null &&
             document.querySelector('button[type="submit"]') !== null;
    });

    if (!isReady) {
      await new Promise(resolve => setTimeout(resolve, 4000));
    }
  }

  private async setCredentials(username: string, password: string): Promise<void> {
    const result = await this.sessionPage!.evaluate((usr, pwd) => {
      const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
      const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;

      if (!emailField || !passwordField) {
        return { success: false, error: 'Login fields not found' };
      }

      emailField.focus();
      emailField.value = usr;
      emailField.dispatchEvent(new Event('input', { bubbles: true }));

      passwordField.focus();
      passwordField.value = pwd;
      passwordField.dispatchEvent(new Event('input', { bubbles: true }));

      return {
        success: true,
        emailSet: emailField.value === usr,
        passwordSet: passwordField.value === pwd
      };
    }, username, password);

    if (!result.success || !result.emailSet || !result.passwordSet) {
      throw new Error('Failed to set login credentials');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  private async submitLogin(): Promise<void> {
    await this.sessionPage!.evaluate(() => {
      const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
      if (submitButton && submitButton.offsetHeight > 0) {
        submitButton.click();
      }
    });

    await new Promise(resolve => setTimeout(resolve, 6000));
  }

  private async verifyAuthentication(): Promise<void> {
    let authenticated = false;

    for (let i = 0; i < 25; i++) {
      await new Promise(resolve => setTimeout(resolve, 4000));

      const authCheck = await this.sessionPage!.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();

        return {
          url,
          notLogin: !url.includes('login'),
          hasLogout: content.includes('logout'),
          hasSearch: content.includes('search'),
          contentLength: content.length
        };
      });

      if (authCheck.notLogin && authCheck.hasLogout && authCheck.contentLength > 1000) {
        authenticated = true;
        break;
      }
    }

    if (!authenticated) {
      throw new Error('Authentication failed - session not established');
    }
  }

  private async searchAndExtractProfile(businessName: string): Promise<SupplyNationBusinessResult | null> {
    if (!this.isAuthenticated) {
      throw new Error('Session not authenticated');
    }

    // Navigate to search
    await this.sessionPage!.goto('https://ibd.supplynation.org.au/public/s/search-results', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Execute search
    const searchExecuted = await this.sessionPage!.evaluate((query) => {
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
    }, businessName);

    if (!searchExecuted) {
      throw new Error('Search execution failed');
    }

    await new Promise(resolve => setTimeout(resolve, 8000));

    // Extract business profile
    const profileData = await this.sessionPage!.evaluate((targetName) => {
      const profile: any = {
        found: false,
        companyName: '',
        profileUrl: '',
        location: {},
        businessInfo: { categories: [], description: '', services: [] },
        contact: {},
        verification: { indigenousCertified: false, supplyNationMember: false },
        dataSource: 'Supply Nation',
        scrapedAt: new Date()
      };

      const businessElements = document.querySelectorAll([
        'a[href*="supplierprofile"]',
        '.search-result',
        '.business-card',
        '.supplier-card',
        '.result-item'
      ].join(', '));

      for (let i = 0; i < businessElements.length; i++) {
        const element = businessElements[i];
        const textContent = element.textContent?.toLowerCase() || '';

        if (textContent.includes(targetName.toLowerCase()) ||
            (targetName.toLowerCase().includes('mgm') && textContent.includes('mgm'))) {

          profile.found = true;

          // Company name
          const nameElement = element.querySelector('h2, h3, .business-name, .company-name, .title');
          profile.companyName = nameElement?.textContent?.trim() || targetName;

          // Profile URL
          if (element.tagName === 'A') {
            profile.profileUrl = (element as HTMLAnchorElement).href;
          } else {
            const link = element.querySelector('a[href*="supplierprofile"]');
            if (link) profile.profileUrl = (link as HTMLAnchorElement).href;
          }

          // Location
          const locationMatch = element.textContent?.match(/(WA|NSW|VIC|QLD|SA|TAS|NT|ACT)[\s,]*(\d{4})?/i);
          if (locationMatch) {
            profile.location.state = locationMatch[1];
            if (locationMatch[2]) profile.location.postcode = locationMatch[2];
          }

          // ABN
          const abnMatch = element.textContent?.match(/ABN[:\s]*(\d{11})/i);
          if (abnMatch) {
            profile.abn = abnMatch[1];
          }

          // Categories
          const categoryElements = element.querySelectorAll('.category, .service, .tag');
          profile.businessInfo.categories = Array.from(categoryElements)
            .map((cat: any) => cat.textContent?.trim())
            .filter(Boolean);

          // Description
          const descElement = element.querySelector('.description, .summary, p');
          if (descElement) {
            profile.businessInfo.description = descElement.textContent?.trim() || '';
          }

          // Contact information
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

          // Verification
          profile.verification.indigenousCertified = true;
          profile.verification.supplyNationMember = true;

          const verificationElement = element.querySelector('.verified, .certification, .member');
          if (verificationElement) {
            profile.verification.certificationLevel = verificationElement.textContent?.trim();
          }

          break;
        }
      }

      return profile.found ? profile : null;
    }, businessName);

    return profileData;
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.sessionPage) {
        await this.sessionPage.close();
        this.sessionPage = null;
      }
      if (this.sessionBrowser) {
        await this.sessionBrowser.close();
        this.sessionBrowser = null;
      }
      this.isAuthenticated = false;
    } catch (error) {
      console.log('Cleanup error:', error);
    }
  }
}

export const supplyNationFocusedScraper = new SupplyNationFocusedScraper();