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
      
      // Look for all form fields and their actual names
      const allInputs: Record<string, string> = {};
      $('input').each((_, element) => {
        const name = $(element).attr('name');
        const type = $(element).attr('type');
        const value = $(element).attr('value') || '';
        if (name) {
          allInputs[name] = value;
          console.log(`Found input: ${name} (type: ${type}) = ${value}`);
        }
      });

      // Look for any CSRF tokens or state parameters
      const csrfToken = $('input[name*="csrf"], input[name*="token"], input[name*="state"]').attr('value');
      const retUrl = $('input[name="retURL"]').attr('value');
      const startUrl = $('input[name="startURL"]').attr('value');

      // Check for actual form field names in the login page
      const usernameField = $('input[name*="username"], input[name*="user"], input[name*="email"]').attr('name') || 'username';
      const passwordField = $('input[name*="password"], input[name*="pass"]').attr('name') || 'password';
      
      console.log(`Login form fields detected: ${usernameField}, ${passwordField}`);
      console.log(`All form inputs:`, Object.keys(allInputs));
      if (csrfToken) console.log(`CSRF token found: ${csrfToken.substring(0, 10)}...`);
      if (retUrl) console.log(`Return URL: ${retUrl}`);

      // Prepare login data with all detected fields
      const loginData = new URLSearchParams({
        [usernameField]: username,
        [passwordField]: password,
        ...allInputs,
        ...(csrfToken && { 'csrf_token': csrfToken }),
        ...(retUrl && { 'retURL': retUrl }),
        ...(startUrl && { 'startURL': startUrl })
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

      // Follow redirect chain to complete authentication
      if (loginResponse.status === 302) {
        let currentLocation = loginResponse.headers.get('location');
        let currentCookies = this.sessionCookies;
        
        // Update cookies from login response
        const loginSetCookie = loginResponse.headers.get('set-cookie');
        if (loginSetCookie) {
          currentCookies += '; ' + loginSetCookie;
        }
        
        // Follow the redirect chain properly (frontdoor.jsp -> CommunitiesLanding -> /public/s/)
        let redirectCount = 0;
        const maxRedirects = 5;
        
        while (currentLocation && redirectCount < maxRedirects) {
          console.log(`Following redirect ${redirectCount + 1}: ${currentLocation}`);
          
          const redirectResponse = await fetch(currentLocation, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Cookie': currentCookies
            },
            redirect: 'manual'
          });
          
          const redirectSetCookie = redirectResponse.headers.get('set-cookie');
          if (redirectSetCookie) {
            currentCookies += '; ' + redirectSetCookie;
          }
          
          if (redirectResponse.status === 302 || redirectResponse.status === 301) {
            currentLocation = redirectResponse.headers.get('location');
            if (currentLocation && !currentLocation.startsWith('http')) {
              currentLocation = 'https://ibd.supplynation.org.au' + currentLocation;
            }
            redirectCount++;
          } else {
            // Final destination reached
            break;
          }
        }
        
        // Navigate to CommunitiesLanding page first
        const communitiesUrl = 'https://ibd.supplynation.org.au/public/apex/CommunitiesLanding';
        
        const communitiesResponse = await fetch(communitiesUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Cookie': currentCookies
          }
        });

        const communitiesSetCookie = communitiesResponse.headers.get('set-cookie');
        if (communitiesSetCookie) {
          currentCookies += '; ' + communitiesSetCookie;
        }
        
        // Then navigate to the main portal page with modal dismissal
        const finalUrl = 'https://ibd.supplynation.org.au/public/s/';
        
        // Add modal dismissal to cookies to bypass post-login popups
        currentCookies += '; modalHasShownToday=yes';
        
        const finalResponse = await fetch(finalUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Cookie': currentCookies,
            'Referer': communitiesUrl
          }
        });

        const finalSetCookie = finalResponse.headers.get('set-cookie');
        if (finalSetCookie) {
          currentCookies += '; ' + finalSetCookie;
        }
        
        this.sessionCookies = currentCookies;
        const finalText = await finalResponse.text();
        
        // Check for successful authentication indicators
        this.isAuthenticated = finalText.includes('searchIBDButton') || 
                              finalText.includes('Search Indigenous Business') ||
                              finalText.includes('CommunitiesLanding') ||
                              (finalResponse.status === 200 && !finalText.includes('login') && !finalText.includes('Please sign in'));
      } else {
        // Check if login was successful by looking at the response
        const loginResponseText = await loginResponse.text();
        this.isAuthenticated = !loginResponseText.includes('Invalid') && 
                              !loginResponseText.includes('Error') &&
                              (loginResponseText.includes('searchIBDButton') || 
                               loginResponseText.includes('Search Indigenous Business'));
      }

      console.log(`Supply Nation authentication ${this.isAuthenticated ? 'successful' : 'failed'}`);
      
      // Debug output for troubleshooting
      if (!this.isAuthenticated) {
        console.log('Supply Nation authentication debug:');
        console.log('- Login response status:', loginResponse.status);
        console.log('- Cookies received:', this.sessionCookies ? 'Yes' : 'No');
        if (loginResponse.status === 302) {
          const redirectLoc = loginResponse.headers.get('location');
          console.log('- Initial redirect:', redirectLoc);
          console.log('- Contains frontdoor.jsp:', redirectLoc?.includes('frontdoor.jsp') ? 'Yes' : 'No');
        }
      } else {
        console.log('Supply Nation authentication successful - ready for searches');
      }
      
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

      // First navigate to the main page to access the search button with modal dismissal
      const mainPageResponse = await fetch('https://ibd.supplynation.org.au/public/s/', {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies + '; modalHasShownToday=yes'
        }
      });

      if (!mainPageResponse.ok) {
        console.log(`Main page access failed: ${mainPageResponse.status}`);
        return [];
      }

      const mainPageHtml = await mainPageResponse.text();
      
      // Check if there's a popup to close or search button to click
      if (mainPageHtml.includes('searchIBDButton')) {
        console.log('Found Search Indigenous Business Direct button');
      }

      // Now proceed with the search
      const searchUrl = `https://ibd.supplynation.org.au/public/s/search-results?q=${encodeURIComponent(query)}`;
      
      const searchResponse = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies + '; modalHasShownToday=yes',
          'Referer': 'https://ibd.supplynation.org.au/public/s/'
        }
      });

      if (!searchResponse.ok) {
        console.log(`Search request failed: ${searchResponse.status}`);
        return [];
      }

      const searchHtml = await searchResponse.text();
      const businesses = this.parseSearchResults(searchHtml, query);
      
      // Extract detailed information from profile pages
      const detailedBusinesses: SupplyNationVerifiedBusiness[] = [];
      
      for (const business of businesses.slice(0, 3)) { // Limit to 3 profiles to avoid timeouts
        try {
          const detailed = await this.extractProfileDetails(business);
          if (detailed) {
            detailedBusinesses.push(detailed);
          }
          // Add delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.log(`Failed to extract profile for ${business.companyName}: ${error}`);
          detailedBusinesses.push(business); // Use basic info as fallback
        }
      }
      
      console.log(`Found ${detailedBusinesses.length} verified businesses in Supply Nation`);
      return detailedBusinesses;

    } catch (error) {
      console.error('Supply Nation search error:', error);
      return [];
    }
  }

  async extractProfileDetails(business: SupplyNationVerifiedBusiness): Promise<SupplyNationVerifiedBusiness | null> {
    try {
      if (!business.profileUrl) {
        return business;
      }

      console.log(`Extracting profile details from: ${business.profileUrl}`);

      const profileResponse = await fetch(business.profileUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Cookie': this.sessionCookies,
          'Referer': 'https://ibd.supplynation.org.au/public/s/search-results'
        }
      });

      if (!profileResponse.ok) {
        console.log(`Profile request failed: ${profileResponse.status}`);
        return business;
      }

      const profileHtml = await profileResponse.text();
      const $ = cheerio.load(profileHtml);

      // Extract detailed information from the profile page
      const enhanced: SupplyNationVerifiedBusiness = { ...business };

      // Extract address from the profile section
      const addressElements = $('#sn-business-details .slds-media__body');
      addressElements.each((_, element) => {
        const text = $(element).text().trim();
        
        // Look for address pattern: "L 1 2 MILL ST, PERTH WA 6000"
        const addressMatch = text.match(/([A-Z0-9\s,.-]+),\s*([A-Z\s]+)\s+([A-Z]{2,3})\s+(\d{4})/);
        if (addressMatch) {
          enhanced.location = `${addressMatch[1].trim()}, ${addressMatch[2].trim()}, ${addressMatch[3]} ${addressMatch[4]}`;
        }
      });

      // Extract ABN
      const abnText = $('#sn-business-details').text();
      const abnMatch = abnText.match(/ABN[:\s]*(\d{2}\s?\d{3}\s?\d{3}\s?\d{3})/i);
      if (abnMatch) {
        enhanced.abn = abnMatch[1].replace(/\s/g, '');
      }

      // Extract phone number
      const phoneMatch = abnText.match(/\((\d{2})\)\s*(\d{4})\s*(\d{4})/);
      if (phoneMatch) {
        enhanced.contactInfo = enhanced.contactInfo || {};
        enhanced.contactInfo.phone = `(${phoneMatch[1]}) ${phoneMatch[2]} ${phoneMatch[3]}`;
      }

      // Extract email
      const emailMatch = abnText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      if (emailMatch) {
        enhanced.contactInfo = enhanced.contactInfo || {};
        enhanced.contactInfo.email = emailMatch[1];
      }

      // Extract website
      const websiteMatch = abnText.match(/(https?:\/\/[^\s]+|www\.[^\s]+\.[a-z]{2,})/i);
      if (websiteMatch) {
        enhanced.contactInfo = enhanced.contactInfo || {};
        enhanced.contactInfo.website = websiteMatch[1];
      }

      // Extract services/categories
      const serviceElements = $('#sn-business-details .slds-media');
      const services: string[] = [];
      serviceElements.each((_, element) => {
        const text = $(element).text().trim();
        if (text.includes('services') || text.includes('construction') || text.includes('management')) {
          const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
          lines.forEach(line => {
            if (line.length > 3 && line.length < 50 && !line.includes('ABN') && !line.includes('(0')) {
              services.push(line);
            }
          });
        }
      });

      if (services.length > 0) {
        enhanced.categories = [...(enhanced.categories || []), ...services.slice(0, 5)];
      }

      console.log(`Enhanced ${enhanced.companyName} with detailed profile data`);
      return enhanced;

    } catch (error) {
      console.error(`Failed to extract profile details: ${error}`);
      return business;
    }
  }

  private parseSearchResults(html: string, searchQuery: string): SupplyNationVerifiedBusiness[] {
    const $ = cheerio.load(html);
    const businesses: SupplyNationVerifiedBusiness[] = [];

    // Look for Supply Nation specific search result structure
    // Based on your example: <p class="slds-text-heading_medium slds-text-align_center main-header">
    $('p.slds-text-heading_medium.main-header, .main-header').each((index, element) => {
      const $element = $(element);
      
      // Look for the profile link with specific pattern
      const profileLink = $element.find('a[href*="supplierprofile"][data-supplierid]').first();
      
      if (profileLink.length > 0) {
        const companyName = profileLink.text().trim();
        const profileUrl = profileLink.attr('href');
        const supplierIdAttr = profileLink.attr('data-supplierid');
        const accountIdAttr = profileLink.attr('data-accountid');
        
        if (companyName && profileUrl) {
          const business: SupplyNationVerifiedBusiness = {
            companyName: companyName,
            abn: undefined, // Will be extracted from profile page
            location: undefined, // Will be extracted from profile page
            supplynationId: supplierIdAttr || this.extractSupplyNationId(profileUrl),
            profileUrl: profileUrl.startsWith('http') ? profileUrl : `https://ibd.supplynation.org.au${profileUrl}`,
            verified: true,
            categories: ['Supply Nation Verified'],
            contactInfo: {}
          };

          console.log(`Found Supply Nation business: ${companyName} with profile URL: ${business.profileUrl}`);
          businesses.push(business);
        }
      }
    });

    // If no results with specific structure, try broader search
    if (businesses.length === 0) {
      // Look for any links to supplier profiles
      $('a[href*="supplierprofile"]').each((index, element) => {
        const $link = $(element);
        const companyName = $link.text().trim();
        const profileUrl = $link.attr('href');
        
        if (companyName && profileUrl && companyName.length > 2 && !this.isNavigationElement(companyName)) {
          const business: SupplyNationVerifiedBusiness = {
            companyName: companyName,
            abn: undefined,
            location: undefined,
            supplynationId: this.extractSupplyNationId(profileUrl),
            profileUrl: profileUrl.startsWith('http') ? profileUrl : `https://ibd.supplynation.org.au${profileUrl}`,
            verified: true,
            categories: ['Supply Nation Verified'],
            contactInfo: {}
          };

          businesses.push(business);
        }
      });
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