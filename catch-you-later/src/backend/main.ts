import '../frontend/css/style.css';
import { displayFormattedFishingRegulations } from './displayFishingRegulations.ts';
import { fetchAllFishingRegulations } from './fetchFishingRegulations.ts';
import { setupSearchBar } from './searchHandler.ts';

// Loads the fishing regulation cards
async function loadData() {
  const data = await fetchAllFishingRegulations();

  // Display all regulations initially
  // displayFishingRegulations(data, '#regulations');
  displayFormattedFishingRegulations(data, '#regulations');

  // Set up the search bar functionality
  setupSearchBar('searchBar', data, '#regulations');
}

loadData();