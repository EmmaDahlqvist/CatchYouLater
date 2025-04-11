import type { FishingRegulation } from './fetchFishingRegulations'; // Added RegulationFilter

export function displayFishingRegulations(data: FishingRegulation[], containerId: string) {
  const container = document.querySelector<HTMLDivElement>(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  // Clear the container and render the passed data
  container.innerHTML = data.map(reg => `
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