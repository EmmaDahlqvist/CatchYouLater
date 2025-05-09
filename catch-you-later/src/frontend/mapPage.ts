import L from 'leaflet';

// Entry point for the map page logic
document.addEventListener('DOMContentLoaded', () => {
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.error('Leaflet library not found.');
        return;
    }

    const mapElement = document.getElementById('map-names');
    if (mapElement) {
        // Initialize the map
        const map = L.map(mapElement).setView([62.0, 15.0], 5); // Centered on Sweden, zoom level 5

        // Add a tile layer (OpenStreetMap)
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Fetch and add GeoJSON data for water names
        fetch('/data/scandinavian_waters_names_v3.geojson')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                const waterNamesLayer = L.geoJSON(data, {
                    onEachFeature: function (feature, layer) {
                        if (feature.properties) {
                            let popupContent = '';
                            if (feature.properties.name) {
                                popupContent += `<strong>${feature.properties.name}</strong>`;
                            }

                            if (feature.properties.wikipedia) {
                                const wikiParts = String(feature.properties.wikipedia).split(':');
                                if (wikiParts.length === 2) {
                                    const lang = wikiParts[0];
                                    const article = wikiParts[1];
                                    const wikipediaUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(article)}`;
                                    if (popupContent) popupContent += '<br>';
                                    popupContent += `<a href="${wikipediaUrl}" target="_blank">Wikipedia</a>`;
                                }
                            }

                            if (feature.properties.wikidata) {
                                const wikidataUrl = `https://www.wikidata.org/wiki/${feature.properties.wikidata}`;
                                if (popupContent) popupContent += '<br>';
                                popupContent += `<a href="${wikidataUrl}" target="_blank">Wikidata</a>`;
                            }

                            if (popupContent) {
                                layer.bindPopup(popupContent);
                            }
                        }
                    },
                    style: function () { // No 'feature' parameter as it's not used
                        return { color: '#007bff', weight: 1 }; // Blue color for water features
                    }
                }).addTo(map);

                // Fetch and add GeoJSON data for Swedish coastal zones
                fetch('/data/svenska_kustzoner.geojson')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status} for svenska_kustzoner.geojson`);
                        }
                        return response.json();
                    })
                    .then(kustzonerData => {
                        const coastalZonesLayer = L.geoJSON(kustzonerData, {
                            onEachFeature: function (feature, layer) {
                                if (feature.properties) {
                                    let popupContent = '';
                                    if (feature.properties.namn) {
                                        popupContent += `<strong>${feature.properties.namn}</strong>`;
                                    }
                                    if (feature.properties.wikipedia) {
                                        if (popupContent) popupContent += '<br>';
                                        popupContent += `<a href="${feature.properties.wikipedia}" target="_blank">Wikipedia</a>`;
                                    }
                                    if (feature.properties.wikimedia) {
                                        if (popupContent) popupContent += '<br>';
                                        popupContent += `<a href="${feature.properties.wikimedia}" target="_blank">Wikimedia Commons</a>`;
                                    }
                                    if (popupContent) {
                                        layer.bindPopup(popupContent);
                                    }
                                }
                            },
                            style: function () {
                                return { color: '#28a745', weight: 2, opacity: 0.7 }; // Green color for coastal zones
                            }
                        }).addTo(map);

                        // Add layer control (ensure this is done after all layers are potentially added)
                        const baseMaps = {
                            "OpenStreetMap": osmLayer
                        };

                        const overlayMaps = {
                            "Water Names": waterNamesLayer,
                            "Coastal Zones": coastalZonesLayer
                        };

                        L.control.layers(baseMaps, overlayMaps).addTo(map);
                        console.log('Water names and Coastal Zones GeoJSON layers added and layer control initialized.');
                    })
                    .catch(error => {
                        console.error('Error loading or parsing Coastal Zones GeoJSON:', error);
                    });

                // console.log('Water names GeoJSON layer added and layer control initialized.'); // Moved inside the second fetch's .then()
            })
            .catch(error => {
                console.error('Error loading or parsing Water Names GeoJSON:', error);
            });

        console.log('Map initialized');
    } else {
        console.error('Map container element not found!');
    }
});
