import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { SupplyNationBusiness } from './supply-nation-scraper';

/**
 * Direct API-based Supply Nation service that authenticates and searches 
 * for verified Indigenous businesses using HTTP requests
 */
export class SupplyNationApiService {
  private static readonly BASE_URL = 'https://ibd.supplynation.org.au';
  private sessionCookies: string = '';

  async authenticate(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        console.log('Supply Nation credentials not found');
        return false;
      }

      console.log('Authenticating with Supply Nation API...');

      // Step 1: Get login page and extract any CSRF tokens
      const loginPageResponse = await fetch(`${SupplyNationApiService.BASE_URL}/public/s/login`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const loginPageHtml = await loginPageResponse.text();
      const setCookieHeaders = loginPageResponse.headers.raw()['set-cookie'] || [];
      let cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');

      // Step 2: Submit login credentials
      const loginData = new URLSearchParams();
      loginData.append('username', username);
      loginData.append('password', password);

      const loginResponse = await fetch(`${SupplyNationApiService.BASE_URL}/public/s/login`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookies,
          'Referer': `${SupplyNationApiService.BASE_URL}/public/s/login`
        },
        body: loginData,
        redirect: 'manual'
      });

      // Collect session cookies from login response
      const loginCookies = loginResponse.headers.raw()['set-cookie'] || [];
      cookies += '; ' + loginCookies.map(cookie => cookie.split(';')[0]).join('; ');
      this.sessionCookies = cookies;

      console.log('Login response status:', loginResponse.status);
      
      // Check if login was successful by following redirects
      if (loginResponse.status >= 300 && loginResponse.status < 400) {
        console.log('Login successful, following redirects...');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Authentication failed:', error);
      return false;
    }
  }

  async searchBusinesses(query: string): Promise<SupplyNationBusiness[]> {
    try {
      if (!this.sessionCookies) {
        const authenticated = await this.authenticate();
        if (!authenticated) {
          console.log('Failed to authenticate with Supply Nation');
          return [];
        }
      }

      console.log(`Searching Supply Nation for: "${query}"`);

      // Construct search URL with parameters
      const searchUrl = `${SupplyNationApiService.BASE_URL}/public/s/search-results?search=${encodeURIComponent(query)}&searchfield=all`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cookie': this.sessionCookies,
          'Referer': `${SupplyNationApiService.BASE_URL}/public/s/homepage`
        }
      });

      if (!searchResponse.ok) {
        console.log(`Search request failed: ${searchResponse.status}`);
        return [];
      }

      const searchHtml = await searchResponse.text();
      console.log(`Search response received, length: ${searchHtml.length}`);

      // Debug: Log a sample of the HTML to understand structure
      const htmlSample = searchHtml.substring(0, 2000);
      console.log('HTML sample:', htmlSample.substring(htmlSample.indexOf('<body'), htmlSample.indexOf('<body') + 500));

      return this.parseSearchResults(searchHtml, query);
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  private parseSearchResults(html: string, searchQuery: string): SupplyNationBusiness[] {
    const $ = cheerio.load(html);
    const businesses: SupplyNationBusiness[] = [];

    console.log('Parsing search results with Cheerio...');

    // Check if we have any business profile links first
    const profileLinks = $('a[href*="supplierprofile"]');
    console.log(`Found ${profileLinks.length} supplier profile links`);
    
    if (profileLinks.length === 0) {
      // If no direct profile links, search for text patterns that indicate businesses
      console.log('No direct profile links found, searching for business name patterns...');
      
      // Look for text containing the search term and business-like keywords
      const textElements = $('*').filter(function() {
        const text = $(this).text().toLowerCase();
        return text.includes(searchQuery.toLowerCase()) && 
               (text.includes('pty ltd') || text.includes('group') || text.includes('services') ||
                text.includes('consulting') || text.includes('solutions') || text.includes('enterprises')) &&
               text.length > 5 && text.length < 200;
      });
      
      console.log(`Found ${textElements.length} potential business text elements`);
      
      textElements.each((index, element) => {
        const text = $(element).text().trim();
        console.log(`Examining text: "${text.substring(0, 100)}..."`);
        
        // Extract potential business names
        const businessNameMatch = text.match(/([A-Z][A-Za-z\s&'.-]+(?:PTY\s+LTD|LIMITED|GROUP|SERVICES|CONSULTING|SOLUTIONS|ENTERPRISES))/i);
        if (businessNameMatch) {
          const companyName = businessNameMatch[1].trim();
          console.log(`Potential business found: ${companyName}`);
          
          businesses.push({
            companyName,
            verified: true,
            categories: [],
            location: 'Australia',
            contactInfo: {},
            description: 'Supply Nation verified Indigenous business',
            supplynationId: `sn-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            capabilities: [],
            certifications: ['Supply Nation Verified']
          });
        }
      });
      
      if (businesses.length === 0) {
        // Last resort: log page structure to understand what we're getting
        console.log('No businesses found. Page structure analysis:');
        console.log(`Title: ${$('title').text()}`);
        console.log(`Total links: ${$('a').length}`);
        console.log(`Total divs: ${$('div').length}`);
        console.log(`Body classes: ${$('body').attr('class')}`);
        
        // Check if it's a "no results" page
        const bodyText = $('body').text().toLowerCase();
        if (bodyText.includes('no results') || bodyText.includes('0 results') || bodyText.includes('no matches')) {
          console.log('Search returned no results from Supply Nation');
        } else if (bodyText.includes('login') || bodyText.includes('sign in')) {
          console.log('Authentication may have failed - login page detected');
        }
      }
      
      return businesses;
    }

    // Original logic for when we have profile links
    const businessSelectors = [
      'a[href*="supplierprofile"]',  // Direct profile links
      'a[href*="accid="]',           // Links with account IDs
      '[class*="supplier"]',          // Elements with supplier in class
      '[class*="business"]',          // Elements with business in class
      '[class*="listing"]',           // Listing elements
      '.slds-card',                   // Salesforce Lightning cards
      'article',                      // Article elements
      '[role="article"]'              // Elements with article role
    ];

    for (const selector of businessSelectors) {
      $(selector).each((index, element) => {
        try {
          const $element = $(element);
          const text = $element.text().trim();
          const href = $element.attr('href') || '';

          // Skip if this looks like navigation or metadata
          if (this.isNavigationElement(text)) {
            return;
          }

          // Extract business name from text or nearby elements
          let companyName = this.extractCompanyName($element, text, searchQuery);
          
          if (companyName) {
            // Extract additional details
            const location = this.extractLocation($element);
            const abn = this.extractABN($element);
            const supplynationId = this.extractSupplyNationId(href);

            const business: SupplyNationBusiness = {
              companyName: companyName.trim(),
              verified: true,
              categories: [],
              location: location || 'Australia',
              contactInfo: {},
              description: 'Supply Nation verified Indigenous business',
              supplynationId: supplynationId,
              capabilities: [],
              certifications: ['Supply Nation Verified'],
              abn: abn || undefined
            };

            businesses.push(business);
            console.log(`Found business: ${companyName}`);
          }
        } catch (error) {
          console.error('Error parsing business element:', error);
        }
      });
    }

    // Remove duplicates by company name
    const uniqueBusinesses = businesses.filter((business, index, array) =>
      array.findIndex(b => b.companyName.toLowerCase() === business.companyName.toLowerCase()) === index
    );

    console.log(`Extracted ${uniqueBusinesses.length} unique businesses from HTML`);
    return uniqueBusinesses;
  }

  private isNavigationElement(text: string): boolean {
    const navigationKeywords = [
      'Resources', 'Fact sheets', 'Export Nation', 'Media releases',
      'Annual reports', 'Support services', 'FAQ', 'Home', 'About',
      'Contact', 'Login', 'Register', 'Search', 'Filter', 'Sort'
    ];

    return navigationKeywords.some(keyword => text.includes(keyword)) ||
           text.length < 3 || text.length > 150;
  }

  private extractCompanyName($element: cheerio.Cheerio, text: string, searchQuery: string): string | null {
    // Check if text is already a company name
    if (text.match(/^[A-Z][A-Za-z\s&'.-]+(?:PTY\s+LTD|LIMITED|GROUP|SERVICES|CONSULTING|SOLUTIONS|ENTERPRISES)$/i)) {
      return text;
    }

    // Look for company name patterns in text
    const nameMatch = text.match(/([A-Z][A-Za-z\s&'.-]{2,50}(?:PTY\s+LTD|LIMITED|GROUP|SERVICES|CONSULTING|SOLUTIONS|ENTERPRISES))/i);
    if (nameMatch) {
      return nameMatch[1];
    }

    // Check if text contains search query and looks like a business name
    if (text.includes(searchQuery) && text.length > 3 && text.length < 100) {
      // Clean up the text to make it look more like a business name
      const cleaned = text.replace(/\s+/g, ' ').trim();
      if (!this.isNavigationElement(cleaned)) {
        return cleaned;
      }
    }

    // Look for business names in nearby elements
    const nearbyText = $element.closest('div, li, tr').text();
    const nearbyNameMatch = nearbyText.match(/([A-Z][A-Za-z\s&'.-]{3,50}(?:PTY\s+LTD|LIMITED|GROUP|SERVICES|CONSULTING|SOLUTIONS|ENTERPRISES))/i);
    if (nearbyNameMatch) {
      return nearbyNameMatch[1];
    }

    return null;
  }

  private extractLocation($element: cheerio.Cheerio): string | null {
    const text = $element.closest('div, li, tr').text();
    const locationMatch = text.match(/(Victoria|VIC|New South Wales|NSW|Queensland|QLD|Western Australia|WA|South Australia|SA|Tasmania|TAS|Northern Territory|NT|Australian Capital Territory|ACT|\d{4})/i);
    return locationMatch ? locationMatch[0] : null;
  }

  private extractABN($element: cheerio.Cheerio): string | null {
    const text = $element.closest('div, li, tr').text();
    const abnMatch = text.match(/ABN\s*:?\s*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
    return abnMatch ? abnMatch[1].replace(/\s/g, '') : null;
  }

  private extractSupplyNationId(href: string): string {
    const idMatch = href.match(/accid=([^&]+)/);
    return idMatch ? idMatch[1] : `sn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const supplyNationApiService = new SupplyNationApiService();