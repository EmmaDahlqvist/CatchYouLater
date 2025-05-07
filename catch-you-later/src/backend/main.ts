import '../frontend/css/style.css';
import { displayFormattedFishingRegulations } from './display-fishing-regulations.ts';
import { displayGeneralRules } from './display-general-regulations.ts';
import { fetchAllFishingRegulations, getLatestFetchDate } from './fetch-fishing-regulations.ts';
import { setupSearchBar } from './search-handler.ts';
import { initializeMap } from './map-handler.ts';
import { updatePolygons } from './map-handler.ts';
import { removeGeneralRules, removeRulesWithText } from './helpers.ts';

/** Loads the fishing regulation cards and searchbar */
async function loadData() {
  let data = await fetchAllFishingRegulations();

  // Display general rules
  displayGeneralRules(data, '#general-rules');
  
  // Initialize the map
  const map = await initializeMap();

  // Remove "Allmän regel" rules, and rules with "regel" in the text
  const noGeneralRules = removeGeneralRules(data);
  const filteredData = removeRulesWithText("regel", noGeneralRules);
  data = filteredData;

  // Set up the search bar functionality
  setupSearchBar('searchBar', data, '#regulations', map);

  await updatePolygons(map, data);

  // Display all regulations initially
  displayFormattedFishingRegulations(data, '#regulations', map);

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