import '../frontend/css/style.css';
import { displayFormattedFishingRegulations } from './displayFishingRegulations.ts';
import { fetchAllFishingRegulations, getLatestFetchDate } from './fetchFishingRegulations.ts';
import { setupSearchBar } from './searchHandler.ts';
import { initializeMap } from './mapHandler.ts';


/** Loads the fishing regulation cards and searchbar */
async function loadData() {
  const data = await fetchAllFishingRegulations();

  // Display all regulations initially
  // displayFishingRegulations(data, '#regulations');
  displayFormattedFishingRegulations(data, '#regulations');

  // Set up the search bar functionality
  setupSearchBar('searchBar', data, '#regulations');

  await initializeMap();
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
