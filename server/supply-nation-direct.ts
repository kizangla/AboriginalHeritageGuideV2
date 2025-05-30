import fetch from 'node-fetch';
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
    contactPerson?: string;
  };
  description?: string;
  supplynationId: string;
  capabilities?: string[];
  certifications?: string[];
  tradingName?: string;
  detailedAddress?: {
    streetAddress?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
  };
  acn?: string;
  lastUpdated?: string;
}

export interface SupplyNationSearchResult {
  businesses: SupplyNationBusiness[];
  totalResults: number;
}

class SupplyNationDirectService {
  private sessionCookies: string = '';
  private isAuthenticated: boolean = false;

  async authenticate(): Promise<boolean> {
    if (this.isAuthenticated) return true;

    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;

      if (!username || !password) {
        console.error('Supply Nation credentials not available');
        return false;
      }

      console.log('Authenticating with Supply Nation...');

      // Step 1: Get login page
      const loginResponse = await fetch('https://ibd.supplynation.org.au/public/login', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        }
      });

      const setCookieHeaders = loginResponse.headers.raw()['set-cookie'];
      this.sessionCookies = setCookieHeaders ? setCookieHeaders.join('; ') : '';

      const loginHtml = await loginResponse.text();
      const $ = cheerio.load(loginHtml);

      // Extract form data and CSRF tokens
      const csrfToken = $('input[name="authenticity_token"]').val() || 
                       $('meta[name="csrf-token"]').attr('content') || '';

      // Step 2: Submit login
      const loginData = new URLSearchParams();
      loginData.append('username', username);
      loginData.append('password', password);
      if (csrfToken) {
        loginData.append('authenticity_token', csrfToken as string);
      }

      const authResponse = await fetch('https://ibd.supplynation.org.au/public/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Referer': 'https://ibd.supplynation.org.au/public/login'
        },
        body: loginData,
        redirect: 'manual'
      });

      // Update cookies from auth response
      const authCookies = authResponse.headers.raw()['set-cookie'];
      if (authCookies) {
        this.sessionCookies += '; ' + authCookies.join('; ');
      }

      this.isAuthenticated = authResponse.status === 302 || authResponse.status === 200;
      console.log(`Supply Nation authentication: ${this.isAuthenticated ? 'success' : 'failed'}`);

      return this.isAuthenticated;
    } catch (error) {
      console.error('Supply Nation authentication error:', error);
      return false;
    }
  }

  async searchBusinesses(query: string, location?: string): Promise<SupplyNationSearchResult> {
    try {
      // Authenticate first
      const authenticated = await this.authenticate();
      if (!authenticated) {
        console.log('Authentication failed, returning empty results');
        return { businesses: [], totalResults: 0 };
      }

      console.log(`Searching Supply Nation for: "${query}"`);

      // Access search results page
      const searchUrl = `https://ibd.supplynation.org.au/public/s/search-results?searchTerm=${encodeURIComponent(query)}`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        }
      });

      const searchHtml = await searchResponse.text();
      const $ = cheerio.load(searchHtml);

      const businesses: SupplyNationBusiness[] = [];

      // Extract business listings from search results
      $('.supplier-card, .business-card, .search-result-item, [data-component*="Supplier"]').each((index, element) => {
        try {
          const $element = $(element);
          
          const companyName = $element.find('h2, h3, .title, .business-name, .supplier-name').first().text().trim();
          
          if (companyName && companyName.toLowerCase().includes(query.toLowerCase())) {
            const location = $element.find('.location, .address, .suburb').first().text().trim();
            
            // Extract categories
            const categories: string[] = [];
            $element.find('.category, .service, .tag, .capability').each((_, cat) => {
              const text = $(cat).text().trim();
              if (text) categories.push(text);
            });

            // Extract contact info
            const phone = $element.find('[href^="tel:"], .phone').first().text().trim() || 
                         $element.find('[href^="tel:"]').attr('href')?.replace('tel:', '') || '';
            const email = $element.find('[href^="mailto:"], .email').first().text().trim() || 
                         $element.find('[href^="mailto:"]').attr('href')?.replace('mailto:', '') || '';
            const website = $element.find('[href^="http"], .website').first().attr('href') || '';

            // Check for verification
            const isVerified = $element.find('.certified, .verified, [src*="certif"]').length > 0;

            // Get profile link for more details
            const profileLink = $element.find('a[href*="supplier"]').first().attr('href') || '';

            businesses.push({
              abn: '', // Will be extracted from profile if needed
              companyName,
              verified: isVerified,
              categories: categories.length > 0 ? categories : ['Indigenous business services'],
              location: location || 'Australia',
              contactInfo: {
                phone,
                email,
                website
              },
              description: categories.join(' • '),
              supplynationId: `sn_${index + 1}`,
              detailedAddress: {
                streetAddress: '',
                suburb: '',
                state: '',
                postcode: ''
              },

            });
          }
        } catch (err) {
          console.log('Error extracting business data:', err);
        }
      });

      console.log(`Found ${businesses.length} businesses from Supply Nation direct search`);
      
      return {
        businesses,
        totalResults: businesses.length
      };
    } catch (error) {
      console.error('Supply Nation direct search error:', error);
      return { businesses: [], totalResults: 0 };
    }
  }

  async getBusinessProfile(profileUrl: string): Promise<SupplyNationBusiness | null> {
    try {
      const authenticated = await this.authenticate();
      if (!authenticated) return null;

      const profileResponse = await fetch(profileUrl, {
        headers: {
          'Cookie': this.sessionCookies,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        }
      });

      const profileHtml = await profileResponse.text();
      const $ = cheerio.load(profileHtml);

      // Extract detailed business information
      const companyName = $('h1, .company-name, .business-name').first().text().trim();
      if (!companyName) return null;

      // Extract ABN
      let abn = $('.abn, .ABN, .business-number').text().trim().replace(/[^0-9]/g, '');
      if (abn.length !== 11) abn = '';

      // Extract contact details
      const phone = $('[href^="tel:"], .phone').first().text().trim() || 
                   $('[href^="tel:"]').attr('href')?.replace('tel:', '') || '';
      const email = $('[href^="mailto:"], .email').first().text().trim() || 
                   $('[href^="mailto:"]').attr('href')?.replace('mailto:', '') || '';
      const website = $('[href^="http"], .website').first().attr('href') || '';
      const contactPerson = $('.contact-person, .contact-name').first().text().trim();

      // Extract address
      const fullAddress = $('.address, .location').first().text().trim();
      const addressParts = fullAddress.split(',').map(part => part.trim());
      
      let streetAddress = '', suburb = '', state = '', postcode = '';
      if (addressParts.length >= 3) {
        streetAddress = addressParts[0] || '';
        suburb = addressParts[1] || '';
        const lastPart = addressParts[addressParts.length - 1];
        const statePostcodeMatch = lastPart.match(/([A-Z]{2,3})\s+(\d{4})/);
        if (statePostcodeMatch) {
          state = statePostcodeMatch[1];
          postcode = statePostcodeMatch[2];
        }
      }

      // Extract services
      const categories: string[] = [];
      $('.service, .category, .capability').each((_, element) => {
        const text = $(element).text().trim();
        if (text && text.length > 2) categories.push(text);
      });

      const isVerified = $('.certified, .verified, [src*="certif"]').length > 0;

      return {
        abn,
        companyName,
        verified: isVerified,
        categories: categories.length > 0 ? categories : ['Indigenous business services'],
        location: `${suburb}${state ? ', ' + state : ''}`,
        contactInfo: {
          phone,
          email,
          website,
          contactPerson
        },
        description: categories.join(' • '),
        supplynationId: 'profile_extracted',
        detailedAddress: {
          streetAddress,
          suburb,
          state,
          postcode
        },
        capabilities: categories,
        certifications: isVerified ? ['Supply Nation Certified'] : [],
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting profile:', error);
      return null;
    }
  }
}

export const supplyNationDirect = new SupplyNationDirectService();