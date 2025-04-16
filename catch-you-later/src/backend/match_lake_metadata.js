// match_lake_metadata.js  – Add lake‑name + metadata to water‑polygons with Turf.js
// --------------------------------------------------------------
// Usage (Node ≥18):
//   npm i @turf/turf geojson-rbush
//   node src/backend/match_lake_metadata.js 
// --------------------------------------------------------------

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as turf from '@turf/turf';
import RBush from 'geojson-rbush';

// Resolve __dirname in ES‑module context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//---------------------------------------------------------------
// 1. Load input data - Paths adjusted relative to src/backend
//---------------------------------------------------------------
const DATA_DIR = path.join(__dirname, '..', '..', 'public', 'data'); // Adjusted path to data directory
const POLY_PATH   = path.join(DATA_DIR, 'scandinavian_waters_polygons_epsg4326.geojson');
const POINT_PATH  = path.join(DATA_DIR, 'scandinavian_lake_names.json');
const OUTPUT_PATH = path.join(DATA_DIR, 'scandinavian_waters_polygons_named_extended.geojson');

console.log(`Reading polygons from: ${POLY_PATH}`);
console.log(`Reading points from: ${POINT_PATH}`);

let polygons, lakes;
try {
    polygons = JSON.parse(fs.readFileSync(POLY_PATH,  'utf8'));
    lakes    = JSON.parse(fs.readFileSync(POINT_PATH, 'utf8'));
} catch (error) {
    console.error("Error reading input files:", error);
    console.error(`Please ensure these files exist:\n  ${POLY_PATH}\n  ${POINT_PATH}`);
    process.exit(1);
}

// Basic validation
if (!polygons || !polygons.features || !Array.isArray(polygons.features)) {
    console.error(`Invalid GeoJSON structure in ${POLY_PATH}. Expected a FeatureCollection.`);
    process.exit(1);
}
if (!Array.isArray(lakes)) {
    console.error(`Invalid JSON structure in ${POINT_PATH}. Expected an array.`);
    process.exit(1);
}

console.log(`Loaded ${polygons.features.length} polygons.`);
console.log(`Loaded ${lakes.length} lake points.`);

//---------------------------------------------------------------
// 2. Build a spatial index on polygon BBOXes (RBush over GeoJSON)
//---------------------------------------------------------------
console.log("Building spatial index...");
const index = new RBush();
try {
    index.load(polygons);  // ~200 ms for 15 k polygons
} catch (error) {
    console.error("Error building spatial index:", error);
    process.exit(1);
}
console.log("Index built.");

//---------------------------------------------------------------
// 3. Helper: copy selected attributes if present
//---------------------------------------------------------------
const ATTRS = ['name', 'wikidata', 'wikipedia', 'description'];

// Function to copy attributes from lake point to polygon feature
// Now returns a new properties object instead of modifying in place
function enrich(feature, lake) {
  // Create a copy of existing properties or an empty object
  const newProperties = { ...(feature?.properties || {}) }; 

  let isVanernEnrich = false;
  if(lake.name === 'Vänern') {
      isVanernEnrich = true;
      // Log based on the incoming feature's state before creating newProps
      console.log(`    -> Enriching for Vänern. Current polygon name: '${feature?.properties?.name}'`); 
  }

  // if (!feature.properties) feature.properties = {}; // No longer needed
  for (const k of ATTRS) {
    // Check if lake has the property and it's not null/undefined
    if (Object.prototype.hasOwnProperty.call(lake, k) && lake[k] != null) { 
      const oldValue = newProperties[k]; // Check old value from copy
      newProperties[k] = lake[k]; // Modify the copy
      if (isVanernEnrich && k === 'name') {
          // Log based on the newProperties object being built
          console.log(`       Assigned name: '${lake[k]}'. Old name was: '${oldValue}'. Building newProps with name: '${newProperties.name}'`); 
      }
    }
  }
  // Return the fully constructed new properties object
  return newProperties; 
}

//---------------------------------------------------------------
// 4. Main loop – iterate over lake‑centre points
//---------------------------------------------------------------
console.log("Matching points to polygons...");
let matched = 0;
let skipped_no_candidates = 0;
let skipped_no_containment = 0;
let skipped_index_not_found = 0; // New counter

for (const [i, lake] of lakes.entries()) {
    // --- START Vänern Debug Logging ---
    let isVanern = false;
    if (lake.name === 'Vänern') {
        isVanern = true;
        console.log(`\n--- DEBUG START: Processing Vänern (Point Index ${i}) ---`);
        console.log(`  Coords: lon=${lake.lon}, lat=${lake.lat}`);
    }
    // --- END Vänern Debug Logging ---

    // Basic check for valid coordinates
    if (typeof lake.lon !== 'number' || typeof lake.lat !== 'number') {
        // console.warn(`Skipping lake record ${i+1} due to invalid coordinates:`, lake); // Less verbose
        continue;
    }

    const pt = turf.point([lake.lon, lake.lat]);

    // 4.1. Fast BBOX candidate fetch
    const candidates = index.search(pt).features;
    if (isVanern) console.log(`  Found ${candidates?.length || 0} BBOX candidates.`);

    if (!candidates || !candidates.length) { 
        skipped_no_candidates++;
        if (isVanern) console.log(`  DEBUG END: Skipped (no candidates).`);
        continue; // nothing nearby
    }

    // 4.2. Filter by real containment (booleanPointInPolygon)
    let containing = [];
    let containmentCheckError = null;
    try {
        containing = candidates.filter(f => {
            // Ensure polygon features are valid before checking containment
            if (f && f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')) {
                const contained = turf.booleanPointInPolygon(pt, f);
                if (isVanern && contained) {
                    console.log(`    Point IS contained in polygon ID: ${f.properties?.id || f.properties?.OBJECTID || f.properties?.VHA_ID || 'N/A'}, Name: ${f.properties?.name || 'N/A'}, Area: ${turf.area(f).toFixed(0)}`);
                }
                return contained;
            } 
            return false;
        });
    } catch (error) {
        containmentCheckError = error;
        if (isVanern) console.error(`  Error during booleanPointInPolygon check:`, error);
         console.warn(`Error checking point in polygon for feature:`, error); // General warning
    }
    
    if (isVanern) {
        console.log(`  Found ${containing.length} containing polygons after check.`);
        if (containmentCheckError) console.log(`    (Note: Check encountered an error)`);
    }

    if (!containing.length) {
        skipped_no_containment++;
        if (isVanern) console.log(`  DEBUG END: Skipped (no containment).`);
        continue;
    }

    // 4.3. If multiple polygons contain the point, pick the largest area (more likely the main lake)
    const target = containing.sort((a, b) => {
        try {
             // Handle potential errors during area calculation (e.g., invalid geometry)
            const areaA = (a && a.geometry) ? turf.area(a) : -Infinity; // Use -Infinity for invalid
            const areaB = (b && b.geometry) ? turf.area(b) : -Infinity; // Use -Infinity for invalid
            return areaB - areaA; // Sort descending by area (largest first)
        } catch (error) {
            console.warn(`Error calculating area for comparison:`, error);
            return 0; // Keep original order on error
        }
       
    })[0];

    if (isVanern) {
        console.log(`  Selected target polygon ID: ${target?.properties?.id || target?.properties?.OBJECTID || target?.properties?.VHA_ID || 'N/A'}, Name: ${target?.properties?.name || 'N/A'}, Area: ${turf.area(target).toFixed(0)}`);
    }

    // 4.4. Copy metadata; don’t overwrite conflicting existing names
    // Also check if target polygon is valid
    if (!target || !target.properties) {
        // console.warn(`Skipping match for lake ${lake.name || 'unnamed'} due to invalid target polygon.`); // Less verbose
        if (isVanern) console.log(`  DEBUG END: Skipped (invalid target polygon).`);
        continue;
    }
    
    if (isVanern) {
         console.log(`  Enriching target polygon with Vänern data. Previous name was: '${target.properties.name}'`);
    }

    // Find the index of the target feature in the original array
    const originalIndex = polygons.features.findIndex(f => f === target);

    if (originalIndex === -1) {
        console.warn(`Could not find original index for matched target polygon ID: ${target?.properties?.id || target?.properties?.OBJECTID || target?.properties?.VHA_ID || 'N/A'}. Skipping enrichment. Lake: ${lake.name}`);
        skipped_index_not_found++;
        if (isVanern) console.log(`  DEBUG END: Skipped (original index not found).`);
        continue; 
    }

    // Call enrich to get the new properties object
    const newProps = enrich(target, lake); 

    // Assign the new properties object back to the original feature in the array
    polygons.features[originalIndex].properties = newProps;

    if (isVanern) {
        const finalName = polygons.features[originalIndex].properties.name;
        console.log(`  Assigned new properties to polygons.features[${originalIndex}]. Final name: '${finalName}'`);
        console.log(`  DEBUG END: Matched successfully (assigned new properties object).`);
    }

    matched++;
}

console.log(`\n--- Matching Summary ---`);
console.log(`Total lake points processed: ${lakes.length}`);
console.log(`Successfully matched: ${matched}`);
console.log(`Skipped (no nearby candidates): ${skipped_no_candidates}`);
console.log(`Skipped (no containing polygon found): ${skipped_no_containment}`);
console.log(`Skipped (original index not found): ${skipped_index_not_found}`); // Added summary line

// Calculate match rate
const matchRate = lakes.length > 0 ? ((matched / lakes.length) * 100).toFixed(1) : 0;
console.log(`Match rate: ${matchRate}%`);

//---------------------------------------------------------------
// 5. Save enriched polygons
//---------------------------------------------------------------
console.log(`\nSaving enriched polygons...`);
try {
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(polygons, null, 2)); // Added indentation for readability
    console.log(`Successfully saved → ${OUTPUT_PATH}\n`);
} catch (error) {
    console.error(`Error writing output file ${OUTPUT_PATH}:`, error);
    process.exit(1);
}

//---------------------------------------------------------------
// 6. Notes & tweaks - Keep original notes
//---------------------------------------------------------------
// • The rbush index makes the loop fast (≈5‑6 s for 70 k points / 15 k polygons).
// • Adjust the tie‑breaker (e.g., choose closest centroid instead of smallest area) by
//   replacing the sort() criterion if you still see mis‑matches.
// • To flag uncertain matches instead of skipping, add a confidence field instead of the early‑continue.
// • If your lake‑centre dataset contains duplicate names at the same coords, consider de‑duping first to avoid overwrites.
