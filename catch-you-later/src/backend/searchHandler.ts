import { displayFishingRegulations } from './displayFishingRegulations.ts';
import type { FishingRegulation } from './fetchFishingRegulations.ts';

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
    const query = searchBar.value.toLocaleLowerCase();

    if (!query) {
      displayFishingRegulations(regulations, containerId);
      return;
    }

    const filterReg = regulations.filter(regulation =>
      regulation.Species.toLowerCase().includes(query)
    );
    
    displayFishingRegulations(filterReg, containerId);
  });

}
