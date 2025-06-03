import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export interface SupplyNationVerifiedBusiness {
  companyName: string;
  abn?: string;
  location?: string;
  supplynationId: string;
  profileUrl?: string;
  verified: boolean;
  categories?: string[];
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

export class SupplyNationSimpleScraper {
  private sessionCookies: string = '';
  private isAuthenticated: boolean = false;

  async authenticate(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        console.log('Supply Nation credentials not available');
        return false;
      }

      console.log('Attempting Supply Nation authentication...');

      // First, get the login page to extract any CSRF tokens or session info
      const loginPageResponse = await fetch('https://ibd.supplynation.org.au/public/s/login', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!loginPageResponse.ok) {
        console.log('Failed to access login page');
        return false;
      }

      // Extract cookies from login page
      const setCookieHeader = loginPageResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        this.sessionCookies = setCookieHeader;
      }

      // Parse login page for any hidden fields or CSRF tokens
      const loginPageHtml = await loginPageResponse.text();
      const $ = cheerio.load(loginPageHtml);
      
      // Look for hidden form fields that might be required
      const hiddenFields: Record<string, string> = {};
      $('input[type="hidden"]').each((_, element) => {
        const name = $(element).attr('name');
        const value = $(element).attr('value');
        if (name && value) {
          hiddenFields[name] = value;
        }
      });

      // Prepare login data
      const loginData = new URLSearchParams({
        username: username,
        password: password,
        ...hiddenFields
      });

      // Attempt login
      const loginResponse = await fetch('https://ibd.supplynation.org.au/public/s/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Referer': 'https://ibd.supplynation.org.au/public/s/login'
        },
        body: loginData.toString(),
        redirect: 'manual' // Handle redirects manually to track authentication
      });

      // Update cookies with login response
      const loginSetCookie = loginResponse.headers.get('set-cookie');
      if (loginSetCookie) {
        this.sessionCookies = loginSetCookie;
      }

      // Check if login was successful by looking at the response
      const loginResponseText = await loginResponse.text();
      this.isAuthenticated = !loginResponseText.includes('Invalid') && 
                            !loginResponseText.includes('Error') &&
                            (loginResponse.status === 302 || loginResponse.status === 200);

      console.log(`Supply Nation authentication ${this.isAuthenticated ? 'successful' : 'failed'}`);
      return this.isAuthenticated;

    } catch (error) {
      console.error('Supply Nation authentication error:', error);
      return false;
    }
  }

  async searchVerifiedBusinesses(query: string): Promise<SupplyNationVerifiedBusiness[]> {
    try {
      if (!this.isAuthenticated) {
        const authSuccess = await this.authenticate();
        if (!authSuccess) {
          console.log('Cannot search without authentication');
          return [];
        }
      }

      console.log(`Searching Supply Nation for verified businesses: ${query}`);

      const searchUrl = `https://ibd.supplynation.org.au/public/s/search-results?q=${encodeURIComponent(query)}`;
      
      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Referer': 'https://ibd.supplynation.org.au/public/s/'
        }
      });

      if (!searchResponse.ok) {
        console.log(`Search request failed: ${searchResponse.status}`);
        return [];
      }

      const searchHtml = await searchResponse.text();
      const businesses = this.parseSearchResults(searchHtml, query);
      
      console.log(`Found ${businesses.length} verified businesses in Supply Nation`);
      return businesses;

    } catch (error) {
      console.error('Supply Nation search error:', error);
      return [];
    }
  }

  private parseSearchResults(html: string, searchQuery: string): SupplyNationVerifiedBusiness[] {
    const $ = cheerio.load(html);
    const businesses: SupplyNationVerifiedBusiness[] = [];

    // Look for business listings in the search results
    const businessSelectors = [
      '.search-result-item',
      '.business-listing',
      '.supplier-card',
      'article',
      '.result-item',
      '[data-testid*="business"]',
      '[class*="business"]',
      '[class*="supplier"]'
    ];

    for (const selector of businessSelectors) {
      $(selector).each((index, element) => {
        const $element = $(element);
        const text = $element.text().trim();

        // Skip if this looks like navigation or header content
        if (this.isNavigationElement(text)) {
          return;
        }

        // Extract company name
        const companyName = this.extractCompanyName($element, text, searchQuery);
        if (!companyName) {
          return;
        }

        // Extract location
        const location = this.extractLocation($element);

        // Extract ABN if available
        const abn = this.extractABN($element);

        // Extract profile link
        const profileLink = $element.find('a[href*="supplierprofile"]').first();
        const profileUrl = profileLink.length > 0 ? profileLink.attr('href') : undefined;
        const supplynationId = profileUrl ? this.extractSupplyNationId(profileUrl) : `sn_${index}`;

        const business: SupplyNationVerifiedBusiness = {
          companyName: companyName,
          abn: abn,
          location: location,
          supplynationId: supplynationId,
          profileUrl: profileUrl,
          verified: true,
          categories: ['Supply Nation Verified'],
          contactInfo: {}
        };

        businesses.push(business);
      });

      // If we found businesses with this selector, break to avoid duplicates
      if (businesses.length > 0) {
        break;
      }
    }

    return businesses;
  }

  private isNavigationElement(text: string): boolean {
    const navigationTerms = [
      'home', 'search', 'login', 'register', 'about', 'contact',
      'privacy', 'terms', 'help', 'support', 'menu', 'navigation',
      'breadcrumb', 'footer', 'header', 'sidebar'
    ];
    
    const lowerText = text.toLowerCase();
    return navigationTerms.some(term => lowerText.includes(term)) || text.length < 3;
  }

  private extractCompanyName($element: any, text: string, searchQuery: string): string | null {
    // Look for company name in various elements
    const nameSelectors = [
      'h1', 'h2', 'h3', '.company-name', '.business-name', '.supplier-name',
      '[data-testid*="name"]', '.title', '.heading'
    ];

    for (const selector of nameSelectors) {
      const nameElement = $element.find(selector).first();
      if (nameElement.length > 0) {
        const name = nameElement.text().trim();
        if (name && name.length > 2 && name.length < 200) {
          return name;
        }
      }
    }

    // Fallback: look for text that contains the search query
    const words = text.split(/\s+/);
    const searchWords = searchQuery.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = words.slice(i, i + 4).join(' ');
      if (searchWords.some(word => phrase.toLowerCase().includes(word)) && 
          phrase.length > 5 && phrase.length < 100) {
        return phrase;
      }
    }

    return null;
  }

  private extractLocation($element: any): string | null {
    // Look for location information
    const locationSelectors = [
      '.location', '.address', '.suburb', '.state', '.city',
      '[data-testid*="location"]', '[data-testid*="address"]'
    ];

    for (const selector of locationSelectors) {
      const locationElement = $element.find(selector).first();
      if (locationElement.length > 0) {
        const location = locationElement.text().trim();
        if (location && location.length > 2) {
          return location;
        }
      }
    }

    // Look for Australian state patterns in text
    const text = $element.text();
    const stateMatch = text.match(/([A-Za-z\s]+),?\s*(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s*(\d{4})?/);
    if (stateMatch) {
      return stateMatch[0].trim();
    }

    return null;
  }

  private extractABN($element: any): string | null {
    const text = $element.text();
    const abnMatch = text.match(/ABN\s*:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
    return abnMatch ? abnMatch[1].replace(/\s/g, '') : null;
  }

  private extractSupplyNationId(href: string): string {
    const match = href.match(/accid=([a-zA-Z0-9]+)/);
    return match ? match[1] : 'unknown';
  }
}

export const supplyNationSimpleScraper = new SupplyNationSimpleScraper();