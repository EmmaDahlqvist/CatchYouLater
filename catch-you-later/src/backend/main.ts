import '../frontend/css/style.css';
import { displayFishingRegulations } from './displayFishingRegulations.ts';
import { fetchFishingRegulations } from './fetchFishingRegulations.ts';
import { setupSearchBar } from './searchHandler.ts';

// Loads the fishing regulation cards
async function loadData() {
  const data = await fetchFishingRegulations();

  // Display all regulations initially
  displayFishingRegulations(data, '#regulations');

  // Set up the search bar functionality
  setupSearchBar('searchBar', data, '#regulations');
}

loadData();
