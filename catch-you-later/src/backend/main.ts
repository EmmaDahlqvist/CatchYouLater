import '../frontend/css/style.css';
import 'leaflet/dist/leaflet.css';
import { displayFormattedFishingRegulations } from './displayFishingRegulations.ts';
import { fetchAllFishingRegulations } from './fetchFishingRegulations.ts';
import { setupSearchBar } from './searchHandler.ts';
import { initializeMap } from './mapHandler.ts';

async function loadData() {
    const data = await fetchAllFishingRegulations();

    displayFormattedFishingRegulations(data, '#regulations');
    setupSearchBar('searchBar', data, '#regulations');

    await initializeMap();
}

loadData();
