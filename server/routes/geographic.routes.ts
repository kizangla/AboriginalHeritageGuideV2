import type { Express } from "express";
import type { SearchResult } from "@shared/schema";
import { fetchRATSIBBoundaries } from "../ratsib-service";

export function registerGeographicRoutes(app: Express): void {
  // Geocoding endpoint (using enhanced Nominatim)
  app.get("/api/geocode", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Query parameter 'q' is required" });
      }

      // Enhanced Nominatim search with better address handling
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=AU&addressdetails=1&extratags=1&q=${encodeURIComponent(query)}`;

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const rawResults = await response.json();

      // Enhanced results with better address formatting
      const results: SearchResult[] = rawResults.map((result: any) => {
        // Build a more detailed display name from address components
        let displayName = result.display_name;

        if (result.address) {
          const address = result.address;
          const components = [];

          // Add house number and street
          if (address.house_number && address.road) {
            components.push(`${address.house_number} ${address.road}`);
          } else if (address.road) {
            components.push(address.road);
          }

          // Add suburb/locality
          if (address.suburb || address.locality || address.village) {
            components.push(address.suburb || address.locality || address.village);
          }

          // Add city/town
          if (address.city || address.town) {
            components.push(address.city || address.town);
          }

          // Add state and postcode
          if (address.state) {
            let stateInfo = address.state;
            if (address.postcode) {
              stateInfo += ` ${address.postcode}`;
            }
            components.push(stateInfo);
          }

          // Add country
          if (address.country) {
            components.push(address.country);
          }

          if (components.length > 0) {
            displayName = components.join(', ');
          }
        }

        return {
          display_name: displayName,
          lat: result.lat,
          lon: result.lon,
          place_id: result.place_id,
          boundingbox: result.boundingbox
        };
      });

      res.json(results);
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ message: "Geocoding service unavailable" });
    }
  });

  // Reverse geocoding endpoint
  app.get("/api/reverse-geocode/:lat/:lng", async (req, res) => {
    try {
      const lat = parseFloat(req.params.lat);
      const lng = parseFloat(req.params.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ message: "Invalid coordinates" });
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;

      const response = await fetch(nominatimUrl, {
        headers: {
          'User-Agent': 'Aboriginal-Australia-Map/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.statusText}`);
      }

      const result = await response.json();
      res.json(result);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ message: "Reverse geocoding service unavailable" });
    }
  });

  // Get RATSIB boundaries for map view (general area) with compression
  app.get("/api/territories/map-view/ratsib", async (req, res) => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          error: 'Coordinates required',
          message: 'lat and lng query parameters are required'
        });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'Invalid coordinates',
          message: 'lat and lng must be valid numbers'
        });
      }

      const ratsibData = await fetchRATSIBBoundaries(latitude, longitude, 'Map View');

      const response = {
        success: true,
        coordinates: { lat: latitude, lng: longitude },
        ratsib: ratsibData,
        timestamp: new Date().toISOString()
      };

      // Add cache headers for better client-side caching
      res.set({
        'Cache-Control': 'public, max-age=600', // 10 minutes
        'ETag': `"ratsib-${latitude.toFixed(1)}-${longitude.toFixed(1)}-${ratsibData.totalFound}"`
      });

      res.json(response);

    } catch (error) {
      console.error('Map view RATSIB boundaries error:', error);
      res.status(500).json({
        error: 'Failed to fetch RATSIB boundaries for map view',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get all RATSIB boundaries across Australia for map reset view
  app.get("/api/ratsib/all-boundaries", async (req, res) => {
    try {
      console.log('Fetching all RATSIB boundaries across Australia...');

      // Fetch authentic RATSIB data from NNTT ArcGIS Feature Service (more reliable than data.gov.au WFS)
      // Layer 9 = RATSIB Areas in the NNTT Custodial AGOL service
      const arcgisUrl = 'https://services2.arcgis.com/rzk7fNEt0xoEp3cX/arcgis/rest/services/NNTT_Custodial_AGOL/FeatureServer/9/query';

      const queryParams = new URLSearchParams({
        f: 'json',
        where: '1=1',
        outFields: '*',
        returnGeometry: 'true',
        outSR: '4326'
      });

      let allBoundaries: any[] = [];
      let dataSource = 'nntt_arcgis_service';
      let serviceAvailable = false;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        const response = await fetch(`${arcgisUrl}?${queryParams.toString()}`, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Indigenous-Australia-App/1.0',
            'Accept': 'application/json'
          }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();

          if (!data.error && data.features && Array.isArray(data.features) && data.features.length > 0) {
            console.log(`Successfully fetched all RATSIB data from NNTT ArcGIS service (${data.features.length} areas)`);
            console.log(`RATSIB fields: [${Object.keys(data.features[0]?.attributes || {}).map(k => `'${k}'`).join(', ')}]`);

            allBoundaries = data.features.map((feature: any) => {
              const attrs = feature.attributes || {};

              // Convert ArcGIS rings format to GeoJSON format
              let geometry = null;
              if (feature.geometry && feature.geometry.rings) {
                geometry = {
                  type: "Polygon",
                  coordinates: feature.geometry.rings
                };
              }

              return {
                id: attrs.ID?.toString() || attrs.OBJECTID?.toString() || `ratsib_${Math.random().toString(36).substr(2, 9)}`,
                name: attrs.Name || attrs.Organisation || 'RATSIB Area',
                organizationName: attrs.Organisation || 'Aboriginal Organization',
                corporationType: attrs.RATSIB_Type || 'Representative Body',
                registrationDate: attrs.Date_Extracted ? new Date(attrs.Date_Extracted).toISOString() : new Date().toISOString(),
                status: 'Active',
                legislativeAuthority: attrs.Legislative_Authority || 'Native Title Act 1993',
                website: attrs.RATSIB_Link || null,
                jurisdiction: attrs.Jurisdiction || 'Australia',
                geometry: geometry,
                originalProperties: attrs
              };
            });
            serviceAvailable = true;
          } else if (data.error) {
            console.warn(`NNTT ArcGIS query error:`, data.error);
          }
        } else {
          console.warn(`NNTT ArcGIS service returned HTTP ${response.status} - using graceful degradation`);
        }
      } catch (fetchError: any) {
        console.warn(`NNTT ArcGIS service unavailable: ${fetchError.message} - returning empty result with service status`);
        dataSource = 'service_unavailable';
      }

      console.log(`RATSIB boundaries result: ${allBoundaries.length} boundaries (service available: ${serviceAvailable})`);

      const result = {
        success: true,
        ratsib: {
          boundaries: allBoundaries,
          totalFound: allBoundaries.length,
          bbox: 'australia_wide',
          source: dataSource,
          serviceAvailable: serviceAvailable,
          message: serviceAvailable
            ? undefined
            : 'NNTT RATSIB service is temporarily unavailable. Data will be loaded when service is restored.'
        },
        timestamp: new Date().toISOString()
      };

      // Add cache headers - shorter cache time when service is unavailable
      res.set({
        'Cache-Control': serviceAvailable ? 'public, max-age=1800' : 'public, max-age=300', // 30 min or 5 min
        'ETag': `"ratsib-all-${allBoundaries.length}-${serviceAvailable}"`
      });

      res.json(result);

    } catch (error) {
      console.error('All RATSIB boundaries error:', error);
      // Return graceful empty response instead of error
      res.json({
        success: true,
        ratsib: {
          boundaries: [],
          totalFound: 0,
          bbox: 'australia_wide',
          source: 'service_error',
          serviceAvailable: false,
          message: 'RATSIB service temporarily unavailable'
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // ABS Indigenous Regions endpoint
  app.get("/api/territories/map-view/abs-regions", async (req, res) => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          error: 'Coordinates required',
          message: 'lat and lng query parameters are required'
        });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'Invalid coordinates',
          message: 'lat and lng must be valid numbers'
        });
      }

      const { fetchABSIndigenousRegions } = await import('../abs-indigenous-regions-service');
      const absData = await fetchABSIndigenousRegions(latitude, longitude, 'Map View');

      res.set({
        'Cache-Control': 'public, max-age=1800', // 30 minutes
        'ETag': `"abs-ireg-${latitude.toFixed(1)}-${longitude.toFixed(1)}-${absData.totalFound}"`
      });

      res.json({
        success: true,
        coordinates: { lat: latitude, lng: longitude },
        absRegions: absData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('ABS Indigenous Regions error:', error);
      res.status(500).json({
        error: 'Failed to fetch ABS Indigenous Regions',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // AIATSIS Language Boundaries endpoint
  app.get("/api/territories/map-view/aiatsis-languages", async (req, res) => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          error: 'Coordinates required',
          message: 'lat and lng query parameters are required'
        });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          error: 'Invalid coordinates',
          message: 'lat and lng must be valid numbers'
        });
      }

      const { fetchAIATSISLanguageBoundaries } = await import('../aiatsis-language-service');
      const aiatsisData = await fetchAIATSISLanguageBoundaries(latitude, longitude, 'Map View');

      res.set({
        'Cache-Control': 'public, max-age=1800', // 30 minutes
        'ETag': `"aiatsis-lang-${latitude.toFixed(1)}-${longitude.toFixed(1)}-${aiatsisData.totalFound}"`
      });

      res.json({
        success: true,
        coordinates: { lat: latitude, lng: longitude },
        aiatsisLanguages: aiatsisData,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('AIATSIS Language Boundaries error:', error);
      res.status(500).json({
        error: 'Failed to fetch AIATSIS Language Boundaries',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
