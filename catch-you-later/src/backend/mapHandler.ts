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
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'flex';

    try {
        // Generate a new token for this operation
        const token = Symbol();
        currentToken = token;

        if (drawnPolygons) {
            map.removeLayer(drawnPolygons);
        }

        if (regulations.length === 0) {
            console.log('No regulations to display on the map.');
            return;
        }

        drawnPolygons = L.layerGroup();

        const locationIds = regulations.flatMap(regulation => regulation.location.map(loc => loc.id));
        const uniqueLocationIds = Array.from(new Set(locationIds));

        for (const locationId of uniqueLocationIds) {
            if (currentToken !== token) {
                console.log('Polygon drawing interrupted by a new updatePolygons call.');
                return;
            }

            const geography = await fetchGeographyById(locationId);
            if (geography && geography.geometry && geography.geometry.coordinates) {
                if (geography.geometry.type === 'MultiPolygon') {
                    geography.geometry.coordinates.forEach((polygon: any) => {
                        polygon.forEach((ring: any) => {
                            const coordinates: L.LatLngTuple[] = ring.map((coord: any) => [coord[1], coord[0]]);
                            const leafletPolygon = L.polygon(coordinates, { color: 'blue' });
                            leafletPolygon.bindPopup(`<b>${geography.geographyName || 'Unknown Location'}</b>`);
                            drawnPolygons?.addLayer(leafletPolygon);
                        });
                    });
                } else if (geography.geometry.type === 'Polygon') {
                    geography.geometry.coordinates.forEach((ring: any) => {
                        const coordinates: L.LatLngTuple[] = ring.map((coord: any) => [coord[1], coord[0]]);
                        const leafletPolygon = L.polygon(coordinates, { color: 'blue' });
                        leafletPolygon.bindPopup(`<b>${geography.geographyName || 'Unknown Location'}</b>`);
                        drawnPolygons?.addLayer(leafletPolygon);
                    });
                }
            }
        }

        drawnPolygons.addTo(map);
    } catch (error) {
        console.error('Error updating polygons:', error);
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

async function fetchGeographies(limit: number = 20, after: string | null = null): Promise<any[]> {
    try {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        if (after) {
            params.append('after', after);
        }

        const response = await fetch(`${API_BASE_URL}/geographies?${params.toString()}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch geographies: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Geographies:', data);

        return data.list;
    } catch (error) {
        console.error('Error fetching geographies:', error);
        return [];
    }
}

function drawPolygons(map: L.Map, geographies: any[]) {
    geographies.forEach((geo: any) => {
        console.log('Processing geography:', geo);

        if (!geo.geometry || !geo.geometry.coordinates) {
            console.warn(`Invalid geometry for geography: ${geo.geographyName}`);
            return;
        }

        if (geo.geometry.type === 'MultiPolygon') {
            geo.geometry.coordinates.forEach((polygon: any) => {
                polygon.forEach((ring: any) => {
                    const coordinates: L.LatLngTuple[] = ring.map((coord: any) => [coord[1], coord[0]]);
                    const leafletPolygon = L.polygon(coordinates, { color: 'blue' });
                    leafletPolygon.addTo(map);
                    leafletPolygon.bindPopup(`<b>${geo.geographyName}</b><br>${geo.description || 'No description available'}`);
                });
            });
        } else if (geo.geometry.type === 'Polygon') {
            geo.geometry.coordinates.forEach((ring: any) => {
                const coordinates: L.LatLngTuple[] = ring.map((coord: any) => [coord[1], coord[0]]);
                const leafletPolygon = L.polygon(coordinates, { color: 'blue' });
                leafletPolygon.addTo(map);
                leafletPolygon.bindPopup(`<b>${geo.geographyName}</b><br>${geo.description || 'No description available'}`);
            });
        } else {
            console.warn(`Unsupported geometry type for geography: ${geo.geographyName}`);
        }
    });
}
