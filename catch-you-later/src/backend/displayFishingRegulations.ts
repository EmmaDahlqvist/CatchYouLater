import type { FishingRegulation } from './fetchFishingRegulations'; // Added RegulationFilter
import type { FormattedRule } from './fetchFishingRegulations'; 

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

export function displayFormattedFishingRegulations(data: FormattedRule[], containerId: string) {
  const container = document.querySelector<HTMLDivElement>(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  // Clear the container and render the passed data
  container.innerHTML = data.map(rule => `
    <div class="regulation-card">
      <div class="regulation-grid">
        <div><strong>Species</strong><br>${rule.species}</div>
        <div><strong>Location</strong><br>${rule.location}</div>
        <div><strong>Rule</strong><br>${rule.text}</div>
        <div><strong>Type</strong><br>${rule.type}</div>
        <div><strong>Starts</strong><br>${rule.startsAt}</div>
        <div><strong>Gear</strong><br>${rule.gear}</div>
        <div><strong>Group</strong><br>${rule.targetGroup}</div>
      </div>
    </div>
  `).join('');
}
