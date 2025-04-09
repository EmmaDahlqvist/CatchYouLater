import type { FishingRegulation, RegulationFilter } from './fetchFishingRegulations'; // Added RegulationFilter
import { filterRegulations } from './fetchFishingRegulations'; // Added filterRegulations import

export function displayFishingRegulations(data: FishingRegulation[], containerId: string) {
  const container = document.querySelector<HTMLDivElement>(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  // --- Filtering Example ---
  // Define the filter criteria (e.g., only show regulations for 'Lax')
  const exampleFilter: RegulationFilter = { Species: 'lax'};
  // Apply the filter
  const filteredData = filterRegulations(data, exampleFilter);
  // ------------------------

  // Use the filteredData instead of the original data
  container.innerHTML = filteredData.map(reg => `
    <div class="regulation-card">
      <div class="regulation-grid">
        <div><strong>Species</strong><br>${reg.Species}</div>
        <div><strong>Area</strong><br>${reg.Area}</div>
        <div><strong>Min length</strong><br>${reg.MinSize ?? '–'}</div>
        <div><strong>Max length</strong><br>${reg.MaxSize ?? '–'}</div>
      </div>
    </div>
  `).join('');
}
