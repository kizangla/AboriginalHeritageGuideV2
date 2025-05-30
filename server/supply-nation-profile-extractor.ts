import { Page } from 'puppeteer';
import { SupplyNationBusiness } from './supply-nation-scraper';

export async function extractSupplyNationProfile(page: Page, profileUrl: string): Promise<SupplyNationBusiness | null> {
  try {
    // Navigate to the profile page
    await page.goto(profileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('body', { timeout: 10000 });
    
    // Extract company name from page title or main heading
    const companyName = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent) {
        return h1.textContent.trim();
      }
      
      // Fallback to page title
      const title = document.title;
      if (title && title.includes(' | ')) {
        return title.split(' | ')[0].trim();
      }
      
      return 'Unknown Company';
    });
    
    // Extract phone number
    const phone = await page.evaluate(() => {
      // Look for tel: links first
      const telLink = document.querySelector('a[href^="tel:"]');
      if (telLink && telLink.textContent) {
        return telLink.textContent.trim();
      }
      
      // Look for phone patterns in text
      const bodyText = document.body.textContent || '';
      const phoneMatch = bodyText.match(/\(\d{2}\)\s*\d{4}\s*\d{4}|\d{2}\s*\d{4}\s*\d{4}|\+61\s*[\d\s\(\)\-]+/);
      return phoneMatch ? phoneMatch[0].trim() : null;
    });
    
    // Extract email
    const email = await page.evaluate(() => {
      // Look for mailto: links first
      const mailtoLink = document.querySelector('a[href^="mailto:"]');
      if (mailtoLink) {
        const href = mailtoLink.getAttribute('href');
        if (href) {
          return href.replace('mailto:', '').trim();
        }
      }
      
      // Look for email patterns in text
      const bodyText = document.body.textContent || '';
      const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      return emailMatch ? emailMatch[0] : null;
    });
    
    // Extract website
    const website = await page.evaluate(() => {
      const links = document.querySelectorAll('a[href^="http"]');
      for (let i = 0; i < links.length; i++) {
        const href = links[i].getAttribute('href');
        if (href && 
            !href.includes('supplynation.org.au') && 
            !href.includes('salesforce.com') &&
            (href.includes('www.') || href.includes('.com') || href.includes('.au'))) {
          return href;
        }
      }
      return null;
    });
    
    // Extract description/services
    const description = await page.evaluate(() => {
      // Look for common description selectors
      const descSelectors = [
        '[class*="description"]',
        '[class*="service"]',
        '[class*="about"]',
        'p',
        'div'
      ];
      
      for (const selector of descSelectors) {
        const elements = document.querySelectorAll(selector);
        for (let i = 0; i < elements.length; i++) {
          const text = elements[i].textContent?.trim();
          if (text && text.length > 100 && !text.includes('Supply Nation') && !text.includes('Login')) {
            return text;
          }
        }
      }
      return null;
    });
    
    // Extract Supply Nation ID from URL
    const supplynationId = profileUrl.split('accid=')[1] || 'unknown';
    
    // Extract location from page content
    const location = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      // Look for Australian state patterns
      const stateMatch = bodyText.match(/(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)/);
      if (stateMatch) {
        // Look for city before the state
        const cityPattern = new RegExp(`([A-Z][a-zA-Z\\s]+),?\\s*${stateMatch[1]}`, 'i');
        const cityMatch = bodyText.match(cityPattern);
        if (cityMatch) {
          return cityMatch[0].trim();
        }
        return stateMatch[1];
      }
      return 'Australia';
    });
    
    const result: SupplyNationBusiness = {
      companyName: companyName,
      verified: true,
      categories: [],
      location: location,
      contactInfo: {
        email: email || undefined,
        phone: phone || undefined,
        website: website || undefined,
        contactPerson: undefined
      },
      description: description || undefined,
      supplynationId: supplynationId,
      capabilities: [],
      certifications: ['Supply Nation Verified'],
      tradingName: undefined,
      detailedAddress: undefined,
      abn: undefined,
      acn: undefined,
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`Successfully extracted profile for: ${companyName}`);
    return result;
    
  } catch (error) {
    console.error(`Error extracting profile from ${profileUrl}:`, error);
    return null;
  }
}