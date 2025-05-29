import fetch, { Headers } from 'node-fetch';
import * as cheerio from 'cheerio';

export interface SupplyNationBusiness {
  abn?: string;
  companyName: string;
  verified: boolean;
  categories: string[];
  location: string;
  contactInfo: {
    email?: string;
    phone?: string;
    website?: string;
  };
  description?: string;
  supplynationId: string;
}

export interface SupplyNationSearchResult {
  businesses: SupplyNationBusiness[];
  totalResults: number;
}

class SupplyNationScraper {
  private baseUrl = 'https://ibd.supplynation.org.au';
  private loginUrl = 'https://ibd.supplynation.org.au/public/s/';
  private searchUrl = 'https://ibd.supplynation.org.au/public/s/search-results';
  private sessionCookies: string = '';
  private isAuthenticated = false;

  constructor() {
    this.sessionCookies = '';
  }

  async login(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        console.error('Supply Nation credentials not configured');
        return false;
      }

      // First, get the login page to extract any CSRF tokens
      const loginPageResponse = await fetch(this.loginUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!loginPageResponse.ok) {
        console.error('Failed to access login page');
        return false;
      }

      const loginPageHtml = await loginPageResponse.text();
      const $ = cheerio.load(loginPageHtml);
      
      // Extract session cookies
      const cookies = loginPageResponse.headers.get('set-cookie');
      if (cookies) {
        this.sessionCookies = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      }

      // Look for login form and extract any hidden fields/tokens
      const csrfToken = $('input[name="authenticity_token"]').val() || 
                       $('meta[name="csrf-token"]').attr('content') || '';

      // Attempt login
      const loginData = new URLSearchParams({
        'username': username,
        'password': password,
        ...(csrfToken && { 'authenticity_token': csrfToken as string })
      });

      const loginResponse = await fetch(this.loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Referer': this.loginUrl
        },
        body: loginData.toString(),
        redirect: 'manual'
      });

      // Update cookies after login attempt
      const newCookies = loginResponse.headers.get('set-cookie');
      if (newCookies) {
        const cookieString = Array.isArray(newCookies) ? newCookies.join('; ') : newCookies;
        this.sessionCookies += '; ' + cookieString;
      }

      // Check if login was successful (usually redirects or returns 200 with dashboard)
      this.isAuthenticated = loginResponse.status === 302 || 
                            (loginResponse.status === 200 && !loginResponse.url.includes('login'));

      console.log(`Supply Nation login ${this.isAuthenticated ? 'successful' : 'failed'}`);
      return this.isAuthenticated;

    } catch (error) {
      console.error('Supply Nation login error:', error);
      return false;
    }
  }

  async searchBusinesses(query: string, location?: string): Promise<SupplyNationSearchResult> {
    if (!this.isAuthenticated) {
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        return { businesses: [], totalResults: 0 };
      }
    }

    try {
      // Build search parameters
      const searchParams = new URLSearchParams({
        'q': query,
        'type': 'business',
        ...(location && { 'location': location })
      });

      const searchResponse = await fetch(`${this.searchUrl}?${searchParams}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      if (!searchResponse.ok) {
        console.error('Supply Nation search request failed:', searchResponse.status);
        return { businesses: [], totalResults: 0 };
      }

      const searchHtml = await searchResponse.text();
      return this.parseSearchResults(searchHtml);

    } catch (error) {
      console.error('Supply Nation search error:', error);
      return { businesses: [], totalResults: 0 };
    }
  }

  private parseSearchResults(html: string): SupplyNationSearchResult {
    const $ = cheerio.load(html);
    const businesses: SupplyNationBusiness[] = [];

    // Parse business listings (adjust selectors based on actual HTML structure)
    $('.business-card, .search-result-item, .business-listing').each((index, element) => {
      const $element = $(element);
      
      const companyName = $element.find('.company-name, .business-name, h3, h2').first().text().trim();
      const location = $element.find('.location, .address, .suburb').first().text().trim();
      const description = $element.find('.description, .summary, p').first().text().trim();
      
      // Extract ABN if visible
      const abnText = $element.text();
      const abnMatch = abnText.match(/ABN:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
      const abn = abnMatch ? abnMatch[1].replace(/\s/g, '') : undefined;

      // Extract categories/industries
      const categories: string[] = [];
      $element.find('.category, .industry, .tags .tag').each((_, catEl) => {
        const category = $(catEl).text().trim();
        if (category) categories.push(category);
      });

      // Extract contact information
      const email = $element.find('a[href^="mailto:"]').attr('href')?.replace('mailto:', '');
      const phone = $element.find('.phone, a[href^="tel:"]').text().trim();
      const website = $element.find('a[href^="http"]').attr('href');

      // Get Supply Nation ID from URL or data attributes
      const profileLink = $element.find('a').attr('href') || '';
      const supplynationId = profileLink.split('/').pop() || `sn_${index}`;

      if (companyName) {
        businesses.push({
          abn,
          companyName,
          verified: true, // All Supply Nation businesses are verified Indigenous businesses
          categories,
          location,
          contactInfo: {
            email,
            phone,
            website
          },
          description,
          supplynationId
        });
      }
    });

    // Extract total results count
    const totalText = $('.results-count, .total-results').text();
    const totalMatch = totalText.match(/(\d+)/);
    const totalResults = totalMatch ? parseInt(totalMatch[1]) : businesses.length;

    return {
      businesses,
      totalResults
    };
  }

  async getBusinessProfile(supplynationId: string): Promise<SupplyNationBusiness | null> {
    if (!this.isAuthenticated) {
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        return null;
      }
    }

    try {
      const profileUrl = `${this.baseUrl}/public/s/business/${supplynationId}`;
      
      const profileResponse = await fetch(profileUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies
        }
      });

      if (!profileResponse.ok) {
        return null;
      }

      const profileHtml = await profileResponse.text();
      return this.parseBusinessProfile(profileHtml, supplynationId);

    } catch (error) {
      console.error('Error fetching business profile:', error);
      return null;
    }
  }

  private parseBusinessProfile(html: string, supplynationId: string): SupplyNationBusiness | null {
    const $ = cheerio.load(html);

    const companyName = $('.business-name, .company-title, h1').first().text().trim();
    if (!companyName) return null;

    const location = $('.business-location, .address').text().trim();
    const description = $('.business-description, .about, .overview').text().trim();

    // Extract detailed contact information
    const email = $('a[href^="mailto:"]').attr('href')?.replace('mailto:', '');
    const phone = $('.phone, .contact-phone').text().trim();
    const website = $('.website, .business-website a').attr('href');

    // Extract ABN
    const abnText = $.text();
    const abnMatch = abnText.match(/ABN:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
    const abn = abnMatch ? abnMatch[1].replace(/\s/g, '') : undefined;

    // Extract categories
    const categories: string[] = [];
    $('.categories .category, .industries .industry, .services .service').each((_, el) => {
      const category = $(el).text().trim();
      if (category) categories.push(category);
    });

    return {
      abn,
      companyName,
      verified: true,
      categories,
      location,
      contactInfo: {
        email,
        phone,
        website
      },
      description,
      supplynationId
    };
  }
}

// Singleton instance
const supplyNationScraper = new SupplyNationScraper();

export async function searchSupplyNationBusinesses(
  query: string, 
  location?: string
): Promise<SupplyNationSearchResult> {
  return await supplyNationScraper.searchBusinesses(query, location);
}

export async function getSupplyNationProfile(
  supplynationId: string
): Promise<SupplyNationBusiness | null> {
  return await supplyNationScraper.getBusinessProfile(supplynationId);
}

export async function verifyIndigenousBusiness(abn: string): Promise<boolean> {
  try {
    const searchResult = await supplyNationScraper.searchBusinesses(abn);
    return searchResult.businesses.some(business => 
      business.abn === abn || business.companyName.includes(abn)
    );
  } catch (error) {
    console.error('Error verifying Indigenous business:', error);
    return false;
  }
}