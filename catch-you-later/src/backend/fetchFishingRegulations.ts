/* A type for fetching fishing regulations */
export type FishingRegulation = {
    Species: string;
    MinSize: string | null;
    MaxSize: string | null;
    Area: string;
};

/* A type for the filter criteria */
export type RegulationFilter = {
  [K in keyof FishingRegulation]?: FishingRegulation[K];
};

/* A function to filter fishing regulations based on specified criteria */
export function filterRegulations(
  regulations: FishingRegulation[],
  filters: RegulationFilter
): FishingRegulation[] {
  return regulations.filter(regulation => {
    // Iterate over each key in the filters object
    for (const key in filters) {
      // Check if the filter key is a valid key of FishingRegulation
      if (Object.prototype.hasOwnProperty.call(filters, key) && key in regulation) {
        // Type assertion to help TypeScript understand the key
        const filterKey = key as keyof FishingRegulation;
        const filterValue = filters[filterKey];
        const regulationValue = regulation[filterKey];


        if (typeof regulationValue === 'string' && typeof filterValue === 'string') {
          if (regulationValue.toLowerCase() !== filterValue.toLowerCase()) {
            return false; 
          }
        } else {
          // If not both strings, perform a standard comparison
          // Handles null comparison correctly (filterValue === null means we want regulations where the value is null)
          if (regulationValue !== filterValue) {
            return false; // Doesn't match this filter criterion
          }
        }
      } else {
         // Optionally handle cases where the filter key isn't part of FishingRegulation,
         // though the RegulationFilter type should largely prevent this.
         // console.warn(`Filter key \"${key}\" is not a valid attribute of FishingRegulation.`);
         // Depending on desired behavior, you might want to return false or ignore the invalid key.
         // For now, we'll ignore invalid keys.
      }
    }
    // If the regulation passed all filter checks, include it
    return true;
  });
}


/* A function to fetch fishing regulations from a JSON file */
export async function fetchFishingRegulations(): Promise<FishingRegulation[]> {
    const response = await fetch('/data/fishing_regulations.json');
    if (!response.ok) {
        throw new Error('Failed to fetch fishing regulations');
    }

    return await response.json();
}
