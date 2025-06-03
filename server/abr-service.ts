import { z } from 'zod';
import { searchSupplyNationBusinesses, verifyIndigenousBusiness, type SupplyNationBusiness } from './supply-nation-service';

// ABR JSON API Configuration (following the implementation guide)
const ABR_GUID = process.env.NEXT_PUBLIC_ABR_GUID || '640c5f10-87b7-4f67-a3ce-5eb099dc25dd';
const ABR_API = 'https://abr.business.gov.au/json';

// ABR Response Types
export interface ABRBusinessDetails {
  abn: string;
  entityName: string;
  entityType: string;
  status: string;
  address: {
    stateCode?: string;
    postcode?: string;
    suburb?: string;
    streetAddress?: string;
    fullAddress?: string;
  };
  gst: boolean;
  dgr?: boolean;
  lat?: number;
  lng?: number;
  supplyNationVerified?: boolean;
  supplyNationData?: SupplyNationBusiness;
}

export interface ABRSearchResult {
  businesses: ABRBusinessDetails[];
  totalResults: number;
}

// Search businesses by name using ABR XML Web Service (based on official schema)
export async function searchBusinessesByName(
  name: string,
  stateCode?: string,
  postcode?: string
): Promise<ABRSearchResult> {
  try {
    const params = new URLSearchParams({
      guid: ABR_GUID,
      name: name,
      ...(stateCode && { stateCode }),
      ...(postcode && { postcode }),
      includeHistoricalDetails: 'N'
    });

    const url = `${ABR_API}/MatchingNames.aspx?callback=callback&guid=${ABR_GUID}&name=${encodeURIComponent(name)}&maxResults=10`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain',
        'User-Agent': 'IndigenousAustraliaMap/1.0'
      }
    });

    if (!response.ok) {
      console.log(`ABR XML API response: ${response.status} - ${response.statusText}`);
      return { businesses: [], totalResults: 0 };
    }

    const jsonData = await response.text();
    console.log('ABR JSON Response received:', jsonData.substring(0, 200));
    
    // Parse JSONP callback response
    const jsonString = jsonData.replace(/^callback\(/, '').replace(/\)$/, '');
    const data = JSON.parse(jsonString);
    
    return parseABRJSONResponse(data);
  } catch (error) {
    console.error('Error searching ABR businesses:', error);
    return { businesses: [], totalResults: 0 };
  }
}

// Search businesses by ABN
export async function getBusinessByABN(abn: string): Promise<ABRBusinessDetails | null> {
  try {
    const params = new URLSearchParams({
      guid: ABR_GUID,
      abn: abn.replace(/\s/g, ''), // Remove spaces
      includeHistoricalDetails: 'N',
      authenticationGuid: ABR_GUID
    });

    const url = `${ABR_API}/AbnDetails.aspx?callback=callback&guid=${ABR_GUID}&abn=${abn.replace(/\s/g, '')}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain',
        'User-Agent': 'IndigenousAustraliaMap/1.0'
      }
    });

    if (!response.ok) {
      console.log(`ABR Details API response: ${response.status} - ${response.statusText}`);
      return null;
    }

    const jsonData = await response.text();
    console.log('ABR Details Response received:', jsonData.substring(0, 200));
    
    // Parse JSONP callback response
    const jsonString = jsonData.replace(/^callback\(/, '').replace(/\)$/, '');
    const data = JSON.parse(jsonString);
    
    return parseBusinessDetailsJSON(data);
  } catch (error) {
    console.error('Error fetching ABR business by ABN:', error);
    return null;
  }
}

// Search businesses by postcode (useful for territory-based searches)
export async function searchBusinessesByPostcode(
  postcode: string,
  stateCode?: string,
  searchTerms?: string[]
): Promise<ABRSearchResult> {
  try {
    // If we have search terms (like "indigenous", "aboriginal"), include them
    const nameFilter = searchTerms ? searchTerms.join(' OR ') : '';
    
    const params = new URLSearchParams({
      guid: ABR_GUID,
      postcode: postcode,
      ...(stateCode && { stateCode }),
      ...(nameFilter && { name: nameFilter }),
      includeHistoricalDetails: 'N',
      authenticationGuid: ABR_GUID
    });

    const url = `${ABR_API}/MatchingNames.aspx?callback=callback&guid=${ABR_GUID}&postcode=${postcode}&maxResults=10`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/xml',
        'User-Agent': 'IndigenousAustraliaMap/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`ABR API error: ${response.status} ${response.statusText}`);
    }

    const xmlData = await response.text();
    return parseABRSearchResponse(xmlData);
  } catch (error) {
    console.error('Error searching ABR businesses by postcode:', error);
    return { businesses: [], totalResults: 0 };
  }
}

// Parse ABR JSON response (from public JSON API)
function parseABRJSONResponse(jsonData: any): ABRSearchResult {
  try {
    const businesses: ABRBusinessDetails[] = [];
    
    // Handle ABR JSON response format
    if (jsonData && jsonData.Names && Array.isArray(jsonData.Names)) {
      for (const entity of jsonData.Names) {
        if (entity.Abn && entity.Name) {
          const business: ABRBusinessDetails = {
            abn: entity.Abn,
            entityName: entity.Name,
            entityType: entity.NameType || 'Business',
            status: entity.IsCurrent ? 'Active' : 'Inactive',
            address: {
              stateCode: entity.State,
              postcode: entity.Postcode,
              suburb: ''
            },
            gst: entity.Gst === 'Y' || entity.Gst === true,
            dgr: entity.Dgr === 'Y' || entity.Dgr === true
          };
          businesses.push(business);
        }
      }
    }

    return {
      businesses,
      totalResults: businesses.length
    };
  } catch (error) {
    console.error('Error parsing ABR JSON response:', error);
    return { businesses: [], totalResults: 0 };
  }
}

// Parse detailed business information from ABR JSON API
function parseBusinessDetailsJSON(jsonData: any): ABRBusinessDetails | null {
  try {
    if (!jsonData || jsonData.Message) {
      console.log('ABR Details API message:', jsonData?.Message || 'No data');
      return null;
    }

    const business: ABRBusinessDetails = {
      abn: jsonData.Abn || '',
      entityName: jsonData.EntityName || '',
      entityType: jsonData.EntityTypeName || 'Business',
      status: jsonData.AbnStatus === 'Active' ? 'Active' : 'Inactive',
      address: {
        stateCode: jsonData.AddressState || '',
        postcode: jsonData.AddressPostcode || '',
        suburb: '',
        streetAddress: '',
        fullAddress: ''
      },
      gst: jsonData.Gst ? true : false,
      dgr: false
    };

    // Build complete address for geocoding and display
    const addressParts = [];
    if (jsonData.AddressPostcode && jsonData.AddressState) {
      business.address.fullAddress = `${jsonData.AddressPostcode}, ${jsonData.AddressState}, Australia`;
      business.address.suburb = `${jsonData.AddressPostcode}, ${jsonData.AddressState}`;
    }

    return business;
  } catch (error) {
    console.error('Error parsing business details:', error);
    return null;
  }
}

// Parse ABR XML response (legacy function for XML API)
function parseABRSearchResponse(xmlData: string): ABRSearchResult {
  try {
    // Simple XML parsing - in production, consider using a proper XML parser
    const businesses: ABRBusinessDetails[] = [];
    
    // Extract business entities from XML
    const businessMatches = xmlData.match(/<businessEntity.*?<\/businessEntity>/g);
    
    if (businessMatches) {
      for (const businessXml of businessMatches) {
        const business = parseBusinessEntity(businessXml);
        if (business) {
          businesses.push(business);
        }
      }
    }

    return {
      businesses,
      totalResults: businesses.length
    };
  } catch (error) {
    console.error('Error parsing ABR XML response:', error);
    return { businesses: [], totalResults: 0 };
  }
}

function parseBusinessEntity(xmlData: string): ABRBusinessDetails | null {
  try {
    const extractValue = (tag: string): string => {
      const match = xmlData.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i'));
      return match ? match[1].trim() : '';
    };

    const abn = extractValue('abn');
    const entityName = extractValue('organisationName') || extractValue('entityName');
    
    if (!abn || !entityName) {
      return null;
    }

    return {
      abn,
      entityName,
      entityType: extractValue('entityTypeName') || 'Business',
      status: extractValue('entityStatusCode') || 'Active',
      address: {
        stateCode: extractValue('stateCode'),
        postcode: extractValue('postcode'),
        suburb: extractValue('suburb')
      },
      gst: xmlData.includes('<gstStatusCode>Active</gstStatusCode>'),
      dgr: xmlData.includes('<dgrStatusCode>Active</dgrStatusCode>')
    };
  } catch (error) {
    console.error('Error parsing business entity:', error);
    return null;
  }
}

// Helper function to identify potentially Indigenous businesses
export function filterIndigenousBusinesses(businesses: ABRBusinessDetails[]): ABRBusinessDetails[] {
  const strongIndicators = [
    'aboriginal', 'indigenous', 'first nations', 'torres strait', 'native title',
    'koori', 'murri', 'yolngu', 'anangu', 'palawa', 'nunga', 'noongar', 'yuin',
    'gunditjmara', 'wardandi', 'nyungar', 'yamatji', 'arrernte', 'pitjantjatjara'
  ];

  const culturalKeywords = [
    'cultural', 'traditional', 'dreamtime', 'corroboree', 'ceremony', 'sacred',
    'country', 'land', 'elder', 'community', 'mob', 'clan', 'nation', 'people',
    'heritage', 'ancestral', 'totemic', 'songline', 'reconciliation', 'healing'
  ];

  const commonIndigenousNames = [
    'maali', 'jarjum', 'yurra', 'warru', 'ngurra', 'boorong', 'kirra', 'yarra',
    'kambu', 'jindabyne', 'gurrumul', 'tjandrawati', 'kulka', 'birrong',
    'bundjalung', 'wiradjuri', 'dharawal', 'gumbaynggirr', 'wonnarua',
    'awabakal', 'darkinjung', 'guringai', 'dharug', 'tharawal'
  ];

  const serviceTypes = [
    'art centre', 'cultural centre', 'ranger', 'land management', 'native title',
    'bush medicine', 'cultural tourism', 'ranger service', 'land council'
  ];

  return businesses.filter(business => {
    const searchText = `${business.entityName} ${business.address.suburb || ''} ${business.address.stateCode || ''}`.toLowerCase();
    
    // High confidence: Strong Indigenous indicators
    const hasStrongIndicator = strongIndicators.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
    
    if (hasStrongIndicator) {
      return true;
    }
    
    // Medium confidence: Cultural keywords + Indigenous names
    const culturalMatches = culturalKeywords.filter(keyword => 
      searchText.includes(keyword.toLowerCase())
    ).length;
    
    const nameMatches = commonIndigenousNames.filter(name => 
      searchText.includes(name.toLowerCase())
    ).length;
    
    const serviceMatches = serviceTypes.some(service => 
      searchText.includes(service.toLowerCase())
    );
    
    // More inclusive criteria for Indigenous business detection
    return (culturalMatches >= 1) || (nameMatches >= 1) || serviceMatches;
  });
}

// Get businesses for a specific territory based on postcode/location
export async function getBusinessesForTerritory(
  territoryName: string,
  postcode?: string,
  stateCode?: string
): Promise<ABRBusinessDetails[]> {
  try {
    let results: ABRBusinessDetails[] = [];

    // First, try searching by territory name + indigenous keywords
    const territorySearch = await searchBusinessesByName(
      `${territoryName} indigenous`,
      stateCode,
      postcode
    );
    results = [...results, ...territorySearch.businesses];

    // If we have a postcode, search businesses in that area
    if (postcode) {
      const postcodeSearch = await searchBusinessesByPostcode(
        postcode,
        stateCode,
        ['indigenous', 'aboriginal', 'cultural']
      );
      results = [...results, ...postcodeSearch.businesses];
    }

    // Remove duplicates based on ABN
    const uniqueResults = results.filter((business, index, self) => 
      index === self.findIndex(b => b.abn === business.abn)
    );

    // Filter for likely Indigenous businesses
    return filterIndigenousBusinesses(uniqueResults);
  } catch (error) {
    console.error('Error getting businesses for territory:', error);
    return [];
  }
}

// Enrich business data with detailed location information from ABR
export async function enrichBusinessWithLocation(business: ABRBusinessDetails): Promise<ABRBusinessDetails> {
  try {
    const detailedBusiness = await getBusinessByABN(business.abn);
    if (detailedBusiness) {
      return {
        ...business,
        address: detailedBusiness.address,
        entityName: detailedBusiness.entityName || business.entityName,
        status: detailedBusiness.status || business.status,
        gst: detailedBusiness.gst,
        dgr: detailedBusiness.dgr,
        lat: detailedBusiness.lat || 0,
        lng: detailedBusiness.lng || 0
      };
    }
    // Ensure lat/lng fields are always present
    return {
      ...business,
      lat: business.lat || 0,
      lng: business.lng || 0
    };
  } catch (error) {
    console.error('Error enriching business location:', error);
    return {
      ...business,
      lat: business.lat || 0,
      lng: business.lng || 0
    };
  }
}

export async function searchIndigenousBusinesses(
  query: string,
  location?: string
): Promise<ABRSearchResult> {
  try {
    // First search ABR for businesses
    const abrResults = await searchBusinessesByName(query);
    
    // Then search Supply Nation for Indigenous verification
    const supplyNationResults = await searchSupplyNationBusinesses(query, location);
    
    // Create a map of Supply Nation businesses by ABN for quick lookup
    const supplyNationMap = new Map<string, SupplyNationBusiness>();
    supplyNationResults.businesses.forEach(snBusiness => {
      if (snBusiness.abn) {
        supplyNationMap.set(snBusiness.abn, snBusiness);
      }
    });

    // Filter ABR results to only include Indigenous businesses verified by Supply Nation
    const verifiedBusinesses: ABRBusinessDetails[] = [];

    for (const abrBusiness of abrResults.businesses) {
      const supplyNationData = supplyNationMap.get(abrBusiness.abn);
      
      if (supplyNationData) {
        // Business is verified in Supply Nation
        verifiedBusinesses.push({
          ...abrBusiness,
          supplyNationVerified: true,
          supplyNationData
        });
      } else {
        // Check if business name matches Supply Nation listings (fallback for missing ABNs)
        const nameMatch = supplyNationResults.businesses.find(snBusiness => 
          snBusiness.companyName.toLowerCase().includes(abrBusiness.entityName.toLowerCase()) ||
          abrBusiness.entityName.toLowerCase().includes(snBusiness.companyName.toLowerCase())
        );
        
        if (nameMatch) {
          verifiedBusinesses.push({
            ...abrBusiness,
            supplyNationVerified: true,
            supplyNationData: nameMatch
          });
        }
      }
    }

    return {
      businesses: verifiedBusinesses,
      totalResults: verifiedBusinesses.length
    };

  } catch (error) {
    console.error('Error searching Indigenous businesses:', error);
    // Fallback to ABR only if Supply Nation fails
    return await searchBusinessesByName(query);
  }
}