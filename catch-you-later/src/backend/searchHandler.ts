import type { FormattedFishingRule } from './fetchFishingRegulations.ts';
import { displayFormattedFishingRegulations } from './displayFishingRegulations.ts';

export function setupSearchBar(
  searchBarId: string,
  regulations: FormattedFishingRule[],
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

    const filterReg = regulations.filter(regulation => {
      const ruleTextWords : string[] = regulation.text.toLocaleLowerCase().match(/\p{L}+/gu) || [];
      return (
        regulation.species.some(specie =>
          specie.toLowerCase().includes(query)
        ) ||
        regulation.location.some(location =>
          location.name.toLowerCase().includes(query)
        ) ||
        ruleTextWords.includes(query) || 
        regulation.type.toLowerCase().includes(query) 
      ); 
    }
      
      
    );

    console.log('Filtered regulations:', filterReg);
    
    displayFormattedFishingRegulations(filterReg, containerId);
  });

}
