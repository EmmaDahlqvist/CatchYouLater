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
            <div><a href="https://www.youtube.com/watch?v=xvFZjo5PgG0">${speciesLabel}</a></div>
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
  setupModal(); // Initialize modal close listeners
}

/** Function to add event listeners to each button and log the rule text and type when clicked */
function buttonClickListener(){
  // Get modal elements once
  const modal = document.getElementById('ruleModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalRuleType = document.getElementById('modalRuleType');
  const modalRuleDescription = document.getElementById('modalRuleDescription');
  const modalTypeIndicator = document.querySelector('.modal-type-indicator');

  if (!modal || !modalOverlay || !modalTitle || !modalRuleType || !modalRuleDescription || !modalTypeIndicator) {
    console.error('Modal elements not found!');
    return;
  }

  document.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLButtonElement;

      const text = decodeURIComponent(el.dataset.ruleText || '');
      const type = el.dataset.ruleType || 'Okänd'; // Default to 'Okänd'
      const ruleNumberText = el.textContent?.trim() || 'Regel'; // Use button text for title

      // Populate Modal
      modalTitle.textContent = ruleNumberText;
      modalRuleType.textContent = type;
      modalRuleDescription.textContent = text;

      // Set indicator color
      modalTypeIndicator.className = 'modal-type-indicator'; // Reset classes
      if (type === 'Förbud') {
        modalTypeIndicator.classList.add('modal-indicator-red');
      } else if (type === 'Artbegränsning') {
        modalTypeIndicator.classList.add('modal-indicator-purple');
      } else if (type === 'Redskapsbegränsning') {
        modalTypeIndicator.classList.add('modal-indicator-blue');
      } else {
        modalTypeIndicator.classList.add('modal-indicator-gray');
      }

      // Show Modal
      modal.style.display = 'block';
      modalOverlay.style.display = 'block';

      console.log('Klickade regel:', { text, type }); // Keep console log for debugging if needed
    });
  });
}

/** Function to set up modal close functionality */
function setupModal() {
  const modal = document.getElementById('ruleModal');
  const modalOverlay = document.getElementById('modalOverlay');
  const closeButton = document.querySelector('.modal-close-btn');

  if (!modal || !modalOverlay || !closeButton) {
    console.error('Modal elements for closing not found!');
    return;
  }

  const closeModal = () => {
    modal.style.display = 'none';
    modalOverlay.style.display = 'none';
  };

  closeButton.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal); // Close when clicking overlay
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
