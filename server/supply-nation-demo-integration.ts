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
  },
  {
    companyName: "MGM ALLIANCE PTY LTD",
    abn: "47653970962",
    location: "6714, Western Australia",
    supplynationId: "a1G7F000001RLdBUA2",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUA2",
    verified: true,
    categories: ["Supply Nation Verified", "Mining services", "Engineering services"],
    contactInfo: {
      phone: "(08) 9144 2000",
      email: "info@mgmalliance.com.au",
      website: "http://www.mgmalliance.com.au"
    }
  },
  {
    companyName: "INDIGENOUS BUSINESS AUSTRALIA",
    abn: "42513562148",
    location: "Canberra, ACT 2601",
    supplynationId: "a1G7F000001RLdBUA3",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUA3",
    verified: true,
    categories: ["Supply Nation Verified", "Business development", "Financial services"],
    contactInfo: {
      phone: "1800 107 107",
      email: "info@iba.gov.au",
      website: "http://www.iba.gov.au"
    }
  },
  {
    companyName: "MURDI PAAKI REGIONAL ASSEMBLY",
    abn: "85103230989",
    location: "Broken Hill, NSW 2880",
    supplynationId: "a1G7F000001RLdBUA4",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUA4",
    verified: true,
    categories: ["Supply Nation Verified", "Community services", "Training"],
    contactInfo: {
      phone: "(08) 8082 9777",
      email: "info@murdipaaki.org",
      website: "http://www.murdipaaki.org"
    }
  },
  {
    companyName: "KOOYAR WONGI PTY LTD",
    abn: "40627082900",
    location: "6280, Western Australia",
    supplynationId: "a1G7F000001RLdBUA5",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUA5",
    verified: true,
    categories: ["Supply Nation Verified", "Indigenous cultural services", "Community development"],
    contactInfo: {
      phone: "(08) 9842 1234",
      email: "info@kooyarwongi.com.au",
      website: "http://www.kooyarwongi.com.au"
    }
  },
  {
    companyName: "NUIDAWN PTY LTD",
    abn: "19655889375",
    location: "2204, New South Wales",
    supplynationId: "a1G7F000001RLdBUA6",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUA6",
    verified: true,
    categories: ["Supply Nation Verified", "Technology services", "Digital solutions"],
    contactInfo: {
      phone: "(02) 9876 5432",
      email: "contact@nuidawn.com.au",
      website: "http://www.nuidawn.com.au"
    }
  },
  {
    companyName: "ABORIGINAL HOUSING COMPANY",
    abn: "42513562148",
    location: "2015, New South Wales",
    supplynationId: "a1G7F000001RLdBUA7",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUA7",
    verified: true,
    categories: ["Supply Nation Verified", "Housing services", "Community development", "Property management"],
    contactInfo: {
      phone: "(02) 9698 9833",
      email: "info@ahc.org.au",
      website: "http://www.ahc.org.au"
    }
  },
  {
    companyName: "YOTHU YINDI FOUNDATION",
    abn: "85103230989",
    location: "0810, Northern Territory",
    supplynationId: "a1G7F000001RLdBUA8",
    profileUrl: "https://ibd.supplynation.org.au/public/s/supplierprofile?accid=a1G7F000001RLdBUA8",
    verified: true,
    categories: ["Supply Nation Verified", "Education services", "Cultural programs", "Arts and entertainment"],
    contactInfo: {
      phone: "(08) 8945 4251",
      email: "info@yothuyindi.com",
      website: "http://www.yothuyindi.com"
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