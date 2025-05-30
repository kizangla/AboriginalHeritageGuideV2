import puppeteer from 'puppeteer';

async function testSupplyNationAuth() {
  let browser;
  try {
    console.log('Testing Supply Nation authentication...');
    
    browser = await puppeteer.launch({
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      headless: false, // Run with visible browser to debug
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    
    const username = process.env.SUPPLY_NATION_USERNAME;
    const password = process.env.SUPPLY_NATION_PASSWORD;
    
    if (!username || !password) {
      console.error('Supply Nation credentials not found');
      return;
    }
    
    console.log(`Using username: ${username?.substring(0, 5)}...`);
    
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('https://ibd.supplynation.org.au/public/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Wait a moment for page to load
    await page.waitForTimeout(3000);
    
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'login-page.png' });
    
    // Look for login form elements
    const usernameSelector = 'input[name="username"], input[type="email"], input[id*="username"], input[id*="email"]';
    const passwordSelector = 'input[name="password"], input[type="password"], input[id*="password"]';
    
    try {
      await page.waitForSelector(usernameSelector, { timeout: 10000 });
      console.log('Found username field');
      
      await page.waitForSelector(passwordSelector, { timeout: 5000 });
      console.log('Found password field');
      
      // Fill credentials
      await page.type(usernameSelector, username);
      await page.type(passwordSelector, password);
      
      console.log('Filled credentials, submitting...');
      
      // Submit form
      const submitSelector = 'button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign")';
      
      try {
        await page.click(submitSelector);
      } catch {
        // Try pressing Enter instead
        await page.keyboard.press('Enter');
      }
      
      // Wait for navigation
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 });
      
      console.log('After login URL:', page.url());
      console.log('After login title:', await page.title());
      
      // Take screenshot after login attempt
      await page.screenshot({ path: 'after-login.png' });
      
      // Check if successfully logged in
      const currentUrl = page.url();
      const isAuthenticated = !currentUrl.includes('login') && 
                            (currentUrl.includes('dashboard') || 
                             currentUrl.includes('home') || 
                             currentUrl.includes('search') ||
                             currentUrl.includes('frontdoor') ||
                             currentUrl.includes('communities'));
      
      console.log(`Authentication ${isAuthenticated ? 'SUCCESSFUL' : 'FAILED'}`);
      
      if (isAuthenticated) {
        // Try to search for MAALI GROUP specifically
        console.log('Attempting to search for MAALI GROUP...');
        
        try {
          // Navigate to search page
          await page.goto('https://ibd.supplynation.org.au/public/s/search', {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });
          
          // Wait for search box
          await page.waitForSelector('input[type="search"], input[name="search"], .search-input', { timeout: 10000 });
          
          // Search for MAALI GROUP
          await page.type('input[type="search"], input[name="search"], .search-input', 'MAALI GROUP');
          await page.keyboard.press('Enter');
          
          // Wait for results
          await page.waitForTimeout(5000);
          
          console.log('Search results URL:', page.url());
          await page.screenshot({ path: 'search-results.png' });
          
          // Look for business results
          const businessElements = await page.$$('.business-card, .supplier-card, .result-item, .business-item');
          console.log(`Found ${businessElements.length} business elements`);
          
          for (let i = 0; i < Math.min(businessElements.length, 3); i++) {
            const element = businessElements[i];
            const text = await element.evaluate(el => el.textContent);
            console.log(`Business ${i + 1}:`, text?.substring(0, 200));
          }
          
        } catch (searchError) {
          console.error('Search error:', searchError);
        }
      }
      
    } catch (formError) {
      console.error('Form interaction error:', formError);
      
      // Get page content for debugging
      const content = await page.content();
      console.log('Page content sample:', content.substring(0, 500));
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testSupplyNationAuth().catch(console.error);