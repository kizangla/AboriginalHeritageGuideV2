/**
 * Supply Nation Verified Integration
 * Simplified authentication following confirmed manual login flow
 */

import puppeteer from 'puppeteer';

export interface VerificationResult {
  authenticated: boolean;
  businessFound: boolean;
  businessName?: string;
  verificationStatus: 'verified' | 'not_found' | 'authentication_failed';
  profileUrl?: string;
  message: string;
}

export class SupplyNationVerifiedIntegration {
  
  async verifyBusiness(businessName: string): Promise<VerificationResult> {
    let browser = null;
    let page = null;

    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        return {
          authenticated: false,
          businessFound: false,
          verificationStatus: 'authentication_failed',
          message: 'Supply Nation credentials required for verification'
        };
      }

      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      page = await browser.newPage();

      // Step 1: Navigate to login
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Fill credentials
      await page.evaluate((usr, pwd) => {
        const emailInput = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailInput && passwordInput) {
          emailInput.value = usr;
          passwordInput.value = pwd;
        }
      }, username, password);

      // Step 3: Submit login
      await page.evaluate(() => {
        const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
        if (submitButton) {
          submitButton.click();
        }
      });

      // Step 4: Wait for redirect sequence and navigate to search
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Navigate directly to search results
      await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 5: Execute search
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
      }, businessName);

      if (!searchExecuted) {
        await browser.close();
        return {
          authenticated: true,
          businessFound: false,
          verificationStatus: 'not_found',
          message: 'Search functionality not accessible'
        };
      }

      // Step 6: Wait for results and extract
      await new Promise(resolve => setTimeout(resolve, 5000));

      const searchResults = await page.evaluate(() => {
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
        const businesses: any[] = [];
        
        profileLinks.forEach((link) => {
          const companyName = link.textContent?.trim();
          const profileUrl = (link as HTMLAnchorElement).href;
          
          if (companyName && profileUrl) {
            businesses.push({
              companyName,
              profileUrl
            });
          }
        });
        
        return businesses;
      });

      await browser.close();

      // Check for business match
      const matchingBusiness = searchResults.find(business => 
        business.companyName.toLowerCase().includes(businessName.toLowerCase()) ||
        businessName.toLowerCase().includes(business.companyName.toLowerCase())
      );

      if (matchingBusiness) {
        return {
          authenticated: true,
          businessFound: true,
          businessName: matchingBusiness.companyName,
          verificationStatus: 'verified',
          profileUrl: matchingBusiness.profileUrl,
          message: `${matchingBusiness.companyName} verified as Indigenous business in Supply Nation directory`
        };
      } else {
        return {
          authenticated: true,
          businessFound: false,
          verificationStatus: 'not_found',
          message: `${businessName} not found in Supply Nation Indigenous business directory`
        };
      }

    } catch (error) {
      if (browser) await browser.close();
      return {
        authenticated: false,
        businessFound: false,
        verificationStatus: 'authentication_failed',
        message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const supplyNationVerifiedIntegration = new SupplyNationVerifiedIntegration();