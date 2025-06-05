/**
 * Authentic Mineral Data Component - Fetches real commodity data from WA DMIRS exploration reports
 */

import { useState, useEffect } from 'react';

interface AuthenticMineralDataProps {
  lat: number;
  lng: number;
  onMineralsLoaded: (minerals: string[], source: string) => void;
  fallbackMinerals: string[];
}

interface ExplorationMineralData {
  commodities: string[];
  confidence: 'high' | 'medium' | 'low';
  reportCount: number;
  source: string;
  dataAuthenticity: string;
}

export default function AuthenticMineralData({ 
  lat, 
  lng, 
  onMineralsLoaded, 
  fallbackMinerals 
}: AuthenticMineralDataProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuthenticMinerals = async () => {
      try {
        const response = await fetch(`/api/exploration/minerals/${lat}/${lng}?radius=0.005`);
        const data = await response.json();
        
        if (data.success && data.mineralData) {
          // Found authentic exploration report data
          onMineralsLoaded(
            data.mineralData.commodities, 
            `WA DMIRS Exploration (${data.mineralData.reportCount} reports)`
          );
        } else {
          // No exploration data found, use company name inference as fallback
          onMineralsLoaded(fallbackMinerals, 'Company Name Inference');
        }
      } catch (error) {
        console.error('Error fetching authentic mineral data:', error);
        // Use fallback on error
        onMineralsLoaded(fallbackMinerals, 'Company Name Inference');
      } finally {
        setLoading(false);
      }
    };

    fetchAuthenticMinerals();
  }, [lat, lng, fallbackMinerals, onMineralsLoaded]);

  return null; // This is a data-fetching component with no UI
}