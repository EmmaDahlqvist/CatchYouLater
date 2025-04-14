import '../frontend/css/style.css';
import { displayFishingRegulations, displayFormattedFishingRegulations } from './displayFishingRegulations.ts';
import { fetchFishingRegulations, fetchAllFishingRegulations } from './fetchFishingRegulations.ts';
import { setupSearchBar } from './searchHandler.ts';

// Loads the fishing regulation cards
async function loadData() {
  const data = await fetchFishingRegulations();
  const apiData = await fetchAllFishingRegulations();

  // Display all regulations initially
  // displayFishingRegulations(data, '#regulations');
  displayFormattedFishingRegulations(apiData, '#regulations');

  // Set up the search bar functionality
  setupSearchBar('searchBar', data, '#regulations');
}

loadData();