import '../frontend/css/style.css' 
import typescriptLogo from '../typescript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.ts'
import { fetchFishingRegulations, type FishingRegulation } from './fetchFishingRegulations.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <h1>Vite + TypeScript</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

// Example code of how to use the fetchFishingRegulations function
async function loadData() {
  const data: FishingRegulation[] = await fetchFishingRegulations();
  data.forEach(element => {
    console.log(element.Species) // could be element.MinSize, element.MaxSize, element.Area ...
  });
}
loadData();
