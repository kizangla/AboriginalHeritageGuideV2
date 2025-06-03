/**
 * Enhanced Indigenous Business Verification System
 * Provides comprehensive verification through multiple authentic data sources
 * without relying on mock or placeholder data
 */

import { ABRBusinessDetails } from './abr-service';
import { indigenousBusinessMatcher } from './indigenous-business-matcher';
import { SupplyNationVerifiedBusiness } from './supply-nation-simple-scraper';

export interface EnhancedVerificationResult {
  isVerified: boolean;
  verificationSource: 'supply_nation' | 'abr_pattern_analysis' | 'not_verified';
  confidence: 'high' | 'medium' | 'low';
  verificationMethod: 'authenticated_api' | 'pattern_recognition' | 'location_analysis';
  indicators: string[];
  requiresManualVerification?: boolean;
}

export class EnhancedIndigenousVerification {
  
  /**
   * Comprehensive verification using available authentic data sources
   */
  async verifyBusiness(
    business: ABRBusinessDetails,
    supplyNationData?: SupplyNationVerifiedBusiness
  ): Promise<EnhancedVerificationResult> {
    
    // Primary verification: Supply Nation authenticated data
    if (supplyNationData && supplyNationData.verified) {
      return {
        isVerified: true,
        verificationSource: 'supply_nation',
        confidence: 'high',
        verificationMethod: 'authenticated_api',
        indicators: ['Supply Nation verified business profile'],
      };
    }

    // Secondary verification: Indigenous business pattern analysis
    const patternAnalysis = indigenousBusinessMatcher.analyzeBusinessForIndigenousOwnership(business);
    
    if (patternAnalysis.isLikelyIndigenous) {
      return {
        isVerified: true,
        verificationSource: 'abr_pattern_analysis',
        confidence: patternAnalysis.confidence,
        verificationMethod: 'pattern_recognition',
        indicators: patternAnalysis.indicators,
        requiresManualVerification: patternAnalysis.confidence === 'low'
      };
    }

    // Tertiary verification: Location-based analysis for remote/traditional areas
    const locationVerification = this.analyzeLocationForIndigenousContext(business);
    
    if (locationVerification.isLikelyIndigenousArea) {
      return {
        isVerified: false, // Requires additional verification
        verificationSource: 'not_verified',
        confidence: 'low',
        verificationMethod: 'location_analysis',
        indicators: locationVerification.indicators,
        requiresManualVerification: true
      };
    }

    // No verification indicators found
    return {
      isVerified: false,
      verificationSource: 'not_verified',
      confidence: 'low',
      verificationMethod: 'pattern_recognition',
      indicators: ['No Indigenous business indicators found'],
    };
  }

  /**
   * Analyze business location for Indigenous context
   */
  private analyzeLocationForIndigenousContext(business: ABRBusinessDetails): {
    isLikelyIndigenousArea: boolean;
    indicators: string[];
  } {
    const indicators: string[] = [];
    let isLikelyIndigenousArea = false;

    // Check for remote postcodes commonly associated with Indigenous communities
    const remoteIndigenousPostcodes = [
      // Northern Territory remote areas
      '0822', '0836', '0841', '0845', '0850', '0852', '0854', '0860', '0862', '0870', '0871', '0872', '0873', '0874', '0880', '0881', '0885', '0886', '0887',
      // Western Australia remote areas
      '6430', '6431', '6433', '6434', '6435', '6436', '6437', '6438', '6440', '6442', '6443', '6450', '6452', '6460', '6465', '6470', '6475', '6477', '6479', '6480', '6485', '6488', '6489', '6490',
      // Queensland remote areas
      '4650', '4655', '4659', '4660', '4662', '4670', '4671', '4673', '4674', '4676', '4677', '4678', '4680', '4694', '4695', '4696', '4697', '4699', '4700', '4701', '4702', '4703', '4704', '4705', '4706', '4707', '4708', '4709', '4710', '4711', '4712', '4713', '4714', '4715', '4716', '4717', '4718', '4719', '4720', '4721', '4722', '4723', '4724', '4725', '4726', '4727', '4728', '4730', '4731', '4732', '4733', '4735', '4736', '4737', '4738', '4739', '4740', '4741', '4742', '4743', '4744', '4745', '4746', '4747', '4750', '4751', '4753', '4754', '4756', '4757', '4798', '4799', '4800', '4801', '4802', '4803', '4804', '4805', '4806', '4807', '4808', '4809', '4810', '4811', '4812', '4814', '4815', '4816', '4817', '4818', '4819', '4820', '4821', '4822', '4823', '4824', '4825', '4828', '4829', '4830', '4849', '4850', '4852', '4854', '4855', '4856', '4857', '4858', '4859', '4860', '4861', '4862', '4863', '4864', '4865', '4868', '4869', '4870', '4871', '4872', '4873', '4874', '4875', '4876', '4877', '4878', '4879', '4880', '4881', '4882', '4883', '4884', '4885', '4886', '4887', '4888', '4890', '4891', '4892', '4895'
    ];

    if (business.address.postcode && remoteIndigenousPostcodes.includes(business.address.postcode)) {
      indicators.push('Located in postcode area with significant Indigenous communities');
      isLikelyIndigenousArea = true;
    }

    // Check for specific regions known for Indigenous business activity
    if (business.address.stateCode === 'NT') {
      indicators.push('Located in Northern Territory - high Indigenous business activity');
      isLikelyIndigenousArea = true;
    }

    // Check for Far North Queensland
    if (business.address.stateCode === 'QLD' && business.address.postcode && 
        parseInt(business.address.postcode) >= 4870 && parseInt(business.address.postcode) <= 4895) {
      indicators.push('Located in Far North Queensland Indigenous region');
      isLikelyIndigenousArea = true;
    }

    // Check for Kimberley region WA
    if (business.address.stateCode === 'WA' && business.address.postcode && 
        parseInt(business.address.postcode) >= 6725 && parseInt(business.address.postcode) <= 6770) {
      indicators.push('Located in Kimberley region with significant Indigenous communities');
      isLikelyIndigenousArea = true;
    }

    return {
      isLikelyIndigenousArea,
      indicators
    };
  }

  /**
   * Get verification status display text
   */
  getVerificationStatusText(result: EnhancedVerificationResult): string {
    if (result.isVerified) {
      switch (result.verificationSource) {
        case 'supply_nation':
          return 'Supply Nation Verified';
        case 'abr_pattern_analysis':
          return `Indigenous Business Indicators (${result.confidence} confidence)`;
        default:
          return 'Verified';
      }
    }

    if (result.requiresManualVerification) {
      return 'Requires Verification';
    }

    return 'Not Verified';
  }

  /**
   * Get verification confidence color for UI display
   */
  getVerificationColor(result: EnhancedVerificationResult): string {
    if (!result.isVerified) return '#6b7280'; // gray

    switch (result.confidence) {
      case 'high': return '#059669'; // green
      case 'medium': return '#d97706'; // amber
      case 'low': return '#dc2626'; // red
      default: return '#6b7280';
    }
  }
}

export const enhancedIndigenousVerification = new EnhancedIndigenousVerification();