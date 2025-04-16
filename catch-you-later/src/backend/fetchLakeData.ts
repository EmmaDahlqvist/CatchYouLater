import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Using node-fetch v2 for CommonJS compatibility. Install with: npm install node-fetch@2 @types/node-fetch@2
// If your project uses ES Modules, you might need to adjust the import.
import fetch from 'node-fetch';

// --- Configuration ---
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const __filename = fileURLToPath(import.meta.url); // Get current file path
const __dirname = path.dirname(__filename); // Get current directory path
const OUTPUT_DIR = path.resolve(__dirname, '../../public/data'); // Resolve output dir relative to current dir
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'scandinavian_lake_names.json');
const TIMEOUT_MS = 180 * 1000; // Timeout for Overpass query in milliseconds
const DELAY_BETWEEN_REQUESTS_MS = 2000; // Delay to avoid hammering the API

// Define bounding boxes covering Scandinavia (approximate)
// Format: [south_lat, west_lon, north_lat, east_lon]
const BOUNDING_BOXES: [number, number, number, number][] = [
    // Split into 4 quadrants
    [54.0, 4.0, 62.75, 18.0], // SW
    [54.0, 18.0, 62.75, 32.0], // SE
    [62.75, 4.0, 71.5, 18.0], // NW
    [62.75, 18.0, 71.5, 32.0], // NE
];

// Interface for the expected structure of Overpass elements
interface OverpassElement {
    type: 'node' | 'way' | 'relation';
    id: number;
    center?: { lat: number; lon: number }; // Available when using 'out center;'
    tags?: { [key: string]: string };
}

// Interface for the data we want to store
interface LakeData {
    name: string;
    lat: number;
    lon: number;
    wikidata?: string; // Optional wikidata ID
    wikipedia?: string; // Optional wikipedia link
    description?: string; // Optional description
}

// --- Helper Functions ---

// Function to introduce a delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to construct the Overpass QL query
const buildQuery = (bbox: [number, number, number, number]): string => {
    const bboxString = `${bbox[0]},${bbox[1]},${bbox[2]},${bbox[3]}`;
    // Query for nodes, ways, and relations tagged as lakes with a name within the bbox
    return `
      [out:json][timeout:${TIMEOUT_MS / 1000}];
      (
        nwr["natural"="water"]["water"="lake"]["name"](${bboxString});
      );
      out center tags;
    `;
};

// --- Main Fetching Logic ---

const fetchAllLakeData = async (): Promise<void> => {
    console.log(`Starting fetch process. Output will be saved to: ${OUTPUT_FILE}`);
    const allLakes: LakeData[] = [];
    const uniqueLakeIds = new Set<number>(); // To avoid duplicates if lakes span boxes

    for (let i = 0; i < BOUNDING_BOXES.length; i++) {
        const bbox = BOUNDING_BOXES[i];
        const query = buildQuery(bbox);
        console.log(`\nFetching data for bounding box ${i + 1}/${BOUNDING_BOXES.length}: [${bbox.join(', ')}]...`);

        try {
            const response = await fetch(OVERPASS_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `data=${encodeURIComponent(query)}`,
                timeout: TIMEOUT_MS + 5000 // Add a bit extra for network latency
            });

            if (!response.ok) {
                throw new Error(`Overpass API request failed with status ${response.status}: ${await response.text()}`);
            }

            const data = await response.json() as { elements: OverpassElement[] };

            let count = 0;
            if (data.elements) {
                for (const element of data.elements) {
                    // Ensure element has necessary data and hasn't been added already
                    if (element.tags?.name && element.center && !uniqueLakeIds.has(element.id)) {
                        const lake: LakeData = {
                            name: element.tags.name,
                            lat: element.center.lat,
                            lon: element.center.lon,
                        };
                        // Add optional tags if they exist
                        if (element.tags.wikidata) lake.wikidata = element.tags.wikidata;
                        if (element.tags.wikipedia) lake.wikipedia = element.tags.wikipedia;
                        if (element.tags.description) lake.description = element.tags.description;

                        allLakes.push(lake);
                        uniqueLakeIds.add(element.id);
                        count++;
                    }
                }
            }
            console.log(`Found ${count} new lakes in this box.`);

        } catch (error) {
            console.error(`Error fetching data for box ${i + 1}:`, error);
            // Optionally decide whether to continue or stop on error
        }

        // Wait before the next request
        if (i < BOUNDING_BOXES.length - 1) {
            console.log(`Waiting ${DELAY_BETWEEN_REQUESTS_MS / 1000}s before next request...`);
            await sleep(DELAY_BETWEEN_REQUESTS_MS);
        }
    }

    console.log(`\nTotal unique lakes found: ${allLakes.length}`);

    // --- Save Data ---
    try {
        // Ensure output directory exists
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
            console.log(`Created output directory: ${OUTPUT_DIR}`);
        }
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allLakes, null, 2), 'utf-8');
        console.log(`Successfully saved lake data to ${OUTPUT_FILE}`);
    } catch (error) {
        console.error(`Error writing data to file:`, error);
    }
};

// --- Execute Script ---
fetchAllLakeData().catch(error => {
    console.error("An unexpected error occurred during the script execution:", error);
});
