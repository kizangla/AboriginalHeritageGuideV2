/**
 * Supply Nation URL and Element Analysis
 * Comprehensive mapping of all discovered URLs, selectors, and patterns
 */

export interface SupplyNationMapping {
  urls: {
    primary: string[];
    login: string[];
    search: string[];
    profile: string[];
  };
  selectors: {
    authentication: string[];
    forms: string[];
    buttons: string[];
    results: string[];
    modals: string[];
  };
  patterns: {
    authentication: string[];
    businessData: string[];
    navigation: string[];
  };
}

export const supplyNationMapping: SupplyNationMapping = {
  urls: {
    primary: [
      'https://supplynation.org.au/',
      'https://ibd.supplynation.org.au/',
      'https://ibd.supplynation.org.au/public/'
    ],
    login: [
      'https://ibd.supplynation.org.au/s/login',
      'https://ibd.supplynation.org.au/public/s/login/',
      'https://ibd.supplynation.org.au/login'
    ],
    search: [
      'https://ibd.supplynation.org.au/s/search-results',
      'https://ibd.supplynation.org.au/public/s/search-results',
      'https://ibd.supplynation.org.au/s/search'
    ],
    profile: [
      'https://ibd.supplynation.org.au/supplierprofile',
      'https://ibd.supplynation.org.au/s/supplierprofile'
    ]
  },
  selectors: {
    authentication: [
      // Email/Username inputs
      'input[type="email"]',
      'input[type="text"]',
      'input[name*="email"]',
      'input[name*="username"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="username" i]',
      
      // Password inputs
      'input[type="password"]',
      'input[name*="password"]',
      'input[placeholder*="password" i]',
      
      // Authentication indicators
      'searchIBDButton',
      'Search Indigenous Business',
      'Indigenous Business Directory',
      'Communities Landing'
    ],
    forms: [
      'form',
      '.login-form',
      '.auth-form',
      '.slds-form'
    ],
    buttons: [
      // Submit buttons
      'button[type="submit"]',
      'input[type="submit"]',
      'button:contains("Login")',
      'button:contains("Sign In")',
      
      // Close buttons for modals
      '.close',
      '.modal-close',
      '[aria-label="Close"]',
      'button[title="Close"]',
      '.slds-button_icon',
      '.fa-times',
      '.cancel',
      '[data-dismiss="modal"]'
    ],
    results: [
      // Business listing containers
      '.business-result',
      '.search-result',
      '.supplier-listing',
      '.business-card',
      '.company-listing',
      'article',
      '.result-item',
      '.business-profile',
      '.supplier-card',
      '.listing',
      '.search-item',
      '.business-entry',
      
      // Supply Nation specific
      'p.slds-text-heading_medium.main-header',
      '.main-header',
      'a[href*="supplierprofile"][data-supplierid]',
      'a[href*="supplierprofile"]',
      
      // Content selectors
      'h1', 'h2', 'h3', 'h4', 'h5',
      '.name', '.company-name', '.business-name', '.title',
      '.location', '.address', '.suburb', '.state', '.postcode',
      '.description', '.summary', '.business-description',
      '.category', '.tag', '.service', '.industry', '.sector'
    ],
    modals: [
      '.modal',
      '.popup',
      '.overlay',
      '[role="dialog"]',
      '.slds-modal',
      '.slds-backdrop',
      '.welcome-modal',
      '.notification-modal',
      '.survey-modal',
      '.feedback-modal'
    ]
  },
  patterns: {
    authentication: [
      // URL patterns for authenticated state
      '!window.location.href.includes(\'/login\')',
      'window.location.href.includes(\'supplynation.org.au\')',
      'document.title',
      'document.body.innerText'
    ],
    businessData: [
      // Profile URL patterns
      'supplierprofile\\?accid=([a-zA-Z0-9]+)',
      'data-supplierid',
      'data-accountid',
      
      // ABN patterns
      '\\b\\d{11}\\b',
      
      // Phone patterns
      '\\b(?:\\+61[\\s-]?)?\\d{2,4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b',
      '\\b0\\d[\\s-]?\\d{4}[\\s-]?\\d{4}\\b',
      
      // Email patterns
      '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b'
    ],
    navigation: [
      // Search input selectors
      'input[type="search"]',
      'input[name*="search"]',
      'input[placeholder*="search" i]',
      'input[placeholder*="business" i]',
      'input[placeholder*="company" i]',
      '.search-input',
      '#search',
      '[data-search]',
      'input[aria-label*="search" i]'
    ]
  }
};

export class SupplyNationUrlElementAnalyzer {
  
  static getAllLoginUrls(): string[] {
    return supplyNationMapping.urls.login;
  }
  
  static getAllSearchUrls(): string[] {
    return supplyNationMapping.urls.search;
  }
  
  static getAuthenticationSelectors(): string[] {
    return [
      ...supplyNationMapping.selectors.authentication,
      ...supplyNationMapping.selectors.forms
    ];
  }
  
  static getBusinessResultSelectors(): string[] {
    return supplyNationMapping.selectors.results;
  }
  
  static getSearchInputSelectors(): string[] {
    return supplyNationMapping.patterns.navigation;
  }
  
  static getModalDismissSelectors(): string[] {
    return [
      ...supplyNationMapping.selectors.modals,
      ...supplyNationMapping.selectors.buttons.filter(sel => 
        sel.includes('close') || sel.includes('Close') || sel.includes('cancel')
      )
    ];
  }
  
  static getAuthenticationIndicators(): string[] {
    return [
      'searchIBDButton',
      'Search Indigenous Business',
      'Indigenous Business Directory',
      'Communities Landing'
    ];
  }
  
  static getBusinessDataPatterns(): RegExp[] {
    return supplyNationMapping.patterns.businessData.map(pattern => new RegExp(pattern, 'g'));
  }
}