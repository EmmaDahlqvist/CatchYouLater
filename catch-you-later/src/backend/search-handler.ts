import type { FormattedFishingRule } from './fetch-fishing-regulations.ts';
import { displayFormattedFishingRegulations } from './display-fishing-regulations.ts';
import { updatePolygons } from './map-handler.ts';

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

    let prioritizedAndFilteredRegulations = prioritizeAndFilterQuery(query, regulations);
    
    // Update the displayed regulations
    displayFormattedFishingRegulations(prioritizedAndFilteredRegulations, containerId);

    // Update the polygons on the map
    await updatePolygons(map, prioritizedAndFilteredRegulations);
  });
}

/** Function to prioritize and filter the search results based on the query.
 * * @param query - The search query entered by the user.
 * * @param regulations - The list of fishing regulations to filter.
 * * @returns - A new array of filtered and prioritized (sorted) regulations.
 * - exact match get higher score than partial match,
 * - species get higher score than location name,
 * - location name get higher score than rule text.
*/
function prioritizeAndFilterQuery(query : string, regulations: FormattedFishingRule[]) {
  let filteredRegulations = regulations;
  if (query) {
    const queryLower = query.toLowerCase();
    const queryRegex = new RegExp(`\\b${queryLower}\\b`, 'i');
  
    filteredRegulations = regulations
      .map(regulation => {
        let score = 0;
  
        // Specie name
        for (const specie of regulation.species) {
          const lower = specie.toLowerCase();
          if (queryRegex.test(lower)) {
            score += 10; // exact match
            console.log("exact specie match", regulation.text, score);
          } else if (lower.includes(queryLower)) {
            score += 3; // partial match
            console.log("partial specie match", regulation.text, score);
          }
        }
  
        // Location name
        for (const loc of regulation.location) {
          const lower = loc.name.toLowerCase();
          if (queryRegex.test(lower)) {
            score += 6; // exact match
            console.log("exact loc match", regulation.text, score);
          } else if (lower.includes(queryLower)) {
            score += 2; // partial match
            console.log("partial loc match", regulation.text, score);
          }
        }
  
        // Rule text
        const textLower = regulation.text.toLowerCase();
        if (queryRegex.test(textLower)) {
          score += 4; // exact match
          console.log("exact text match", regulation.text, score);
        } else if (textLower.includes(queryLower)) {
          score += 1; // partial match
          console.log("partial text match", regulation.text, score);
        }
  
        return { ...regulation, _score: score };
      })
      .filter(r => r._score > 0) // Filter out regulations with no score
      .sort((a, b) => b._score - a._score); // Sort by score in descending order
  }

  return filteredRegulations;
}
