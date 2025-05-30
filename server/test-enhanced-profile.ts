import { SupplyNationBusiness } from './supply-nation-scraper';

/**
 * Test function that simulates enhanced Supply Nation profile data
 * This represents what would be extracted from the detailed profile page
 */
export function createEnhancedMaaliGroupProfile(): SupplyNationBusiness {
  return {
    abn: "24633182117",
    companyName: "MAALI GROUP PTY LTD",
    verified: true,
    categories: [
      "Electrical services",
      "Mechanical services & installation", 
      "Civil construction",
      "Facilities management services",
      "Plant & equipment purchase & hire"
    ],
    location: "PERTH, WA",
    contactInfo: {
      email: "mosko.malivojevic@maaligroup.com.au",
      phone: "+61 8 6176 0600",
      website: "https://maaligroup.com.au",
      contactPerson: "Mosko Malivojevic (Principal Partner)"
    },
    description: "Electrical services • Mechanical services & installation • Civil construction • Facilities management services • Plant & equipment purchase & hire",
    supplynationId: "a1G7F000001RLdBUAW",
    capabilities: [
      "Electrical services",
      "Mechanical services & installation",
      "Civil construction", 
      "Facilities management services",
      "Plant & equipment purchase & hire"
    ],
    certifications: ["Supply Nation Verified"],
    tradingName: "Maali Group",
    detailedAddress: {
      streetAddress: "Unit 3, Level 2, 78 Stirling Hwy",
      suburb: "PERTH",
      state: "WA", 
      postcode: "6000"
    },
    acn: "633182117",
    lastUpdated: new Date().toISOString()
  };
}