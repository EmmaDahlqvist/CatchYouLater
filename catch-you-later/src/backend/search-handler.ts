import type { FormattedFishingRule } from './fetch-fishing-regulations.ts';
import { displayFormattedFishingRegulations, selectedCards } from './display-fishing-regulations.ts';
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

    // Sort and filter the regulations based on the query
    let prioritizedAndFilteredRegulations = prioritizeAndFilterQuery(query, regulations);
    
    // Update the displayed regulations
    displayFormattedFishingRegulations(prioritizedAndFilteredRegulations, containerId, map);

    // Clear the selected cards
    selectedCards.clear();

    // Update the polygons on the map
    await updatePolygons(map, prioritizedAndFilteredRegulations, true);
  });
}

/** Function to prioritize/sort and filter the search results based on the query.
 * * @param query - The search query entered by the user.
 * * @param regulations - The list of fishing regulations to filter.
 * * @returns - A new array of filtered and prioritized (sorted) regulations.
 * - exact match get higher score than partial match,
 * - species get higher score than location name,
 * - location name get higher score than rule text.
*/
export function prioritizeAndFilterQuery(query: string, regulations: FormattedFishingRule[]) {
  let filteredRegulations = regulations;
  if (query) {
    const queryRegex = new RegExp(`(^|[^\\p{L}])${query}(?=[^\\p{L}]|$)`, 'iu');

    filteredRegulations = regulations
        .map(regulation => {
          let score = 0;

          // Reorder species to prioritize exact matches
          regulation.species = regulation.species.sort((a, b) => {
            const aExactMatch = a.toLowerCase() === query;
            const bExactMatch = b.toLowerCase() === query;

            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;

            const aPartialMatch = a.toLowerCase().includes(query);
            const bPartialMatch = b.toLowerCase().includes(query);

            if (aPartialMatch && !bPartialMatch) return -1;
            if (!aPartialMatch && bPartialMatch) return 1;

            return 0;
          });

          // Scoring logic
          for (const specie of regulation.species) {
            const lower = specie.toLowerCase();
            if (queryRegex.test(lower)) {
              score += 10; // exact match
            } else if (lower.includes(query)) {
              score += 3; // partial match
            }
          }

          for (const loc of regulation.location) {
            const lower = loc.name.toLowerCase();
            if (queryRegex.test(lower)) {
              score += 6; // exact match
            } else if (lower.includes(query)) {
              score += 2; // partial match
            }
          }

          const textLower = regulation.text.toLowerCase();
          if (queryRegex.test(textLower)) {
            score += 4; // exact match
          } else if (textLower.includes(query)) {
            score += 1; // partial match
          }

          return { ...regulation, _score: score };
        })
        .filter(r => r._score > 0) // Filter out regulations with no score
        .sort((a, b) => b._score - a._score); // Sort by score in descending order
  }

  return filteredRegulations;
}
