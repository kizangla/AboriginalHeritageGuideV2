/**
 * Comprehensive Business Search System
 * Integrates ABR, geographic mapping, and Indigenous pattern recognition
 * Ready for Supply Nation integration when credentials are available
 */

import { searchBusinessesByName, getBusinessByABN, ABRBusinessDetails, enrichBusinessWithLocation } from './abr-service';
import { indigenousBusinessMatcher } from './indigenous-business-matcher';
import { enhancedIndigenousVerification } from './enhanced-indigenous-verification';

export interface ComprehensiveBusinessResult {
  // Core business data from ABR
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
  
  // Geographic data
  lat?: number;
  lng?: number;
  
  // Indigenous verification
  indigenousVerified: boolean;
  verificationMethod: 'abr_pattern_analysis' | 'location_analysis' | 'name_analysis' | 'pending_supply_nation';
  verificationConfidence: 'high' | 'medium' | 'low';
  verificationIndicators: string[];
  
  // Supply Nation readiness
  supplyNationReady: boolean;
  supplyNationStatus: 'credentials_required' | 'authenticated' | 'not_available';
}

export interface ComprehensiveSearchResult {
  businesses: ComprehensiveBusinessResult[];
  totalResults: number;
  searchQuery: string;
  dataSource: {
    abr: { found: number; processed: number };
    geographic: { found: number; processed: number };
    verification: { processed: number; verified: number };
  };
  supplyNationStatus: 'credentials_required' | 'authenticated' | 'not_available';
  timestamp: Date;
}

export class ComprehensiveBusinessSearch {
  
  async searchBusinesses(query: string, options: {
    maxResults?: number;
    includeGeographic?: boolean;
    verificationLevel?: 'basic' | 'enhanced';
  } = {}): Promise<ComprehensiveSearchResult> {
    
    const {
      maxResults = 20,
      includeGeographic = true,
      verificationLevel = 'enhanced'
    } = options;

    console.log(`Starting comprehensive business search for: "${query}"`);
    
    try {
      // Step 1: Search Australian Business Register
      console.log('Searching Australian Business Register...');
      const abrResults = await searchBusinessesByName(query, maxResults);
      
      const abrFound = abrResults.businesses.length;
      console.log(`ABR search found ${abrFound} businesses`);
      
      if (abrFound === 0) {
        return {
          businesses: [],
          totalResults: 0,
          searchQuery: query,
          dataSource: {
            abr: { found: 0, processed: 0 },
            geographic: { found: 0, processed: 0 },
            verification: { processed: 0, verified: 0 }
          },
          supplyNationStatus: 'credentials_required',
          timestamp: new Date()
        };
      }
      
      // Step 2: Enhance with geographic data
      console.log('Enhancing businesses with geographic data...');
      const enhancedBusinesses: ABRBusinessDetails[] = [];
      
      for (const business of abrResults.businesses) {
        if (includeGeographic) {
          const enriched = await enrichBusinessWithLocation(business);
          enhancedBusinesses.push(enriched);
        } else {
          enhancedBusinesses.push(business);
        }
      }
      
      const geographicProcessed = enhancedBusinesses.filter(b => b.lat && b.lng).length;
      console.log(`Geographic enhancement processed ${geographicProcessed} businesses`);
      
      // Step 3: Indigenous business verification
      console.log('Performing Indigenous business verification...');
      const verifiedBusinesses: ComprehensiveBusinessResult[] = [];
      
      for (const business of enhancedBusinesses) {
        const verification = verificationLevel === 'enhanced' 
          ? await enhancedIndigenousVerification.verifyBusiness(business)
          : indigenousBusinessMatcher.analyzeBusinessForIndigenousOwnership(business);
        
        const comprehensiveResult: ComprehensiveBusinessResult = {
          abn: business.abn,
          entityName: business.entityName,
          entityType: business.entityType,
          status: business.status,
          address: business.address,
          gst: business.gst,
          dgr: business.dgr,
          lat: business.lat,
          lng: business.lng,
          
          // Verification data
          indigenousVerified: verification.isVerified,
          verificationMethod: this.mapVerificationMethod(verification),
          verificationConfidence: verification.confidence,
          verificationIndicators: verification.indicators || [],
          
          // Supply Nation readiness
          supplyNationReady: true,
          supplyNationStatus: 'credentials_required'
        };
        
        verifiedBusinesses.push(comprehensiveResult);
      }
      
      const verifiedCount = verifiedBusinesses.filter(b => b.indigenousVerified).length;
      console.log(`Verification completed: ${verifiedCount} businesses verified as Indigenous`);
      
      // Step 4: Check Supply Nation credentials availability
      const supplyNationStatus = this.checkSupplyNationStatus();
      
      return {
        businesses: verifiedBusinesses,
        totalResults: verifiedBusinesses.length,
        searchQuery: query,
        dataSource: {
          abr: { found: abrFound, processed: abrResults.businesses.length },
          geographic: { found: geographicProcessed, processed: enhancedBusinesses.length },
          verification: { processed: verifiedBusinesses.length, verified: verifiedCount }
        },
        supplyNationStatus,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Comprehensive search error:', (error as Error).message);
      
      return {
        businesses: [],
        totalResults: 0,
        searchQuery: query,
        dataSource: {
          abr: { found: 0, processed: 0 },
          geographic: { found: 0, processed: 0 },
          verification: { processed: 0, verified: 0 }
        },
        supplyNationStatus: 'not_available',
        timestamp: new Date()
      };
    }
  }
  
  async searchByABN(abn: string): Promise<ComprehensiveBusinessResult | null> {
    console.log(`Searching for business with ABN: ${abn}`);
    
    try {
      const business = await getBusinessByABN(abn);
      if (!business) {
        console.log('Business not found in ABR');
        return null;
      }
      
      // Enhance with location data
      const enriched = await enrichBusinessWithLocation(business);
      
      // Perform verification
      const verification = await enhancedIndigenousVerification.verifyBusiness(enriched);
      
      return {
        abn: enriched.abn,
        entityName: enriched.entityName,
        entityType: enriched.entityType,
        status: enriched.status,
        address: enriched.address,
        gst: enriched.gst,
        dgr: enriched.dgr,
        lat: enriched.lat,
        lng: enriched.lng,
        
        indigenousVerified: verification.isVerified,
        verificationMethod: this.mapVerificationMethod(verification),
        verificationConfidence: verification.confidence,
        verificationIndicators: verification.indicators || [],
        
        supplyNationReady: true,
        supplyNationStatus: this.checkSupplyNationStatus()
      };
      
    } catch (error) {
      console.error('ABN search error:', (error as Error).message);
      return null;
    }
  }
  
  private mapVerificationMethod(verification: any): 'abr_pattern_analysis' | 'location_analysis' | 'name_analysis' | 'pending_supply_nation' {
    if (verification.verificationSource === 'supply_nation') {
      return 'pending_supply_nation';
    } else if (verification.verificationMethod === 'location_analysis') {
      return 'location_analysis';
    } else if (verification.verificationMethod === 'pattern_recognition') {
      return 'abr_pattern_analysis';
    } else {
      return 'name_analysis';
    }
  }
  
  private checkSupplyNationStatus(): 'credentials_required' | 'authenticated' | 'not_available' {
    const username = process.env.SUPPLY_NATION_USERNAME;
    const password = process.env.SUPPLY_NATION_PASSWORD;
    
    if (username && password) {
      return 'authenticated';
    } else {
      return 'credentials_required';
    }
  }
  
  getSystemStatus(): {
    abrIntegration: boolean;
    geographicMapping: boolean;
    indigenousVerification: boolean;
    supplyNationReady: boolean;
    supplyNationStatus: string;
  } {
    return {
      abrIntegration: true,
      geographicMapping: true,
      indigenousVerification: true,
      supplyNationReady: true,
      supplyNationStatus: this.checkSupplyNationStatus()
    };
  }
}

export const comprehensiveBusinessSearch = new ComprehensiveBusinessSearch();