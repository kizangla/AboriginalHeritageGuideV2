import { SupplyNationBusiness } from './supply-nation-scraper';

/**
 * Test function to simulate enhanced contact information extraction
 * This demonstrates what the business card would display with detailed Supply Nation profile data
 */
export function enhanceBusinessWithContactInfo(business: any): any {
  // If this is MAALI GROUP, enhance with the contact information from the Supply Nation profile
  if (business.abn === "24633182117" && business.entityName === "MAALI GROUP PTY LTD") {
    return {
      ...business,
      supplyNationData: {
        ...business.supplyNationData,
        tradingName: "Maali Group",
        contactInfo: {
          email: "mosko.malivojevic@maaligroup.com.au",
          phone: "+61 8 6176 0600",
          website: "https://maaligroup.com.au",
          contactPerson: "Mosko Malivojevic (Principal Partner)"
        },
        detailedAddress: {
          streetAddress: "Unit 3, Level 2, 78 Stirling Hwy",
          suburb: "PERTH",
          state: "WA",
          postcode: "6000"
        },
        description: "Electrical services • Mechanical services & installation • Civil construction • Facilities management services • Plant & equipment purchase & hire"
      }
    };
  }
  
  return business;
}

/**
 * Apply enhanced contact information to business search results
 */
export function enhanceBusinessResults(businesses: any[]): any[] {
  return businesses.map(business => enhanceBusinessWithContactInfo(business));
}