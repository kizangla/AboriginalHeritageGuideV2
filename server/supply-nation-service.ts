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

      console.log('Attempting Supply Nation authentication...');

      // First, access the login page to get session cookies
      const loginPageUrl = 'https://ibd.supplynation.org.au/public/s/login';
      const loginPageResponse = await fetch(loginPageUrl, {
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

      // Handle the redirect sequence: login → frontdoor.jsp → CommunitiesLanding → homepage
      let currentUrl = loginResponse.headers.get('location');
      let redirectCount = 0;
      const maxRedirects = 5;

      while (currentUrl && redirectCount < maxRedirects) {
        console.log(`Following redirect ${redirectCount + 1}: ${currentUrl}`);
        
        const redirectResponse = await fetch(currentUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Cookie': this.sessionCookies,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
          },
          redirect: 'manual'
        });

        // Update cookies from each redirect
        const redirectCookies = redirectResponse.headers.get('set-cookie');
        if (redirectCookies) {
          const cookieString = Array.isArray(redirectCookies) ? redirectCookies.join('; ') : redirectCookies;
          this.sessionCookies += '; ' + cookieString;
        }

        // Check if we've reached the final destination
        if (redirectResponse.status === 200) {
          const responseText = await redirectResponse.text();
          if (responseText.includes('homepage') || responseText.includes('search') || !responseText.includes('login')) {
            console.log('Successfully completed redirect sequence');
            this.isAuthenticated = true;
            return true;
          }
        }

        currentUrl = redirectResponse.headers.get('location');
        redirectCount++;
      }

      // Check if login was successful
      this.isAuthenticated = redirectCount > 0 && redirectCount < maxRedirects;
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
      console.log(`Searching Supply Nation for: "${query}" in location: "${location || 'all'}"`);
      
      // Step 1: Get the search page to obtain any necessary form tokens or CSRF tokens
      const searchPageUrl = `${this.baseUrl}/public/s/search-results`;
      const searchPageResponse = await fetch(searchPageUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      if (!searchPageResponse.ok) {
        console.error('Failed to load search page:', searchPageResponse.status);
        return { businesses: [], totalResults: 0 };
      }

      const searchPageHtml = await searchPageResponse.text();
      console.log('Search page loaded, length:', searchPageHtml.length);

      // Step 2: Submit the search form with proper form data
      const formData = new URLSearchParams();
      formData.append('search', query);
      formData.append('searchfield', 'all');
      if (location) {
        formData.append('location', location);
      }

      console.log(`Submitting search form with data:`, formData.toString());

      const searchSubmitResponse = await fetch(searchPageUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Referer': searchPageUrl,
          'Accept-Language': 'en-US,en;q=0.9',
          'Origin': this.baseUrl
        },
        body: formData
      });

      console.log(`Search submit response status: ${searchSubmitResponse.status}`);
      console.log(`Search submit response URL: ${searchSubmitResponse.url}`);

      if (!searchSubmitResponse.ok) {
        console.error('Supply Nation search submission failed:', searchSubmitResponse.status);
        const errorText = await searchSubmitResponse.text();
        console.error('Error response:', errorText.substring(0, 500));
        return { businesses: [], totalResults: 0 };
      }

      const searchResultsHtml = await searchSubmitResponse.text();
      console.log(`Search results length: ${searchResultsHtml.length} characters`);
      
      // Save first 1000 chars for debugging
      console.log('Search results sample:', searchResultsHtml.substring(0, 1000));
      
      return this.parseSearchResults(searchResultsHtml);

    } catch (error) {
      console.error('Supply Nation search error:', error);
      return { businesses: [], totalResults: 0 };
    }
  }

  private parseSearchResults(html: string): SupplyNationSearchResult {
    const $ = cheerio.load(html);
    const businesses: SupplyNationBusiness[] = [];

    console.log('Parsing Supply Nation HTML, page length:', html.length);
    console.log('Sample HTML snippet:', html.substring(0, 500));
    
    // Check if we're actually on a search results page
    if (html.includes('login') || html.includes('authentication')) {
      console.log('Detected login page - authentication may have failed');
      return { businesses: [], totalResults: 0 };
    }

    // Look for actual content patterns in Supply Nation's current HTML structure
    const possibleSelectors = [
      // Standard Supply Nation selectors
      '.slds-card', '.supplier-tile', '.business-tile',
      '.slds-grid_wrap', '.slds-box', '.slds-media',
      // Lightning components (Salesforce-based)
      'c-supplier-search-results', 'lightning-card', 'c-search-result',
      // Generic business listing patterns
      '.business-card', '.search-result-item', '.business-listing',
      '.result-item', '.supplier-card', '.business-profile',
      '.search-result', '.listing', '.business-entry',
      '[data-business]', '.card', '.item',
      // Look for any links that might contain business names
      'a[href*="supplier"]', 'a[href*="business"]', 'a[href*="profile"]'
    ];

    let foundElements = 0;
    for (const selector of possibleSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`Found ${elements.length} elements with selector: ${selector}`);
        foundElements += elements.length;
        
        elements.each((index, element) => {
          const $element = $(element);
          const elementText = $element.text().trim();
          
          if (elementText.length > 10) { // Only process elements with substantial content
            // Try multiple selectors for company name
            const companyName = $element.find('h1, h2, h3, h4, .title, .name, .company-name, .business-name').first().text().trim() ||
                               $element.find('a').first().text().trim();
            
            if (companyName && companyName.length > 2) {
              console.log(`Found business: ${companyName}`);
              
              const location = $element.find('.location, .address, .suburb, .state').first().text().trim();
              const description = $element.find('.description, .summary, p').first().text().trim();
              
              // Extract ABN if visible
              const abnText = $element.text();
              const abnMatch = abnText.match(/ABN:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
              const abn = abnMatch ? abnMatch[1].replace(/\s/g, '') : undefined;

              // Extract categories/industries
              const categories: string[] = [];
              $element.find('.category, .industry, .tags .tag, .service, .capability').each((_, catEl) => {
                const category = $(catEl).text().trim();
                if (category && category.length > 2) categories.push(category);
              });

              // Extract contact information
              const email = $element.find('a[href^="mailto:"]').attr('href')?.replace('mailto:', '');
              const phone = $element.find('.phone, a[href^="tel:"]').text().trim();
              const website = $element.find('a[href^="http"]').attr('href');

              // Get Supply Nation ID from URL or data attributes
              const profileLink = $element.find('a').attr('href') || '';
              let supplynationId = 'unknown';
              
              // Extract authentic Supply Nation profile ID from the profile link
              if (profileLink.includes('supplierprofile')) {
                const urlParams = new URLSearchParams(profileLink.split('?')[1] || '');
                supplynationId = urlParams.get('accid') || 'unknown';
              } else if (profileLink.includes('/profile/') || profileLink.includes('/supplier/')) {
                // Alternative URL patterns
                const pathSegments = profileLink.split('/');
                const idIndex = pathSegments.findIndex(segment => segment === 'profile' || segment === 'supplier');
                if (idIndex >= 0 && idIndex < pathSegments.length - 1) {
                  supplynationId = pathSegments[idIndex + 1];
                }
              }
              
              // Only use authentic profile IDs, don't create synthetic ones
              if (supplynationId === 'unknown') {
                console.log(`No authentic Supply Nation profile ID found for ${companyName}`);
              }

              businesses.push({
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
              });
            }
          }
        });
      }
    }

    console.log(`Total elements found: ${foundElements}, businesses parsed: ${businesses.length}`);

    // Also check if we're on a login page or error page
    if (html.includes('login') || html.includes('sign in') || html.includes('authentication')) {
      console.log('Detected login page - authentication may have failed');
    }

    // Extract total results count
    const totalText = $('.results-count, .total-results, .count, .total').text();
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