/**
 * Supply Nation Integration Demo
 * Shows how verified Indigenous businesses from Supply Nation would be prioritized
 * over ABR data when authentication succeeds
 */

import { SupplyNationVerifiedBusiness } from './supply-nation-simple-scraper';

// Sample verified businesses that would come from Supply Nation when authenticated
export const sampleSupplyNationBusinesses: SupplyNationVerifiedBusiness[] = [
  {
    companyName: "MAALI GROUP PTY LTD",
    abn: "24633182117",
    location: "L 1 2 MILL ST, PERTH, WA 6000",
    supplynationId: "a1G7F000001RLdBUAW",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUAW",
    verified: true,
    categories: ["Supply Nation Verified", "Electrical services", "Mechanical services & installation", "Civil construction", "Facilities management services", "Plant & equipment purchase & hire"],
    contactInfo: {
      phone: "(08) 6270 3080",
      email: "mitch.matera@maaligroup.com.au",
      website: "http://www.maaligroup.com.au"
    }
  },
  {
    companyName: "MYALI GROUP PTY LTD", 
    abn: "59611332060",
    location: "Perth, WA 6021",
    supplynationId: "a1G7F000001RLdBUA1",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUA1",
    verified: true,
    categories: ["Supply Nation Verified", "Construction services", "Project management"],
    contactInfo: {
      phone: "(08) 9000 0000",
      email: "info@myaligroup.com.au", 
      website: "http://www.myaligroup.com.au"
    }
  }
];

/**
 * Demonstrates how Supply Nation data would be prioritized when authentication succeeds
 */
export function demonstrateSupplyNationPrioritization(query: string): {
  supplyNationBusinesses: SupplyNationVerifiedBusiness[];
  message: string;
} {
  console.log('Supply Nation data prioritization active');
  
  // Filter businesses that match the search query
  const matchingBusinesses = sampleSupplyNationBusinesses.filter(business => 
    business.companyName.toLowerCase().includes(query.toLowerCase()) ||
    business.abn === query ||
    (business.location && business.location.toLowerCase().includes(query.toLowerCase()))
  );

  return {
    supplyNationBusinesses: matchingBusinesses,
    message: `Found ${matchingBusinesses.length} verified Indigenous businesses from Supply Nation`
  };
}