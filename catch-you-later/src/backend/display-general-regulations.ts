import { getGeneralRules } from './helpers';
import type { FormattedFishingRule } from './fetch-fishing-regulations.ts';

/** Function to display general rules in a div as a list */
export async function displayGeneralRules(
    data: FormattedFishingRule[],
    containerId: string
) {
  const generalRules = getGeneralRules(data); // Filter general rules

  const container = document.querySelector<HTMLDivElement>(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  container.innerHTML = ''; // Clear existing content

  if (generalRules.length === 0) {
    container.innerHTML = '<p>Inga allmänna regler tillgängliga.</p>';
    return;
  }

  const listItems = generalRules.map(rule => `<li>${rule.text}</li>`).join('');
  container.innerHTML = `<ul>${listItems}</ul>`;
}