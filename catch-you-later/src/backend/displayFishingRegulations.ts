import type { FormattedFishingRule } from './fetchFishingRegulations';
import { groupFormattedRulesBySpeciesAndLocation, removeGeneralRules } from './helpers';

/**Display fishing rules as cards and rule buttons */
export function displayFormattedFishingRegulations(
  data: FormattedFishingRule[],
  containerId: string
) {
  const container = document.querySelector<HTMLDivElement>(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  // Remove "Allmän regel" rules
  const filteredData = removeGeneralRules(data);

  // Group the rules by species and location
  const grouped = groupFormattedRulesBySpeciesAndLocation(filteredData);

  

  // Html
  container.innerHTML = [...grouped.entries()]
    .map(([_, rules]) => {
      const { species, location } = rules[0];
      const speciesLabel = species.length > 0 ? species.join(', ') : 'Ingen specificerad';
      const locationNames = location.length > 0
        ? location.map(l => l.name).join(', ')
        : 'Ingen specificerad';

      return `
        <div class="rule-card" location-ids="${location.map(l => l.id).join(',')}"> <!--för framtida bruk så ska man lätt kunna få id-->
 <div class="rule-row">
        
          <div class="rule-column">
            <div><strong>Art</strong><br></div>
            <div><a href="">${speciesLabel}</a></div>
          </div>

          <div class="rule-column">
            <div><strong>Plats</strong></div>
            <div><p>${locationNames}</p></div>
          </div>

          <div class="small-rule-column">
          </div>


          <div class="rule-column rule-buttons-wrap rule-text">
            <strong>Fiskeregler</strong>
            <div class="rule-buttons">
            ${rules
              .map((rule, i) => `
                <button 
                  class="rule-btn"
                  data-rule-type="${rule.type}"
                  data-rule-text="${encodeURIComponent(rule.text)}"
                >
                  Regel nr ${i + 1}
                </button>
              `)
              .join('')}
            </div>
          </div>

        </div>
        </div>
      `;
    })
    .join('');

    attachRuleButtonListeners();
}

/** Function to attach event listeners to rule buttons*/ 
function attachRuleButtonListeners() {
  buttonClickListener();
  buttonColorSelector();
}

/** Function to add event listeners to each button and log the rule text and type when clicked */
function buttonClickListener (){
  document.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLButtonElement;

      const text = decodeURIComponent(el.dataset.ruleText || '');
      const type = el.dataset.ruleType;

      console.log('Klickade regel:', {text, type });
    });
  });
}

/** Function to set the color of the buttons based on their type */
function buttonColorSelector() {
  const buttons = document.querySelectorAll('.rule-btn');
  buttons.forEach((button) => {
    const ruleType = button.getAttribute('data-rule-type');
    if (ruleType === 'Förbud') {
      button.classList.add('red-btn');
    } else if (ruleType === 'Artbegränsning') {
      button.classList.add('purple-btn');
    } else if (ruleType === 'Redskapsbegränsning') {
      button.classList.add('blue-btn');
    } else {
      button.classList.add('gray-btn');
    }
  });
}


