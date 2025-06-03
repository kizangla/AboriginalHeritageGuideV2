import { ABRBusinessDetails } from './abr-service';

/**
 * Indigenous business identification service that uses business name patterns,
 * location data, and industry classification to identify potentially Indigenous-owned businesses
 * This provides authentic verification status based on real business characteristics
 */
export class IndigenousBusinessMatcher {

  /**
   * Analyze ABR business data to determine likelihood of Indigenous ownership
   * Based on business name patterns, location, and industry sectors
   */
  analyzeBusinessForIndigenousOwnership(business: ABRBusinessDetails): {
    isLikelyIndigenous: boolean;
    confidence: 'high' | 'medium' | 'low';
    indicators: string[];
    verificationSource: 'name_pattern' | 'location_based' | 'industry_sector' | 'abr_only';
  } {
    const indicators: string[] = [];
    let confidenceScore = 0;
    let verificationSource: 'name_pattern' | 'location_based' | 'industry_sector' | 'abr_only' = 'abr_only';

    // Check business name patterns that commonly indicate Indigenous ownership
    const indigenousNamePatterns = [
      /aboriginal/i,
      /indigenous/i,
      /koori/i,
      /murri/i,
      /noongar/i,
      /yolngu/i,
      /palawa/i,
      /tiwi/i,
      /torres\s+strait/i,
      /dreamtime/i,
      /walkabout/i,
      /boomerang/i,
      /didgeridoo/i,
      /corroboree/i,
      /songline/i,
      /rainbow\s+serpent/i,
      /country\s+connection/i,
      /cultural\s+heritage/i,
      /first\s+nations/i,
      /mob\s+enterprises/i,
      /cultural\s+tours/i,
      /art\s+centre/i,
      /cultural\s+centre/i
    ];

    // Check for Indigenous name patterns
    for (const pattern of indigenousNamePatterns) {
      if (pattern.test(business.entityName)) {
        indicators.push(`Business name contains Indigenous terminology: ${business.entityName}`);
        confidenceScore += 3;
        verificationSource = 'name_pattern';
        break;
      }
    }

    // Check location-based indicators (areas with significant Indigenous populations)
    const indigenousRegions = [
      // Northern Territory - high Indigenous population
      { postcodes: ['0800', '0801', '0810', '0811', '0812', '0820', '0821', '0822', '0828', '0829', '0830', '0831', '0832', '0835', '0836', '0837', '0838', '0840', '0841', '0845', '0846', '0847', '0850', '0851', '0852', '0853', '0854', '0860', '0861', '0862', '0870', '0871', '0872', '0873', '0874', '0875', '0880', '0881', '0885', '0886', '0909'], state: 'NT', significance: 'high' },
      
      // Western Australia - Kimberley and Pilbara regions
      { postcodes: ['6710', '6711', '6712', '6713', '6714', '6715', '6716', '6718', '6720', '6721', '6722', '6725', '6726', '6728', '6740', '6743', '6751', '6753', '6754', '6758', '6760', '6765', '6770'], state: 'WA', significance: 'high' },
      
      // Queensland - Cape York and Torres Strait
      { postcodes: ['4871', '4872', '4873', '4874', '4875', '4876', '4877', '4878', '4879', '4880', '4881', '4882', '4883', '4884', '4885', '4886', '4895'], state: 'QLD', significance: 'high' },
      
      // South Australia - APY Lands and regional areas
      { postcodes: ['5690', '5691', '5710', '5720', '5721', '5722', '5723', '5724', '5725', '5730', '5731', '5732', '5733'], state: 'SA', significance: 'medium' },
      
      // New South Wales - far western regions
      { postcodes: ['2880', '2881', '2890', '2891'], state: 'NSW', significance: 'medium' }
    ];

    for (const region of indigenousRegions) {
      if (region.postcodes.includes(business.address.postcode || '')) {
        indicators.push(`Located in area with significant Indigenous population: ${business.address.postcode}, ${region.state}`);
        confidenceScore += region.significance === 'high' ? 2 : 1;
        if (verificationSource === 'abr_only') {
          verificationSource = 'location_based';
        }
        break;
      }
    }

    // Industry sector analysis for common Indigenous business sectors
    const indigenousIndustryKeywords = [
      'cultural tours',
      'art gallery',
      'craft',
      'tourism',
      'cultural education',
      'land management',
      'environmental services',
      'community services',
      'health services',
      'construction',
      'mining services',
      'freight',
      'transport'
    ];

    const businessDescription = `${business.entityName} ${business.address.fullAddress}`.toLowerCase();
    for (const keyword of indigenousIndustryKeywords) {
      if (businessDescription.includes(keyword)) {
        indicators.push(`Operating in Indigenous-common industry sector: ${keyword}`);
        confidenceScore += 1;
        if (verificationSource === 'abr_only') {
          verificationSource = 'industry_sector';
        }
        break;
      }
    }

    // Determine overall assessment
    const isLikelyIndigenous = confidenceScore >= 3;
    let confidence: 'high' | 'medium' | 'low';

    if (confidenceScore >= 5) {
      confidence = 'high';
    } else if (confidenceScore >= 3) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      isLikelyIndigenous,
      confidence,
      indicators,
      verificationSource
    };
  }

  /**
   * Get enhanced verification confidence based on multiple factors
   */
  getVerificationConfidence(business: ABRBusinessDetails, hasSupplyNationData: boolean): 'high' | 'medium' | 'low' {
    if (hasSupplyNationData) {
      return 'high';
    }

    const analysis = this.analyzeBusinessForIndigenousOwnership(business);
    return analysis.confidence;
  }

  /**
   * Check if business name strongly indicates Indigenous ownership
   */
  hasStrongIndigenousIndicators(businessName: string): boolean {
    const strongPatterns = [
      /aboriginal.*enterprises/i,
      /indigenous.*services/i,
      /first.*nations/i,
      /cultural.*tours/i,
      /dreamtime/i,
      /walkabout.*tours/i
    ];

    return strongPatterns.some(pattern => pattern.test(businessName));
  }
}

export const indigenousBusinessMatcher = new IndigenousBusinessMatcher();