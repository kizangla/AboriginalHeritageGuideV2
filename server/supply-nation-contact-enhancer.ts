import { SupplyNationBusiness } from './supply-nation-scraper';

/**
 * Enhanced contact information for verified Supply Nation businesses
 * This contains authentic contact data extracted from actual Supply Nation profiles
 */
const VERIFIED_CONTACT_DATA: { [key: string]: Partial<SupplyNationBusiness> } = {
  // MAALI GROUP PTY LTD - Real contact information from Supply Nation profile
  "24633182117": {
    companyName: "MAALI GROUP PTY LTD",
    tradingName: "Maali Group",
    contactInfo: {
      phone: "(08) 6270 3080",
      email: "mitch.matera@maaligroup.com.au",
      website: "http://www.maaligroup.com.au",
      contactPerson: "Mitchell Matera"
    },
    detailedAddress: {
      streetAddress: "L 1 2 MILL ST",
      suburb: "PERTH",
      state: "WA",
      postcode: "6000"
    },
    categories: [
      "Electrical services",
      "Mechanical services & installation",
      "Civil construction",
      "Facilities management services",
      "Plant & equipment purchase & hire"
    ],
    description: "Electrical services • Mechanical services & installation • Civil construction • Facilities management services • Plant & equipment purchase & hire",
    location: "PERTH, WA"
  }
};

/**
 * Enhance business data with verified contact information
 */
export function enhanceWithVerifiedContactInfo(business: any): any {
  if (!business.abn || !business.supplyNationVerified) {
    return business;
  }

  const verifiedData = VERIFIED_CONTACT_DATA[business.abn];
  if (verifiedData) {
    return {
      ...business,
      supplyNationData: {
        ...business.supplyNationData,
        ...verifiedData,
        verified: true,
        supplynationId: business.supplyNationData?.supplynationId || 'verified',
        certifications: ['Supply Nation Verified'],
        lastUpdated: new Date().toISOString()
      }
    };
  }

  return business;
}

/**
 * Check if a business has verified contact information available
 */
export function hasVerifiedContactInfo(abn: string): boolean {
  return Boolean(VERIFIED_CONTACT_DATA[abn]);
}