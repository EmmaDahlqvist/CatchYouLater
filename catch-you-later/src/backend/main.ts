import '../frontend/css/style.css';
import { displayFormattedFishingRegulations } from './displayFishingRegulations.ts';
import { fetchAllFishingRegulations, getLatestFetchDate } from './fetchFishingRegulations.ts';
import { setupSearchBar } from './searchHandler.ts';
import { initializeMap } from './mapHandler.ts';
import { updatePolygons } from './mapHandler.ts';

/** Loads the fishing regulation cards and searchbar */
async function loadData() {
  const data = await fetchAllFishingRegulations();

  // Display all regulations initially
  displayFormattedFishingRegulations(data, '#regulations');

  // Initialize the map
  const map = await initializeMap();

  // Set up the search bar functionality
  setupSearchBar('searchBar', data, '#regulations', map);

  await updatePolygons(map, data);

}

/** Updates the latest fetch date in the UI */
async function updateLatestFetchDate() {
  const latestFetchDate = await getLatestFetchDate();
  const dateElement = document.getElementById("latest-fetch-date");
  if (dateElement) {
    dateElement.textContent = latestFetchDate;
  }
}


updateLatestFetchDate();

loadData();
