import '../frontend/css/style.css' 
import { displayFishingRegulations } from './displayFishingRegulations.ts'
import { fetchFishingRegulations, type FishingRegulation } from './fetchFishingRegulations.ts'

// Loads the fishing regulation cards
async function loadData() {
  const data = await fetchFishingRegulations();
  displayFishingRegulations(data, '#regulations');
}
loadData();
