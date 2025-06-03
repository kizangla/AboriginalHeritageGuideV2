/**
 * Supply Nation Ultimate Session Optimizer
 * Advanced multi-strategy authentication with timeout elimination
 */

import puppeteer from 'puppeteer';

export interface UltimateOptimizationResult {
  sessionEstablished: boolean;
  businessSearchReady: boolean;
  optimizationMetrics: {
    strategy: string;
    attempts: number;
    successfulStrategy: string;
    totalTime: number;
    sessionTime: number;
    searchTime: number;
  };
  sessionDetails: {
    authenticatedUrl: string;
    redirectFlow: string[];
    sessionCookies: any[];
    searchCapabilities: boolean;
  };
  searchResults?: any[];
  optimization: string;
}

export class SupplyNationUltimateOptimizer {
  private strategies = [
    'progressive_timing',
    'extended_monitoring',
    'persistent_session',
    'adaptive_timing'
  ];

  async optimizeSessionEstablishment(testQuery: string = 'test'): Promise<UltimateOptimizationResult> {
    const startTime = Date.now();
    const optimizationMetrics = {
      strategy: '',
      attempts: 0,
      successfulStrategy: '',
      totalTime: 0,
      sessionTime: 0,
      searchTime: 0
    };
    const sessionDetails = {
      authenticatedUrl: '',
      redirectFlow: [] as string[],
      sessionCookies: [] as any[],
      searchCapabilities: false
    };

    const credentials = {
      username: process.env.SUPPLY_NATION_USERNAME,
      password: process.env.SUPPLY_NATION_PASSWORD
    };

    if (!credentials.username || !credentials.password) {
      return {
        sessionEstablished: false,
        businessSearchReady: false,
        optimizationMetrics: { ...optimizationMetrics, totalTime: Date.now() - startTime },
        sessionDetails,
        optimization: 'Supply Nation credentials required for session optimization'
      };
    }

    // Try each optimization strategy
    for (const strategy of this.strategies) {
      optimizationMetrics.attempts++;
      optimizationMetrics.strategy = strategy;

      try {
        const result = await this.executeOptimizationStrategy(
          strategy,
          credentials,
          testQuery,
          sessionDetails
        );

        if (result.success) {
          optimizationMetrics.successfulStrategy = strategy;
          optimizationMetrics.sessionTime = result.sessionTime;
          optimizationMetrics.searchTime = result.searchTime;
          optimizationMetrics.totalTime = Date.now() - startTime;

          return {
            sessionEstablished: true,
            businessSearchReady: result.searchReady,
            optimizationMetrics,
            sessionDetails,
            searchResults: result.searchResults,
            optimization: `Session establishment optimized using ${strategy} strategy in ${optimizationMetrics.totalTime}ms`
          };
        }
      } catch (error) {
        console.log(`Strategy ${strategy} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    optimizationMetrics.totalTime = Date.now() - startTime;
    return {
      sessionEstablished: false,
      businessSearchReady: false,
      optimizationMetrics,
      sessionDetails,
      optimization: `All optimization strategies attempted. Session establishment requires further refinement after ${optimizationMetrics.totalTime}ms`
    };
  }

  private async executeOptimizationStrategy(
    strategy: string,
    credentials: any,
    testQuery: string,
    sessionDetails: any
  ): Promise<{
    success: boolean;
    sessionTime: number;
    searchTime: number;
    searchReady: boolean;
    searchResults?: any[];
  }> {
    const sessionStart = Date.now();
    let browser = null;
    let page = null;

    try {
      // Initialize browser with strategy-specific optimizations
      browser = await this.initializeBrowserForStrategy(strategy);
      page = await browser.newPage();
      
      await this.configurePage(page, strategy);

      // Execute authentication with strategy-specific timing
      const authResult = await this.executeAuthenticationStrategy(page, credentials, strategy, sessionDetails);
      
      if (!authResult.authenticated) {
        await browser.close();
        return { success: false, sessionTime: 0, searchTime: 0, searchReady: false };
      }

      const sessionTime = Date.now() - sessionStart;

      // Test search capabilities
      const searchStart = Date.now();
      const searchResult = await this.testSearchCapabilities(page, testQuery, strategy);
      const searchTime = Date.now() - searchStart;

      sessionDetails.searchCapabilities = searchResult.capable;

      await browser.close();

      return {
        success: authResult.authenticated,
        sessionTime,
        searchTime,
        searchReady: searchResult.capable,
        searchResults: searchResult.results
      };

    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }

  private async initializeBrowserForStrategy(strategy: string): Promise<puppeteer.Browser> {
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ];

    const strategyArgs = {
      progressive_timing: [
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows'
      ],
      extended_monitoring: [
        '--disable-features=VizDisplayCompositor',
        '--disable-renderer-backgrounding'
      ],
      persistent_session: [
        '--disable-extensions',
        '--disable-default-apps',
        '--no-first-run'
      ],
      adaptive_timing: [
        '--disable-sync',
        '--disable-translate',
        '--disable-plugins'
      ]
    };

    return await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
      args: [...baseArgs, ...(strategyArgs[strategy as keyof typeof strategyArgs] || [])]
    });
  }

  private async configurePage(page: puppeteer.Page, strategy: string): Promise<void> {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1366, height: 768 });

    const timeouts = {
      progressive_timing: 90000,
      extended_monitoring: 120000,
      persistent_session: 150000,
      adaptive_timing: 180000
    };

    const timeout = timeouts[strategy as keyof typeof timeouts] || 90000;
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);
  }

  private async executeAuthenticationStrategy(
    page: puppeteer.Page,
    credentials: any,
    strategy: string,
    sessionDetails: any
  ): Promise<{ authenticated: boolean }> {
    // Navigate to login
    await page.goto('https://ibd.supplynation.org.au/s/login', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    sessionDetails.redirectFlow.push(await page.url());

    // Apply strategy-specific stabilization
    await this.applyStrategyStabilization(page, strategy);

    // Enter credentials with strategy timing
    const credentialsSet = await this.enterCredentialsWithStrategy(page, credentials, strategy);
    if (!credentialsSet) return { authenticated: false };

    // Submit form with strategy timing
    const formSubmitted = await this.submitFormWithStrategy(page, strategy);
    if (!formSubmitted) return { authenticated: false };

    // Monitor authentication with strategy-specific approach
    const authResult = await this.monitorAuthenticationWithStrategy(page, strategy, sessionDetails);
    
    return { authenticated: authResult.success };
  }

  private async applyStrategyStabilization(page: puppeteer.Page, strategy: string): Promise<void> {
    const stabilizationTimes = {
      progressive_timing: [3000, 5000, 7000],
      extended_monitoring: [5000, 8000, 12000],
      persistent_session: [4000, 7000, 10000],
      adaptive_timing: [2000, 4000, 6000, 8000]
    };

    const times = stabilizationTimes[strategy as keyof typeof stabilizationTimes] || [3000];

    for (const time of times) {
      await new Promise(resolve => setTimeout(resolve, time));
      
      const pageReady = await page.evaluate(() => {
        return document.readyState === 'complete' &&
               document.querySelector('input[type="email"], input[type="text"]') !== null &&
               document.querySelector('input[type="password"]') !== null &&
               document.querySelector('button[type="submit"]') !== null;
      });

      if (pageReady) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Final stabilization
        return;
      }
    }
  }

  private async enterCredentialsWithStrategy(page: puppeteer.Page, credentials: any, strategy: string): Promise<boolean> {
    const maxAttempts = strategy === 'persistent_session' ? 12 : 8;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await page.evaluate((usr, pwd) => {
          const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
          const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
          
          if (!emailField || !passwordField) return { success: false };

          emailField.value = '';
          passwordField.value = '';

          emailField.focus();
          emailField.value = usr;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));

          setTimeout(() => {
            passwordField.focus();
            passwordField.value = pwd;
            passwordField.dispatchEvent(new Event('input', { bubbles: true }));
            passwordField.dispatchEvent(new Event('change', { bubbles: true }));
          }, 300);

          return { 
            success: true,
            emailLength: emailField.value.length,
            passwordLength: passwordField.value.length
          };
        }, credentials.username, credentials.password);

        if (result.success) {
          // Strategy-specific validation delay
          const delays = {
            progressive_timing: 2000,
            extended_monitoring: 3000,
            persistent_session: 4000,
            adaptive_timing: 1500
          };
          
          await new Promise(resolve => setTimeout(resolve, delays[strategy as keyof typeof delays] || 2000));
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.log(`Credential attempt ${attempt} error:`, error);
      }
    }

    return false;
  }

  private async submitFormWithStrategy(page: puppeteer.Page, strategy: string): Promise<boolean> {
    const maxAttempts = strategy === 'extended_monitoring' ? 6 : 4;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const submitted = await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"]') as HTMLElement;
          if (submitButton && !submitButton.hasAttribute('disabled')) {
            submitButton.click();
            return true;
          }
          return false;
        });

        if (submitted) {
          // Strategy-specific processing delay
          const delays = {
            progressive_timing: 4000,
            extended_monitoring: 6000,
            persistent_session: 5000,
            adaptive_timing: 3000
          };
          
          await new Promise(resolve => setTimeout(resolve, delays[strategy as keyof typeof delays] || 4000));
          return true;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.log(`Form submission attempt ${attempt} error:`, error);
      }
    }

    return false;
  }

  private async monitorAuthenticationWithStrategy(
    page: puppeteer.Page,
    strategy: string,
    sessionDetails: any
  ): Promise<{ success: boolean }> {
    const monitoringDurations = {
      progressive_timing: 45000,
      extended_monitoring: 90000,
      persistent_session: 60000,
      adaptive_timing: 75000
    };

    const checkIntervals = {
      progressive_timing: 3000,
      extended_monitoring: 4000,
      persistent_session: 3500,
      adaptive_timing: 2500
    };

    const maxTime = monitoringDurations[strategy as keyof typeof monitoringDurations] || 45000;
    const interval = checkIntervals[strategy as keyof typeof checkIntervals] || 3000;

    const startTime = Date.now();
    let previousUrl = await page.url();

    while ((Date.now() - startTime) < maxTime) {
      await new Promise(resolve => setTimeout(resolve, interval));
      
      const currentUrl = await page.url();
      
      if (currentUrl !== previousUrl) {
        sessionDetails.redirectFlow.push(currentUrl);
        previousUrl = currentUrl;
      }

      const authCheck = await page.evaluate(() => {
        const url = window.location.href;
        const content = document.body.innerText.toLowerCase();
        
        const successIndicators = [
          !url.includes('login'),
          url.includes('Communities') || url.includes('communities'),
          url.includes('search-results') || url.includes('search'),
          content.includes('search'),
          content.includes('directory'),
          content.includes('logout'),
          document.querySelector('a[href*="logout"]') !== null,
          document.querySelector('.user-menu') !== null
        ].filter(Boolean).length;

        return {
          currentUrl: url,
          successCount: successIndicators,
          contentLength: content.length
        };
      });

      sessionDetails.authenticatedUrl = authCheck.currentUrl;

      // Strategy-specific success thresholds
      const thresholds = {
        progressive_timing: 4,
        extended_monitoring: 5,
        persistent_session: 4,
        adaptive_timing: 3
      };

      const threshold = thresholds[strategy as keyof typeof thresholds] || 4;

      if (authCheck.successCount >= threshold) {
        sessionDetails.sessionCookies = await page.cookies();
        return { success: true };
      }
    }

    return { success: false };
  }

  private async testSearchCapabilities(page: puppeteer.Page, testQuery: string, strategy: string): Promise<{
    capable: boolean;
    results?: any[];
  }> {
    try {
      // Navigate to search if needed
      const currentUrl = await page.url();
      if (!currentUrl.includes('search-results') && !currentUrl.includes('search')) {
        await page.goto('https://ibd.supplynation.org.au/public/s/search-results', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        await new Promise(resolve => setTimeout(resolve, 4000));
      }

      // Test search functionality
      const searchExecuted = await page.evaluate((query) => {
        const searchInput = document.querySelector('input[type="search"], input[name*="search"]') as HTMLInputElement;
        
        if (searchInput && searchInput.offsetHeight > 0) {
          searchInput.value = query;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          const form = searchInput.closest('form');
          if (form) {
            form.submit();
            return true;
          }
        }
        return false;
      }, testQuery);

      if (!searchExecuted) {
        return { capable: false };
      }

      // Wait for results with strategy timing
      const waitTimes = {
        progressive_timing: 5000,
        extended_monitoring: 7000,
        persistent_session: 6000,
        adaptive_timing: 4000
      };

      await new Promise(resolve => setTimeout(resolve, waitTimes[strategy as keyof typeof waitTimes] || 5000));

      // Extract search results
      const results = await page.evaluate(() => {
        const profileLinks = document.querySelectorAll('a[href*="supplierprofile"]');
        const businesses: any[] = [];

        profileLinks.forEach((link) => {
          const companyName = link.textContent?.trim();
          const profileUrl = (link as HTMLAnchorElement).href;
          
          if (companyName && profileUrl) {
            businesses.push({
              companyName,
              profileUrl,
              verified: true,
              source: 'supply_nation'
            });
          }
        });

        return businesses;
      });

      return {
        capable: true,
        results
      };

    } catch (error) {
      return { capable: false };
    }
  }
}

export const supplyNationUltimateOptimizer = new SupplyNationUltimateOptimizer();