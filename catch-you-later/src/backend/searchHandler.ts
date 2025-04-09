import { displayFishingRegulations } from './displayFishingRegulations.ts';
import type { FishingRegulation, RegulationFilter } from './fetchFishingRegulations.ts';
import { filterRegulations } from './fetchFishingRegulations.ts';


export function setupSearchBar(
  searchBarId: string,
  regulations: FishingRegulation[],
  containerId: string
): void {
  const searchBar = document.getElementById(searchBarId) as HTMLInputElement;

  if (!searchBar) {
    console.warn(`Search bar with ID "${searchBarId}" not found.`);
    return;
  }

  searchBar.addEventListener('input', () => {
    const query = searchBar.value;

    if (!query) {
      displayFishingRegulations(regulations, containerId);
      return;
    }

    const filter: RegulationFilter = { Species: query};
    const filteredRegulations = filterRegulations(regulations, filter);

    displayFishingRegulations(filteredRegulations, containerId);
  });

}
