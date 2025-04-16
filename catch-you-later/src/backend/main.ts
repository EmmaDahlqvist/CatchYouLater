import '../frontend/css/style.css';
import { displayFormattedFishingRegulations } from './displayFishingRegulations';
import { fetchAllFishingRegulations } from './fetchFishingRegulations';
import { setupSearchBar } from './searchHandler';
import L from 'leaflet';

let mapInitialized = false;
let map: L.Map | null = null;

function initializeMap(): void {
  if (!mapInitialized) {
    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('Map container element not found!');
      return;
    }

    map = L.map('map').setView([62.0, 15.0], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    console.log('Map initialized');

    mapInitialized = true;

    setTimeout(() => {
      map?.invalidateSize();
    }, 100);
  }
}

function setupTabs(): void {
  const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-button');
  const tabContents = document.querySelectorAll<HTMLDivElement>('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetTabId = button.dataset.tab;

      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      button.classList.add('active');
      const targetContent = document.getElementById(targetTabId!);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      if (targetTabId === 'mapTab' && !mapInitialized) {
        initializeMap();
      } else if (targetTabId === 'mapTab' && map) {
        setTimeout(() => {
          map?.invalidateSize();
        }, 0);
      }
    });
  });
}

async function loadData(): Promise<void> {
  try {
    const data = await fetchAllFishingRegulations();

    const regulationsContainer = document.querySelector('#regulationsTab #regulations');
    if (!regulationsContainer) {
      console.error('Regulations container not found inside #regulationsTab!');
      return;
    }

    displayFormattedFishingRegulations(data, '#regulationsTab #regulations');

    setupSearchBar('searchBar', data, '#regulationsTab #regulations');

  } catch (error) {
    console.error('Failed to load fishing regulations:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  loadData();
});