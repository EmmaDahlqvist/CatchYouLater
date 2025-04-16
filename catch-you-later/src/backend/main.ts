import '../frontend/css/style.css';
import { displayFormattedFishingRegulations } from './displayFishingRegulations';
import { fetchAllFishingRegulations } from './fetchFishingRegulations';
import { setupSearchBar } from './searchHandler';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

declare global {
  interface Window { loggedFirstFeature?: boolean; }
}
window.loggedFirstFeature = false; // Initialize the flag

let mapInstance: L.Map | null = null;

// --- Interfaces and Types ---
// Define expected properties from your GeoJSON here
// Example properties based on previous exploration:
// TEMPORARILY COMMENTED OUT - TS Build Error (TS6196)
// interface LakeProperties {
//     PRIMARYIND?: number;
//     land?: string;
//     Shape_Area?: number;
//     Shape_Leng?: number;
//     // Add 'name' and 'id' if you intend to use them, even if potentially missing
//     name?: string;
//     id?: number | string;
// }

async function addGeoJsonLayer(): Promise<void> {
    if (!mapInstance) {
        console.error("Map instance not available for GeoJSON layer.");
        return;
    }
    console.log("Attempting to add GeoJSON data...");
    try {
        // Fetch the GeoJSON data - UPDATED FILENAME to v3 (Python script output)
        const response = await fetch('data/scandinavian_waters_names_v3.geojson');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const lakeData = await response.json(); // Parse the JSON response

        // Add the GeoJSON layer to the map
        L.geoJSON(lakeData, {
            style: function() {
                // Style for the lake polygons
                return { color: "#007bff", weight: 1, fillOpacity: 0.5 };
            },
            onEachFeature: function (feature, layer) {
                // --- TEMPORARY LOGGING ---
                // Log properties of the first feature encountered and stop
                if (feature.properties && !window.loggedFirstFeature) {
                    console.log("Properties of the first GeoJSON feature:", JSON.stringify(feature.properties, null, 2));
                    window.loggedFirstFeature = true; // Set a flag to log only once
                }
                // --- END TEMPORARY LOGGING ---

                if (feature.properties) {
                    // Initialize popup content
                    let popupContent = '';

                    // Log all properties to the console for debugging
                    console.log("Clicked feature properties:", feature.properties);

                    // Add name if available
                    if (feature.properties.name) {
                        popupContent += `<strong>${feature.properties.name}</strong><br>`;
                    } else {
                        popupContent += 'Unnamed water body<br>'; // Default if no name
                    }

                    // Add description if available
                    if (feature.properties.description) {
                        popupContent += `${feature.properties.description}<br>`;
                    }

                    // Add Area
                    if (feature.properties.Shape_Area) {
                        const area = feature.properties.Shape_Area;
                        const displayArea = area > 1000000
                            ? `${(area / 1000000).toFixed(2)} km²`
                            : `${area.toFixed(0)} m²`;
                        popupContent += `Area: ${displayArea}<br>`;
                    }

                    // Add Wikipedia link if available
                    if (feature.properties.wikipedia) {
                        const wikiUrl = feature.properties.wikipedia.startsWith('http') 
                            ? feature.properties.wikipedia 
                            : `https://en.wikipedia.org/wiki/${feature.properties.wikipedia}`;
                        // Basic heuristic for language prefix, default to 'en'
                        const langCodeMatch = feature.properties.wikipedia.match(/^([a-z]{2,3}):/);
                        const lang = langCodeMatch ? langCodeMatch[1] : 'en'; 
                        const wikiLink = `https://${lang}.wikipedia.org/wiki/${feature.properties.wikipedia.replace(/^([a-z]{2,3}):/, '')}`;
                        popupContent += `<a href="${wikiLink}" target="_blank">Wikipedia</a><br>`;
                    }

                    // Add Wikidata link if available
                    if (feature.properties.wikidata) {
                        const wikidataLink = `https://www.wikidata.org/wiki/${feature.properties.wikidata}`;
                        popupContent += `<a href="${wikidataLink}" target="_blank">Wikidata</a>`;
                    }
                    
                    // Trim trailing <br> if present
                    popupContent = popupContent.replace(/<br>$/, '');

                    if (popupContent) { // Only bind if there's content
                         layer.bindPopup(popupContent);
                    } else {
                        console.log("Feature has properties but no displayable content:", feature.properties);
                    }
                   
                } else {
                     console.log("Feature has no properties:", feature);
                }
            }
        }).addTo(mapInstance);

    } catch (error) {
        console.error("Could not load lake data:", error);
    }
}

function initializeMap() {
    if (!mapInstance && document.getElementById('map')) { 
        console.log("Initializing map...");
        mapInstance = L.map('map', {
            preferCanvas: false 
        }).setView([62, 15], 5); 

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapInstance);

        mapInstance.on('click', function(e) {
            console.log("--- MAP CLICKED ---");
            console.log("Coordinates:", e.latlng);
            console.log("Original Event Target Element:", e.originalEvent.target);
        });

        setTimeout(() => {
            if (mapInstance) { 
                console.log("Adding GeoJSON layer inside timeout...");
                addGeoJsonLayer();
                console.log("GeoJSON layer potentially added, invalidating map size...");
                mapInstance.invalidateSize();
            }
        }, 100); 
    } else if (mapInstance) {
        console.log("Map already initialized. Ensuring size is correct.");
        mapInstance.invalidateSize(); 

        // Consider if GeoJSON needs to be re-added or checked here if it wasn't added initially
        // For now, assume it was added during the initial 'initializeMap' call
    }
}

function setupTabs(): void {
    const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-button');
    const tabContents = document.querySelectorAll<HTMLDivElement>('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.add('active');
                    if (tabId === 'mapTab') {
                        setTimeout(() => {
                            initializeMap(); 
                        }, 0);
                    }
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });

    if (document.querySelector('#mapTab')?.classList.contains('active')) {
        setTimeout(() => { initializeMap(); }, 0);
    }
}

async function loadData(): Promise<void> {
    try {
        const data = await fetchAllFishingRegulations();

        const regulationsContainer = document.querySelector('#regulationsTab #regulations');
        if (!regulationsContainer) {
            console.error('Regulations container not found inside #regulationsTab!');
            return;
        }

        regulationsContainer.innerHTML = '';

        displayFormattedFishingRegulations(data, '#regulationsTab #regulations');

        setupSearchBar('searchBar', data, '#regulationsTab #regulations');

    } catch (error) {
        console.error('Failed to load fishing regulations:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    setupTabs();
    loadData(); 
    // Map initialization is now triggered by setupTabs when the map tab is first shown
    // If the 'Regulations' tab is active first, the map won't init until the user clicks the 'Map' tab.
});