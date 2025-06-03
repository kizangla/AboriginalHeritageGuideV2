/**
 * Supply Nation Connection Analyzer
 * Comprehensive timing analysis and session establishment optimization
 */

import puppeteer from 'puppeteer';

export interface ConnectionAnalysisResult {
  analysisComplete: boolean;
  connectionSuccessful: boolean;
  timingData: {
    pageLoadTime: number;
    formInteractionTime: number;
    submissionProcessingTime: number;
    redirectAnalysisTime: number;
    sessionValidationTime: number;
    totalAnalysisTime: number;
  };
  redirectFlow: {
    sequence: string[];
    timings: number[];
    finalDestination: string;
    redirectCount: number;
  };
  sessionIndicators: {
    authenticationElements: string[];
    searchFunctionality: boolean;
    userMenuPresent: boolean;
    logoutOptionAvailable: boolean;
    directoryAccess: boolean;
  };
  optimizationRecommendations: string[];
  analysisLog: string[];
  connectionStatus: string;
}

export class SupplyNationConnectionAnalyzer {
  
  async analyzeConnectionTiming(): Promise<ConnectionAnalysisResult> {
    const analysisStart = Date.now();
    const timingData = {
      pageLoadTime: 0,
      formInteractionTime: 0,
      submissionProcessingTime: 0,
      redirectAnalysisTime: 0,
      sessionValidationTime: 0,
      totalAnalysisTime: 0
    };
    const redirectFlow = {
      sequence: [] as string[],
      timings: [] as number[],
      finalDestination: '',
      redirectCount: 0
    };
    const sessionIndicators = {
      authenticationElements: [] as string[],
      searchFunctionality: false,
      userMenuPresent: false,
      logoutOptionAvailable: false,
      directoryAccess: false
    };
    const optimizationRecommendations: string[] = [];
    const analysisLog: string[] = [];
    
    let browser = null;
    let page = null;

    try {
      const credentials = {
        username: process.env.SUPPLY_NATION_USERNAME,
        password: process.env.SUPPLY_NATION_PASSWORD
      };

      if (!credentials.username || !credentials.password) {
        return {
          analysisComplete: false,
          connectionSuccessful: false,
          timingData: { ...timingData, totalAnalysisTime: Date.now() - analysisStart },
          redirectFlow,
          sessionIndicators,
          optimizationRecommendations: ['Supply Nation credentials required for connection analysis'],
          analysisLog: ['Authentication credentials not available'],
          connectionStatus: 'Credentials required for analysis'
        };
      }

      analysisLog.push('Initiating comprehensive connection timing analysis');
      analysisLog.push(`Credentials configured: ${credentials.username.length} char username, ${credentials.password.length} char password`);

      // Browser initialization with optimized configuration
      browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security'
        ]
      });

      page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1366, height: 768 });

      // Phase 1: Page Load Analysis
      analysisLog.push('Phase 1: Analyzing page load timing');
      const pageLoadStart = Date.now();
      
      await page.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      timingData.pageLoadTime = Date.now() - pageLoadStart;
      redirectFlow.sequence.push(await page.url());
      redirectFlow.timings.push(timingData.pageLoadTime);
      
      analysisLog.push(`Page loaded in ${timingData.pageLoadTime}ms`);

      // Wait for form stabilization
      await new Promise(resolve => setTimeout(resolve, 4000));

      // Phase 2: Form Interaction Analysis
      analysisLog.push('Phase 2: Analyzing form interaction timing');
      const formInteractionStart = Date.now();

      const formAnalysis = await page.evaluate((username, password) => {
        const emailField = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordField = document.querySelector('input[type="password"]') as HTMLInputElement;
        const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;

        const analysis = {
          emailFieldFound: !!emailField,
          passwordFieldFound: !!passwordField,
          submitButtonFound: !!submitButton,
          formElementsAccessible: false,
          credentialsSet: false
        };

        if (emailField && passwordField && submitButton) {
          analysis.formElementsAccessible = true;

          // Set credentials
          emailField.focus();
          emailField.value = username;
          emailField.dispatchEvent(new Event('input', { bubbles: true }));
          emailField.dispatchEvent(new Event('change', { bubbles: true }));

          passwordField.focus();
          passwordField.value = password;
          passwordField.dispatchEvent(new Event('input', { bubbles: true }));
          passwordField.dispatchEvent(new Event('change', { bubbles: true }));

          analysis.credentialsSet = emailField.value === username && passwordField.value === password;
        }

        return analysis;
      }, credentials.username, credentials.password);

      timingData.formInteractionTime = Date.now() - formInteractionStart;
      analysisLog.push(`Form interaction completed in ${timingData.formInteractionTime}ms`);
      analysisLog.push(`Form analysis: Email=${formAnalysis.emailFieldFound}, Password=${formAnalysis.passwordFieldFound}, Submit=${formAnalysis.submitButtonFound}, Accessible=${formAnalysis.formElementsAccessible}, Credentials set=${formAnalysis.credentialsSet}`);

      if (!formAnalysis.formElementsAccessible || !formAnalysis.credentialsSet) {
        optimizationRecommendations.push('Form element accessibility requires enhancement');
        optimizationRecommendations.push('Credential input timing needs optimization');
      }

      // Phase 3: Submission Processing Analysis
      analysisLog.push('Phase 3: Analyzing submission processing timing');
      const submissionStart = Date.now();

      if (formAnalysis.credentialsSet) {
        await page.evaluate(() => {
          const submitButton = document.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement;
          if (submitButton) {
            submitButton.click();
          }
        });

        // Monitor submission processing
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      timingData.submissionProcessingTime = Date.now() - submissionStart;
      analysisLog.push(`Submission processing analyzed in ${timingData.submissionProcessingTime}ms`);

      // Phase 4: Redirect Flow Analysis
      analysisLog.push('Phase 4: Analyzing redirect flow and timing');
      const redirectAnalysisStart = Date.now();

      // Monitor for up to 30 seconds for redirect sequence
      const redirectMonitoringDuration = 30000;
      const redirectCheckInterval = 2000;
      let previousUrl = await page.url();
      const redirectStartTime = Date.now();

      while ((Date.now() - redirectStartTime) < redirectMonitoringDuration) {
        await new Promise(resolve => setTimeout(resolve, redirectCheckInterval));
        
        const currentUrl = await page.url();
        
        if (currentUrl !== previousUrl) {
          redirectFlow.redirectCount++;
          redirectFlow.sequence.push(currentUrl);
          redirectFlow.timings.push(Date.now() - redirectStartTime);
          
          analysisLog.push(`Redirect ${redirectFlow.redirectCount}: ${currentUrl} (${Date.now() - redirectStartTime}ms)`);
          previousUrl = currentUrl;

          // Check for authentication success indicators
          const authCheck = await page.evaluate(() => {
            const url = window.location.href;
            const content = document.body.innerText.toLowerCase();
            
            return {
              url,
              hasSearch: content.includes('search'),
              hasDirectory: content.includes('directory'),
              hasLogout: document.querySelector('a[href*="logout"]') !== null,
              hasProfile: document.querySelector('a[href*="profile"]') !== null,
              hasUserMenu: document.querySelector('.user-menu, .profile-menu') !== null,
              contentLength: content.length
            };
          });

          if (authCheck.hasSearch || authCheck.hasDirectory || authCheck.hasLogout) {
            analysisLog.push(`Authentication indicators detected: Search=${authCheck.hasSearch}, Directory=${authCheck.hasDirectory}, Logout=${authCheck.hasLogout}`);
            break;
          }
        }
      }

      redirectFlow.finalDestination = await page.url();
      timingData.redirectAnalysisTime = Date.now() - redirectAnalysisStart;
      analysisLog.push(`Redirect analysis completed in ${timingData.redirectAnalysisTime}ms with ${redirectFlow.redirectCount} redirects`);

      // Phase 5: Session Validation Analysis
      analysisLog.push('Phase 5: Analyzing session validation indicators');
      const sessionValidationStart = Date.now();

      const sessionAnalysis = await page.evaluate(() => {
        const currentUrl = window.location.href;
        const pageContent = document.body.innerText.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        
        const authElements: string[] = [];
        
        // Check for authentication elements
        if (document.querySelector('a[href*="logout"]')) authElements.push('logout_link');
        if (document.querySelector('a[href*="profile"]')) authElements.push('profile_link');
        if (document.querySelector('.user-menu, .profile-menu')) authElements.push('user_menu');
        if (document.querySelector('input[type="search"]')) authElements.push('search_input');
        if (pageContent.includes('search')) authElements.push('search_content');
        if (pageContent.includes('directory')) authElements.push('directory_content');
        if (pageContent.includes('indigenous business')) authElements.push('business_content');
        
        return {
          currentUrl,
          pageTitle,
          authElements,
          searchFunctionality: document.querySelectorAll('input[type="search"], input[name*="search"]').length > 0,
          userMenuPresent: document.querySelector('.user-menu, .profile-menu') !== null,
          logoutOptionAvailable: document.querySelector('a[href*="logout"]') !== null,
          directoryAccess: pageContent.includes('directory') || pageContent.includes('business'),
          contentLength: pageContent.length
        };
      });

      sessionIndicators.authenticationElements = sessionAnalysis.authElements;
      sessionIndicators.searchFunctionality = sessionAnalysis.searchFunctionality;
      sessionIndicators.userMenuPresent = sessionAnalysis.userMenuPresent;
      sessionIndicators.logoutOptionAvailable = sessionAnalysis.logoutOptionAvailable;
      sessionIndicators.directoryAccess = sessionAnalysis.directoryAccess;

      timingData.sessionValidationTime = Date.now() - sessionValidationStart;
      analysisLog.push(`Session validation completed in ${timingData.sessionValidationTime}ms`);
      analysisLog.push(`Session indicators: ${sessionAnalysis.authElements.join(', ')}`);

      await browser.close();

      // Generate optimization recommendations
      this.generateOptimizationRecommendations(
        timingData,
        redirectFlow,
        sessionIndicators,
        optimizationRecommendations,
        analysisLog
      );

      timingData.totalAnalysisTime = Date.now() - analysisStart;

      // Determine connection success
      const connectionSuccessful = sessionIndicators.authenticationElements.length >= 3 ||
                                 (sessionIndicators.searchFunctionality && sessionIndicators.directoryAccess);

      analysisLog.push(`Analysis complete: Connection ${connectionSuccessful ? 'successful' : 'requires optimization'}`);

      return {
        analysisComplete: true,
        connectionSuccessful,
        timingData,
        redirectFlow,
        sessionIndicators,
        optimizationRecommendations,
        analysisLog,
        connectionStatus: connectionSuccessful ? 
          'Connection established successfully' : 
          'Connection timing requires optimization'
      };

    } catch (error) {
      if (browser) await browser.close();
      timingData.totalAnalysisTime = Date.now() - analysisStart;
      analysisLog.push(`Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        analysisComplete: false,
        connectionSuccessful: false,
        timingData,
        redirectFlow,
        sessionIndicators,
        optimizationRecommendations: ['Error handling optimization required'],
        analysisLog,
        connectionStatus: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private generateOptimizationRecommendations(
    timingData: any,
    redirectFlow: any,
    sessionIndicators: any,
    recommendations: string[],
    log: string[]
  ): void {
    log.push('Generating optimization recommendations based on analysis');

    // Page load optimization
    if (timingData.pageLoadTime > 15000) {
      recommendations.push('Page load time exceeds optimal threshold - consider connection timeout adjustments');
    }

    // Form interaction optimization
    if (timingData.formInteractionTime > 8000) {
      recommendations.push('Form interaction timing requires optimization - implement progressive field validation');
    }

    // Redirect flow optimization
    if (redirectFlow.redirectCount === 0) {
      recommendations.push('No redirects detected - authentication submission may require timing adjustments');
    } else if (redirectFlow.redirectCount > 5) {
      recommendations.push('Excessive redirect count detected - implement redirect sequence optimization');
    }

    // Session establishment optimization
    if (sessionIndicators.authenticationElements.length === 0) {
      recommendations.push('No authentication elements detected - session establishment requires enhancement');
    } else if (sessionIndicators.authenticationElements.length < 3) {
      recommendations.push('Limited authentication indicators - session validation timing needs improvement');
    }

    // Search functionality optimization
    if (!sessionIndicators.searchFunctionality) {
      recommendations.push('Search functionality not accessible - navigation timing optimization required');
    }

    // Overall timing optimization
    if (timingData.totalAnalysisTime > 60000) {
      recommendations.push('Overall process timing exceeds threshold - implement comprehensive timeout optimization');
    }

    // Success indicators
    if (sessionIndicators.authenticationElements.length >= 3) {
      recommendations.push('Strong authentication indicators detected - connection timing is optimal');
    }

    if (sessionIndicators.searchFunctionality && sessionIndicators.directoryAccess) {
      recommendations.push('Full directory access confirmed - session establishment successful');
    }

    log.push(`Generated ${recommendations.length} optimization recommendations`);
  }
}

export const supplyNationConnectionAnalyzer = new SupplyNationConnectionAnalyzer();