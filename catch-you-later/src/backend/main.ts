import '../frontend/css/style.css';
import { displayFormattedFishingRegulations } from './displayFishingRegulations.ts';
import { fetchAllFishingRegulations, getLatestFetchDate } from './fetchFishingRegulations.ts';
import { setupSearchBar } from './searchHandler.ts';

// Loads the fishing regulation cards
async function loadData() {
  const data = await fetchAllFishingRegulations();

  // Display all regulations initially
  // displayFishingRegulations(data, '#regulations');
  displayFormattedFishingRegulations(data, '#regulations');
  attachRuleButtonListeners();

  // Set up the search bar functionality
  setupSearchBar('searchBar', data, '#regulations');
}

async function updateLatestFetchDate() {
  const latestFetchDate = await getLatestFetchDate();
  const dateElement = document.getElementById("latest-fetch-date");
  if (dateElement) {
    dateElement.textContent = latestFetchDate;
  }
}


// Function to attach event listeners to rule buttons
function attachRuleButtonListeners() {
  const container = document.querySelector('#regulations');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;

    // Kolla om man klickat på en regelknapp
    if (target.classList.contains('rule-btn')) {
      const btn = target as HTMLButtonElement;

      const text = decodeURIComponent(btn.dataset.ruleText || '');
      const type = btn.dataset.ruleType;

      console.log('Klickade regel:', { text, type });
    }
  });
}

updateLatestFetchDate();

loadData();
