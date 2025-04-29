import type { FormattedFishingRule } from './fetchFishingRegulations.ts';
import { displayFormattedFishingRegulations } from './displayFishingRegulations.ts';
import { updatePolygons } from './mapHandler.ts';

export function setupSearchBar(
  searchBarId: string,
  regulations: FormattedFishingRule[],
  containerId: string,
  map: L.Map
): void {
  const searchBar = document.getElementById(searchBarId) as HTMLInputElement;

  if (!searchBar) {
    console.warn(`Search bar with ID "${searchBarId}" not found.`);
    return;
  }

  searchBar.addEventListener('input', async () => {
    const query = searchBar.value.toLocaleLowerCase();

    let filteredRegulations = regulations;

    if (query) {
      filteredRegulations = regulations.filter(regulation => {
        return (
          regulation.species.some(specie =>
            specie.toLowerCase().includes(query)
          ) ||
          regulation.location.some(location =>
            location.name.toLowerCase().includes(query)
          ) ||
          regulation.text.toLocaleLowerCase().includes(query)
        );
      });
    }

    console.log('Filtered regulations:', filteredRegulations);

    // Update the displayed regulations
    displayFormattedFishingRegulations(filteredRegulations, containerId);

    // Update the polygons on the map
    await updatePolygons(map, filteredRegulations);
  });
}
