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
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // You can add more map features here (markers, polygons, etc.)
        console.log('Map initialized');
    } else {
        console.error('Map container element not found!');
    }
});
