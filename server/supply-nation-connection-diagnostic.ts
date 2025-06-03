/**
 * Supply Nation Connection Diagnostic
 * Comprehensive analysis and optimization for session establishment
 */

import puppeteer from 'puppeteer';

export interface ConnectionDiagnostic {
  stage: string;
  success: boolean;
  details: string;
  timing: number;
  error?: string;
}

export interface SessionDiagnosticResult {
  overall: 'success' | 'partial' | 'failed';
  diagnostics: ConnectionDiagnostic[];
  recommendations: string[];
  sessionData?: {
    cookiesCount: number;
    authTokensFound: boolean;
    sessionPersistable: boolean;
  };
}

export class SupplyNationConnectionDiagnostic {
  private browser: puppeteer.Browser | null = null;
  private page: puppeteer.Page | null = null;
  private diagnostics: ConnectionDiagnostic[] = [];

  async runComprehensiveDiagnostic(): Promise<SessionDiagnosticResult> {
    try {
      console.log('Starting comprehensive Supply Nation connection diagnostic...');
      
      await this.initializeBrowser();
      await this.testNetworkConnectivity();
      await this.testPageAccess();
      await this.analyzeLoginForm();
      await this.testCredentialValidation();
      await this.analyzeSessionPersistence();
      
      const result = this.generateDiagnosticReport();
      await this.cleanup();
      
      return result;
    } catch (error) {
      console.error('Diagnostic failed:', (error as Error).message);
      await this.cleanup();
      
      return {
        overall: 'failed',
        diagnostics: this.diagnostics,
        recommendations: ['Diagnostic process encountered critical error', 'Check network connectivity and credentials']
      };
    }
  }

  private async initializeBrowser(): Promise<void> {
    const startTime = Date.now();
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
        ]
      });

      this.page = await this.browser.newPage();
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
      
      this.addDiagnostic('browser_initialization', true, 'Browser initialized successfully', Date.now() - startTime);
    } catch (error) {
      this.addDiagnostic('browser_initialization', false, 'Browser initialization failed', Date.now() - startTime, (error as Error).message);
      throw error;
    }
  }

  private async testNetworkConnectivity(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity to Supply Nation domain
      const response = await this.page?.goto('https://supplynation.org.au/', {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      if (response?.status() === 200) {
        this.addDiagnostic('network_connectivity', true, 'Supply Nation domain accessible', Date.now() - startTime);
      } else {
        this.addDiagnostic('network_connectivity', false, `HTTP ${response?.status()}`, Date.now() - startTime);
      }
    } catch (error) {
      this.addDiagnostic('network_connectivity', false, 'Network connectivity test failed', Date.now() - startTime, (error as Error).message);
    }
  }

  private async testPageAccess(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Test access to login page specifically
      const response = await this.page?.goto('https://ibd.supplynation.org.au/s/login', {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const currentUrl = this.page?.url();
      const pageTitle = await this.page?.title();
      
      if (response?.status() === 200 && currentUrl?.includes('supplynation.org.au')) {
        this.addDiagnostic('page_access', true, `Login page accessible (${pageTitle})`, Date.now() - startTime);
      } else {
        this.addDiagnostic('page_access', false, `Page access issue: ${response?.status()}`, Date.now() - startTime);
      }
    } catch (error) {
      this.addDiagnostic('page_access', false, 'Login page access failed', Date.now() - startTime, (error as Error).message);
    }
  }

  private async analyzeLoginForm(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Wait for form elements
      await this.page?.waitForTimeout(3000);
      
      const formAnalysis = await this.page?.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const emailInputs = document.querySelectorAll('input[type="email"], input[type="text"]');
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        const submitButtons = document.querySelectorAll('button[type="submit"], input[type="submit"]');
        
        return {
          formsFound: forms.length,
          emailInputsFound: emailInputs.length,
          passwordInputsFound: passwordInputs.length,
          submitButtonsFound: submitButtons.length,
          hasLoginForm: emailInputs.length > 0 && passwordInputs.length > 0,
          formSelectors: Array.from(forms).map(form => form.className || form.id || 'unnamed-form')
        };
      });
      
      if (formAnalysis?.hasLoginForm) {
        this.addDiagnostic('login_form_detection', true, 
          `Login form detected: ${formAnalysis.emailInputsFound} email, ${formAnalysis.passwordInputsFound} password, ${formAnalysis.submitButtonsFound} submit`, 
          Date.now() - startTime);
      } else {
        this.addDiagnostic('login_form_detection', false, 
          `Form detection incomplete: ${formAnalysis?.formsFound || 0} forms found`, 
          Date.now() - startTime);
      }
    } catch (error) {
      this.addDiagnostic('login_form_detection', false, 'Form analysis failed', Date.now() - startTime, (error as Error).message);
    }
  }

  private async testCredentialValidation(): Promise<void> {
    const startTime = Date.now();
    
    try {
      const username = process.env.SUPPLY_NATION_USERNAME;
      const password = process.env.SUPPLY_NATION_PASSWORD;
      
      if (!username || !password) {
        this.addDiagnostic('credential_validation', false, 'Supply Nation credentials not provided', Date.now() - startTime);
        return;
      }
      
      // Test credential input without submission
      const credentialTest = await this.page?.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"], input[type="text"]') as HTMLInputElement;
        const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
        
        if (emailInput && passwordInput) {
          // Test field accessibility
          emailInput.focus();
          passwordInput.focus();
          
          return {
            emailFieldAccessible: !emailInput.disabled && !emailInput.readOnly,
            passwordFieldAccessible: !passwordInput.disabled && !passwordInput.readOnly,
            fieldsVisible: emailInput.offsetHeight > 0 && passwordInput.offsetHeight > 0
          };
        }
        
        return { emailFieldAccessible: false, passwordFieldAccessible: false, fieldsVisible: false };
      });
      
      if (credentialTest?.emailFieldAccessible && credentialTest?.passwordFieldAccessible) {
        this.addDiagnostic('credential_validation', true, 'Credential fields accessible and ready', Date.now() - startTime);
      } else {
        this.addDiagnostic('credential_validation', false, 'Credential fields not properly accessible', Date.now() - startTime);
      }
    } catch (error) {
      this.addDiagnostic('credential_validation', false, 'Credential validation test failed', Date.now() - startTime, (error as Error).message);
    }
  }

  private async analyzeSessionPersistence(): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Analyze page for session-related elements
      const sessionAnalysis = await this.page?.evaluate(() => {
        const scripts = document.querySelectorAll('script');
        let hasAuthTokens = false;
        let hasSessionId = false;
        
        scripts.forEach(script => {
          const content = script.textContent || '';
          if (content.includes('token') || content.includes('csrf') || content.includes('auth')) {
            hasAuthTokens = true;
          }
          if (content.includes('session') || content.includes('Session')) {
            hasSessionId = true;
          }
        });
        
        const cookies = document.cookie;
        const localStorage = window.localStorage;
        const sessionStorage = window.sessionStorage;
        
        return {
          hasAuthTokens,
          hasSessionId,
          cookiesPresent: cookies.length > 0,
          localStorageAvailable: localStorage !== null,
          sessionStorageAvailable: sessionStorage !== null,
          domainCookies: cookies
        };
      });
      
      const cookies = await this.page?.cookies() || [];
      
      const sessionData = {
        cookiesCount: cookies.length,
        authTokensFound: sessionAnalysis?.hasAuthTokens || false,
        sessionPersistable: sessionAnalysis?.localStorageAvailable && sessionAnalysis?.sessionStorageAvailable || false
      };
      
      this.addDiagnostic('session_persistence', true, 
        `Session analysis: ${cookies.length} cookies, tokens: ${sessionData.authTokensFound}, persistable: ${sessionData.sessionPersistable}`, 
        Date.now() - startTime);
        
    } catch (error) {
      this.addDiagnostic('session_persistence', false, 'Session persistence analysis failed', Date.now() - startTime, (error as Error).message);
    }
  }

  private addDiagnostic(stage: string, success: boolean, details: string, timing: number, error?: string): void {
    this.diagnostics.push({
      stage,
      success,
      details,
      timing,
      error
    });
    
    console.log(`[${stage}] ${success ? 'SUCCESS' : 'FAILED'}: ${details} (${timing}ms)${error ? ` - ${error}` : ''}`);
  }

  private generateDiagnosticReport(): SessionDiagnosticResult {
    const successful = this.diagnostics.filter(d => d.success).length;
    const total = this.diagnostics.length;
    
    let overall: 'success' | 'partial' | 'failed';
    if (successful === total) {
      overall = 'success';
    } else if (successful > total / 2) {
      overall = 'partial';
    } else {
      overall = 'failed';
    }
    
    const recommendations: string[] = [];
    
    // Generate specific recommendations based on failures
    this.diagnostics.forEach(diagnostic => {
      if (!diagnostic.success) {
        switch (diagnostic.stage) {
          case 'network_connectivity':
            recommendations.push('Check network connectivity and firewall settings');
            break;
          case 'page_access':
            recommendations.push('Verify Supply Nation login URL accessibility');
            break;
          case 'login_form_detection':
            recommendations.push('Login form structure may have changed - update selectors');
            break;
          case 'credential_validation':
            recommendations.push('Verify Supply Nation credentials are current and valid');
            break;
          case 'session_persistence':
            recommendations.push('Session persistence mechanisms need optimization');
            break;
        }
      }
    });
    
    // Add general recommendations based on overall status
    if (overall === 'failed') {
      recommendations.push('Consider alternative authentication approach or API access');
    } else if (overall === 'partial') {
      recommendations.push('Session establishment requires targeted optimization');
    }
    
    const sessionData = this.diagnostics.find(d => d.stage === 'session_persistence')?.success ? {
      cookiesCount: 0,
      authTokensFound: false,
      sessionPersistable: true
    } : undefined;
    
    return {
      overall,
      diagnostics: this.diagnostics,
      recommendations,
      sessionData
    };
  }

  private async cleanup(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      }
    } catch (error) {
      console.error('Cleanup error:', (error as Error).message);
    }
  }
}

export const supplyNationConnectionDiagnostic = new SupplyNationConnectionDiagnostic();