import type { FormattedFishingRule } from './fetchFishingRegulations';

// --- Modal Helper Functions ---

// Function to convert Swedish type names to kebab-case for CSS class matching
function formatTypeForCss(typeName: string): string {
  return 'type-' +
    typeName
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/[^a-z0-9åäö-]/g, ''); // Keep a-z, 0-9, åäö, and hyphens
}

function showRuleModal(rule: FormattedFishingRule) {
  console.log('showRuleModal called for rule:', rule);

  // Get references to modal elements *inside* the function
  const modal = document.getElementById('ruleModal');
  const modalContent = modal?.querySelector('.modal-content');
  const modalTitle = document.getElementById('modalTitle');
  const modalTypeIndicator = document.getElementById('modalTypeIndicator'); // Although styled via parent class
  const modalTypeName = document.getElementById('modalTypeName');
  const modalDescription = document.getElementById('modalDescription');
  const closeButton = modal?.querySelector('.close-button');

  // Check if elements were found NOW
  if (!modal || !modalContent || !modalTitle || !modalTypeName || !modalDescription || !closeButton) {
    console.error("Modal elements could not be found! Check HTML IDs.");
    return;
  }

  // Populate modal content
  modalTitle.textContent = `${rule.species} - ${rule.location}`;
  modalTypeName.textContent = rule.type;
  modalDescription.textContent = rule.text;

  // Apply type-specific class for coloring the indicator
  const typeClass = formatTypeForCss(rule.type);
  // Remove previous type classes before adding new one
  modalContent.className = modalContent.className.replace(/\btype-[^ ]+\b/g, '');
  modalContent.classList.add(typeClass);

  console.log(`Applying class: ${typeClass}`);
  console.log('Attempting to show modal...'); 
  // Show the modal
  modal.classList.remove('hidden');

  // Add event listeners for closing
  closeButton.onclick = hideRuleModal;
  modal.onclick = (event) => {
    // Close if clicked outside the modal content
    if (event.target === modal) {
      hideRuleModal();
    }
  };
}

function hideRuleModal() {
  console.log('hideRuleModal called');
  // Also get reference here or ensure it's passed if needed
  const modal = document.getElementById('ruleModal');
  const modalContent = modal?.querySelector('.modal-content');
  const closeButton = modal?.querySelector('.close-button'); // Need closeButton ref here too potentially

  if (!modal || !modalContent) { 
      console.error("Modal elements not found during hide attempt.");
      return;
  }

  modal.classList.add('hidden');

  // Clean up type class
  modalContent.className = modalContent.className.replace(/\btype-[^ ]+\b/g, '');

  // Remove event listeners to prevent memory leaks
  // Check if closeButton exists before removing listener
  if(closeButton) {
    closeButton.onclick = null;
  }
  modal.onclick = null;
}

// --- Original Display Function (Modified) ---

export function displayFormattedFishingRegulations(data: FormattedFishingRule[], containerId: string) {
  console.log('displayFormattedFishingRegulations called with data:', data); 
  const container = document.querySelector<HTMLDivElement>(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  // Clear the container before rendering
  container.innerHTML = '';

  // Render each rule and add event listener
  data.forEach((rule, index) => { 
    const card = document.createElement('div');
    card.className = 'regulation-card clickable'; 
    card.innerHTML = `
      <div class="regulation-grid">
        <div><strong>Species</strong><br>${rule.species}</div>
        <div><strong>Location</strong><br>${rule.location}</div>
        <div><strong>Rule</strong><br>${rule.text.substring(0, 100)}${rule.text.length > 100 ? '...' : ''}</div> 
        <div><strong>Type</strong><br>${rule.type}</div>
        <div><strong>Starts</strong><br>${rule.startsAt}</div>
        <div><strong>Gear</strong><br>${rule.gear}</div>
        <div><strong>Group</strong><br>${rule.targetGroup}</div>
      </div>
    `;
    console.log(`Adding click listener to card ${index}`); 
    card.addEventListener('click', () => {
      console.log(`Card ${index} clicked! Rule:`, rule); 
      showRuleModal(rule);
    });
    container.appendChild(card);
  });
}
