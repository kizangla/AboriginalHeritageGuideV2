import type { SearchResult } from '@shared/schema';

export async function geocodeAddress(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
  
  if (!response.ok) {
    throw new Error('Geocoding failed');
  }
  
  return response.json();
}

export async function reverseGeocode(lat: number, lng: number): Promise<any> {
  const response = await fetch(`/api/reverse-geocode/${lat}/${lng}`);
  
  if (!response.ok) {
    throw new Error('Reverse geocoding failed');
  }
  
  return response.json();
}
