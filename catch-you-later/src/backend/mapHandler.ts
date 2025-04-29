import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { FormattedFishingRule } from './fetchFishingRegulations.ts';

const API_BASE_URL = 'https://gw-test.havochvatten.se/external-public/fishing-regulations/v1';
let drawnPolygons: L.LayerGroup | null = null;
let currentToken: Symbol | null = null;

export async function initializeMap(): Promise<L.Map> {
    const map = L.map('map', { zoomSnap: 0 }).setView([62.0, 16.0], 4.8); // Centered on Sweden

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    return map;
}

export async function fetchGeographyById(geoId: string): Promise<any | null> {
    try {
        const response = await fetch(`${API_BASE_URL}/geographies/${geoId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch geography with ID ${geoId}: ${response.statusText}`);
        }

        const geography = await response.json();
        return geography;
    } catch (error) {
        console.error(`Error fetching geography with ID ${geoId}:`, error);
        return null;
    }
}

export async function updatePolygons(map: L.Map, regulations: FormattedFishingRule[]): Promise<void> {
    try {
        // Generate a new token for this operation
        const token = Symbol();
        currentToken = token;

        // Wait for potential searchbar updates (causes lag otherwise)
        await new Promise(resolve => setTimeout(resolve, 500));

        if (drawnPolygons) {
            map.removeLayer(drawnPolygons);
        }

        if (regulations.length === 0) {
            console.log('No regulations to display on the map.');
            return;
        }

        drawnPolygons = L.layerGroup();

        // Use a Set to track processed location IDs
        const processedLocations = new Set<string>();

        for (const regulation of regulations) {
            for (const location of regulation.location) {
                if (currentToken !== token) {
                    console.log('Polygon drawing interrupted by a new updatePolygons call.');
                    return;
                }

                // Skip if this location has already been processed
                if (processedLocations.has(location.id)) {
                    continue;
                }

                processedLocations.add(location.id);

                const geography = location.geography;
                if (geography && geography.geometry && geography.geometry.coordinates) {
                    if (geography.geometry.type === 'MultiPolygon') {
                        geography.geometry.coordinates.forEach((polygon: any) => {
                            polygon.forEach((ring: any) => {
                                const coordinates: L.LatLngTuple[] = ring.map((coord: any) => [coord[1], coord[0]]);
                                const leafletPolygon = L.polygon(coordinates, { color: 'blue' });
                                leafletPolygon.bindPopup(`<b>${location.name || 'Unknown Location'}</b>`);
                                drawnPolygons?.addLayer(leafletPolygon);
                            });
                        });
                    } else if (geography.geometry.type === 'Polygon') {
                        geography.geometry.coordinates.forEach((ring: any) => {
                            const coordinates: L.LatLngTuple[] = ring.map((coord: any) => [coord[1], coord[0]]);
                            const leafletPolygon = L.polygon(coordinates, { color: 'blue' });
                            leafletPolygon.bindPopup(`<b>${location.name || 'Unknown Location'}</b>`);
                            drawnPolygons?.addLayer(leafletPolygon);
                        });
                    }
                }
            }
        }

        drawnPolygons.addTo(map);
    } catch (error) {
        console.error('Error updating polygons:', error);
    }
}
