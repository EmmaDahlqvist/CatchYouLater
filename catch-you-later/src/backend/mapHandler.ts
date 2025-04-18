import * as L from 'leaflet';

const API_BASE_URL = 'https://gw-test.havochvatten.se/external-public/fishing-regulations/v1';

export async function initializeMap(): Promise<L.Map> {
    const map = L.map('map').setView([63.0, 16.0], 5); // Centered on Sweden

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    const geographies = await fetchGeographies();
    drawPolygons(map, geographies);

    return map;
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
