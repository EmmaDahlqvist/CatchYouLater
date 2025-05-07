import type { FormattedFishingRule } from './fetch-fishing-regulations.ts';
import { groupFormattedRulesBySpeciesAndLocation, removeGeneralRules, removeRulesWithText } from './helpers';
import { updatePolygons } from './map-handler';

const selectedCards = new Set<number>();

/**Display fishing rules as cards and rule buttons */
export function displayFormattedFishingRegulations(
  data: FormattedFishingRule[],
  containerId: string,
  map: L.Map
) {
  const container = document.querySelector<HTMLDivElement>(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  let filteredData = data;

  // Group the rules by species and location
  const grouped = groupFormattedRulesBySpeciesAndLocation(filteredData);

  container.innerHTML = [...grouped.entries()]
    .map(([_, rules]) => {
      const { species, location } = rules[0];

      // Process species names with exceptions
      const processedSpecies = species
        .flatMap(s => s.split('/')) // Split names with slashes into separate species
        .flatMap(s => s.split(',').map(name => name.trim())) // Split by commas and trim
        .map(s => {
          const words = s.split(' ');
          if (words.length > 1) {
            words[1] = words[1].toLowerCase(); // Lowercase the second word
          }
          return words.join(' ');
        });

      const speciesLinks = processedSpecies.length > 0
        ? processedSpecies
            .map(s => {
              const baseName = s.replace(/\s*\(.*?\)/g, ''); // Remove parenthesis for the link
              const parenthesis = s.match(/\(.*?\)/)?.[0] || ''; // Extract parenthesis

              if (baseName.toLowerCase() === 'övrigt') {
                return `Övrigt`; // Display "Övrigt" as plain text
              }

              return `<a href="https://sv.wikipedia.org/wiki/${encodeURIComponent(baseName)}" target="_blank">${baseName}</a>${parenthesis ? ' ' + parenthesis : ''}`;
            })
            .join(', ')
        : 'Ingen specificerad';

      const locationNames = location.length > 0
        ? location.map(l => l.name).join(', ')
        : 'Ingen specificerad';
      return `
  <div class="rule-card" 
       location-ids="${location.map(l => l.id).join(',')}" 
       data-rule-index="${data.indexOf(rules[0])}">
    <div class="rule-row">
      <div class="rule-column">
        <div><strong>${speciesLinks.includes(',') ? 'Arter' : 'Art'}</strong><br></div>
        <div>${speciesLinks}</div>
      </div>
      <div class="rule-column">
        <div><strong>${locationNames.includes(',') ? 'Platser' : 'Plats'}</strong></div>
        <div><p>${locationNames}</p></div>
      </div>
      <div class="small-rule-column"></div>
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
  attachRuleCardListeners(data, map);

/** Function to attach event listeners to rule buttons*/ 
function attachRuleButtonListeners() {
  buttonClickListener();
  buttonColorSelector();
  setupModal(); // Initialize modal close listeners
}

function attachRuleCardListeners(data: FormattedFishingRule[], map: L.Map) {
  const ruleCards = document.querySelectorAll('.rule-card');

  ruleCards.forEach((card) => {
    const ruleIndex = parseInt(card.getAttribute('data-rule-index') || '-1', 10);
    if (ruleIndex === -1) {
      console.error('Rule index not found for card.');
      return;
    }

    const rule = data[ruleIndex];

    // Add hover listeners (unchanged)
    card.addEventListener('mouseenter', () => {
      updatePolygons(map, [rule], true); // Highlight hovered rule's geography
    });

    card.addEventListener('mouseleave', () => {
      if (selectedCards.size === 0) {
        updatePolygons(map, data, true); // Reset map to show all geographies
      } else {
        // Show only selected geographies
        const selectedRules = Array.from(selectedCards).map((index) => data[index]);
        updatePolygons(map, selectedRules, true);
      }
    });

    card.addEventListener('click', () => {
      if (selectedCards.has(ruleIndex)) {
        // Deselect card
        selectedCards.delete(ruleIndex);
        card.classList.remove('selected');
      } else {
        // Select card
        selectedCards.add(ruleIndex);
        card.classList.add('selected');
      }

      // Update map based on selected cards
      if (selectedCards.size === 0) {
        updatePolygons(map, data, true); // Reset map to show all geographies
      } else {
        const selectedRules = Array.from(selectedCards).map((index) => data[index]);
        updatePolygons(map, selectedRules, true);
      }
    });
  });
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
  const modalLocationList = document.getElementById("modalLocationList")
  const modalLocationTitle = document.getElementById("modalLocationTitle");

  if (!modal || !modalOverlay || !modalTitle || !modalRuleType || !modalRuleDescription || !modalTypeIndicator) {
    console.error('Modal elements not found!');
    return;
  }

  document.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLButtonElement;

      // Find closest rule-card element
      const ruleCardElement = el.closest('.rule-card');
      if (!ruleCardElement) {
        console.error('Rule card not found for the clicked button.');
        return;
      }

      const text = decodeURIComponent(el.dataset.ruleText || '');
      const type = el.dataset.ruleType || 'Okänd'; // Default to 'Okänd'
      const ruleNumberText = el.textContent?.trim() || 'Regel'; // Use button text for title

      // Populate Modal
      modalTitle.textContent = ruleNumberText;
      modalRuleType.textContent = type;
      modalRuleDescription.textContent = text;

      const locationNames = ruleCardElement.querySelector('.rule-column p')?.textContent ?? 'Ingen specificerad';

      if (modalLocationList) {
        modalLocationList.textContent = locationNames;
      }
  
      if (modalLocationTitle) {
        modalLocationTitle.textContent = locationNames.includes(',') ? 'Platser:' : 'Plats:'; // Singular or plural based on the number of locations
      }

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

}}


