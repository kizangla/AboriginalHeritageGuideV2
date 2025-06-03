/**
 * Direct Supply Nation API Integration
 * Bypasses browser automation for direct API access
 */

import fetch from 'node-fetch';

export interface DirectSupplyNationBusiness {
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
  description?: string;
}

export class SupplyNationAPIDirect {
  private sessionToken: string | null = null;
  private baseUrl = 'https://ibd.supplynation.org.au';

  async authenticate(): Promise<boolean> {
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        console.log('Supply Nation credentials not available');
        return false;
      }

      console.log('Attempting direct API authentication...');

      // First, get the login page to extract any required tokens
      const loginPageResponse = await fetch(`${this.baseUrl}/s/login`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      const loginPageText = await loginPageResponse.text();
      
      // Extract CSRF token or session ID if present
      const csrfMatch = loginPageText.match(/name="csrf[^"]*"\s+value="([^"]+)"/i);
      const sessionMatch = loginPageText.match(/name="session[^"]*"\s+value="([^"]+)"/i);
      
      // Prepare login data
      const loginData = new URLSearchParams();
      loginData.append('username', username);
      loginData.append('password', password);
      
      if (csrfMatch) {
        loginData.append('csrf_token', csrfMatch[1]);
      }
      if (sessionMatch) {
        loginData.append('session_id', sessionMatch[1]);
      }

      // Attempt authentication
      const authResponse = await fetch(`${this.baseUrl}/s/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Referer': `${this.baseUrl}/s/login`
        },
        body: loginData.toString(),
        redirect: 'manual'
      });

      // Check for successful authentication
      if (authResponse.status === 302 || authResponse.status === 200) {
        const setCookieHeader = authResponse.headers.get('set-cookie');
        if (setCookieHeader) {
          this.sessionToken = setCookieHeader;
          console.log('Direct API authentication successful');
          return true;
        }
      }

      console.log('Direct API authentication failed');
      return false;
    } catch (error) {
      console.error('API authentication error:', (error as Error).message);
      return false;
    }
  }

  async searchBusinessDirect(query: string): Promise<DirectSupplyNationBusiness[]> {
    try {
      if (!this.sessionToken) {
        const authenticated = await this.authenticate();
        if (!authenticated) {
          console.log('Cannot search without authentication');
          return [];
        }
      }

      console.log(`Searching Supply Nation API for: ${query}`);

      // Try different API endpoints
      const searchEndpoints = [
        `/api/search?q=${encodeURIComponent(query)}`,
        `/s/search-results?q=${encodeURIComponent(query)}`,
        `/public/api/search?query=${encodeURIComponent(query)}`,
        `/api/businesses/search?name=${encodeURIComponent(query)}`
      ];

      for (const endpoint of searchEndpoints) {
        try {
          const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/html, */*',
              'Cookie': this.sessionToken || '',
              'Referer': `${this.baseUrl}/s/search-results`
            }
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            
            if (contentType?.includes('application/json')) {
              const data = await response.json();
              const businesses = this.parseJSONSearchResults(data, query);
              if (businesses.length > 0) {
                console.log(`Found ${businesses.length} businesses via JSON API`);
                return businesses;
              }
            } else {
              const html = await response.text();
              const businesses = this.parseHTMLSearchResults(html, query);
              if (businesses.length > 0) {
                console.log(`Found ${businesses.length} businesses via HTML parsing`);
                return businesses;
              }
            }
          }
        } catch (endpointError) {
          // Continue to next endpoint
          continue;
        }
      }

      console.log('No businesses found via direct API search');
      return [];

    } catch (error) {
      console.error('Direct API search failed:', (error as Error).message);
      return [];
    }
  }

  private parseJSONSearchResults(data: any, query: string): DirectSupplyNationBusiness[] {
    const businesses: DirectSupplyNationBusiness[] = [];
    
    try {
      // Handle different JSON response structures
      const results = data.results || data.businesses || data.data || data;
      
      if (Array.isArray(results)) {
        results.forEach((item: any, index: number) => {
          const business: DirectSupplyNationBusiness = {
            companyName: item.name || item.companyName || item.businessName || '',
            abn: item.abn || item.ABN || '',
            location: item.location || item.address || item.suburb || '',
            supplynationId: item.id || item.supplynationId || `api_${Date.now()}_${index}`,
            profileUrl: item.url || item.profileUrl || '',
            verified: true,
            categories: item.categories || item.services || [],
            contactInfo: {
              phone: item.phone || item.telephone || '',
              email: item.email || '',
              website: item.website || item.url || ''
            },
            description: item.description || item.summary || ''
          };

          if (business.companyName) {
            businesses.push(business);
          }
        });
      }
    } catch (parseError) {
      console.log('JSON parsing failed:', (parseError as Error).message);
    }

    return businesses;
  }

  private parseHTMLSearchResults(html: string, query: string): DirectSupplyNationBusiness[] {
    const businesses: DirectSupplyNationBusiness[] = [];
    
    try {
      // Extract business data from HTML using regex patterns
      const businessPatterns = [
        /<div[^>]*class="[^"]*business[^"]*"[^>]*>(.*?)<\/div>/gis,
        /<article[^>]*>(.*?)<\/article>/gis,
        /<div[^>]*class="[^"]*result[^"]*"[^>]*>(.*?)<\/div>/gis
      ];

      for (const pattern of businessPatterns) {
        const matches = html.matchAll(pattern);
        
        for (const match of matches) {
          const businessHTML = match[1];
          
          const business: DirectSupplyNationBusiness = {
            companyName: this.extractTextByPattern(businessHTML, /<h[1-6][^>]*>(.*?)<\/h[1-6]>/i) ||
                        this.extractTextByPattern(businessHTML, /class="[^"]*name[^"]*"[^>]*>(.*?)</i) || '',
            abn: this.extractTextByPattern(businessHTML, /\b\d{11}\b/) || '',
            location: this.extractTextByPattern(businessHTML, /class="[^"]*location[^"]*"[^>]*>(.*?)</i) ||
                     this.extractTextByPattern(businessHTML, /class="[^"]*address[^"]*"[^>]*>(.*?)</i) || '',
            supplynationId: `html_${Date.now()}_${businesses.length}`,
            profileUrl: this.extractTextByPattern(businessHTML, /<a[^>]*href="([^"]+)"/i) || '',
            verified: true,
            categories: [],
            contactInfo: {},
            description: this.extractTextByPattern(businessHTML, /<p[^>]*>(.*?)<\/p>/i) || ''
          };

          if (business.companyName && business.companyName.length > 2) {
            businesses.push(business);
          }
        }
        
        if (businesses.length > 0) break;
      }
    } catch (parseError) {
      console.log('HTML parsing failed:', (parseError as Error).message);
    }

    return businesses;
  }

  private extractTextByPattern(text: string, pattern: RegExp): string | null {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/<[^>]*>/g, '').trim();
    }
    return null;
  }
}

export const supplyNationAPIDirect = new SupplyNationAPIDirect();