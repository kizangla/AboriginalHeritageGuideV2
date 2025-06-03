// Demo Supply Nation data to demonstrate the data prioritization system
// This shows how verified Indigenous businesses would be prioritized over ABR data

export interface DemoSupplyNationBusiness {
  companyName: string;
  abn: string;
  location: string;
  supplynationId: string;
  verified: true;
  categories: string[];
}

// Sample of known verified Indigenous businesses for demonstration
export const demoSupplyNationBusinesses: DemoSupplyNationBusiness[] = [
  {
    companyName: "MAALI GROUP PTY LTD",
    abn: "24633182117",
    location: "Burswood, WA 6100",
    supplynationId: "sn_maali_001",
    verified: true,
    categories: ["Supply Nation Verified", "Construction", "Civil Engineering"]
  },
  {
    companyName: "MYALI GROUP PTY LTD", 
    abn: "59611332060",
    location: "Balcatta, WA 6021",
    supplynationId: "sn_myali_001",
    verified: true,
    categories: ["Supply Nation Verified", "Business Services", "Consulting"]
  }
];

export function searchDemoSupplyNation(query: string): DemoSupplyNationBusiness[] {
  const normalizedQuery = query.toLowerCase();
  return demoSupplyNationBusinesses.filter(business => 
    business.companyName.toLowerCase().includes(normalizedQuery) ||
    business.abn === query ||
    normalizedQuery.split(' ').some(word => 
      business.companyName.toLowerCase().includes(word) && word.length > 2
    )
  );
}