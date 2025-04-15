import { displayFishingRegulations } from './displayFishingRegulations.ts';
import type { FishingRegulation } from './fetchFishingRegulations.ts';
import type { FormattedRule } from './fetchFishingRegulations.ts';
import { displayFormattedFishingRegulations } from './displayFishingRegulations.ts';

export function setupSearchBar(
  searchBarId: string,
  regulations: FormattedRule[],
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
      displayFormattedFishingRegulations(regulations, containerId);
      return;
    }

    const filterReg = regulations.filter(regulation =>
      regulation.species.toLowerCase().includes(query) || 
      regulation.gear.toLowerCase().includes(query) ||
      regulation.location.toLowerCase().includes(query) ||
      regulation.text.toLowerCase().includes(query) ||
      regulation.type.toLowerCase().includes(query) ||
      regulation.targetGroup.toLowerCase().includes(query)
    );

    console.log('Filtered regulations:', filterReg);
    
    displayFormattedFishingRegulations(filterReg, containerId);
  });

}
