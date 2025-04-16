import json
import re
import time
import os
import numpy
from shapely.geometry import shape, Point
from shapely.strtree import STRtree

# Paths (Updated for project structure)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
POINTS_PATH = os.path.join(PROJECT_ROOT, 'public', 'data', 'scandinavian_lake_names.json')
POLY_PATH   = os.path.join(PROJECT_ROOT, 'public', 'data', 'scandinavian_waters_polygons_epsg4326.geojson')
OUT_PATH    = os.path.join(PROJECT_ROOT, 'public', 'data', 'scandinavian_waters_names_v3.geojson')

# Define high-priority lake names known to cause issues
HIGH_PRIORITY_LAKE_NAMES = {'Mälaren', 'Hjälmaren', 'Vänern', 'Vättern'} # Add others if needed

POSITIVE = re.compile(r'\b(sjö|sjön|lake|vatn|vatnet|sjø|sjøen|järvi|järv|järve|sø)\b', re.I) # Removed fjorden
# Increased list of negative/specific terms
NEGATIVE = re.compile(r'\b(vik(en)?|fjord(en)?|bukt(en)?|bight|cove|damm(en)?|bassäng(en)?|sund(et)?|kanal(en)?|ström(men)?|å|älv|djup(et)?|vatten|depth|bay|lagoon|inre|indre|ytre|övre|nedre|lilla|stora|södra|norra|östra|västra)\b', re.I)

def score_name(point_obj):
    """Scores a point based on its name and properties."""
    name = point_obj.get('name')
    if not isinstance(name, str):
        return -1000 # Heavily penalize if name is not a string or missing
        
    s = 0
    # Bonus for core lake terms
    if POSITIVE.search(name):
        s += 10 # Increased bonus
        
    # Heavy penalty for specific/negative terms
    if NEGATIVE.search(name):
        s -= 50 # Increased penalty significantly
        
    # Bonus if it has wikidata (proxy for significance)
    if point_obj.get('wikidata'):
        s += 5
        
    # Penalty for name length (less important now)
    s -= 0.01 * len(name)
    return s

print(f"Reading points from: {POINTS_PATH}")
print(f"Reading polygons from: {POLY_PATH}")

# Load data
try:
    with open(POINTS_PATH, 'r', encoding='utf-8') as f:
        points = json.load(f)
except FileNotFoundError:
    print(f"Error: Points file not found at {POINTS_PATH}")
    exit(1)
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {POINTS_PATH}")
    exit(1)

try:
    with open(POLY_PATH, 'r', encoding='utf-8') as f:
        geo = json.load(f)
except FileNotFoundError:
    print(f"Error: Polygons file not found at {POLY_PATH}")
    exit(1)
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {POLY_PATH}")
    exit(1)

if 'features' not in geo:
    print("Error: GeoJSON structure missing 'features' key.")
    exit(1)
    
feats = geo['features']
print(f"Loaded {len(feats)} polygon features.")
print(f"Loaded {len(points)} lake points.")

geoms = [shape(feat['geometry']) for feat in feats if feat.get('geometry')]
print(f"Loaded {len(geoms)} valid polygon geometries (out of {len(feats)} features).")

# Build STRtree index from the valid geometries
print("Building geometry index...")
start_index = time.time()
index = STRtree(geoms)
end_index = time.time()
print(f"Index built in {end_index - start_index:.2f} seconds.")

# --- Start Replacement Block --- 
print("Associating points to polygons...")
start_assoc = time.time()

points_matched_query = 0
points_matched_containment = 0 # Now represents intersections

# Store associations: geom_id -> [list_of_points]
assoc = {}

# --- Loop through Points ---
for i, p in enumerate(points):
    # Create a Shapely Point from the lat/lon
    point_geom = None
    try:
        lon = p.get('lon')
        lat = p.get('lat')
        if lon is not None and lat is not None:
            point_geom = Point(float(lon), float(lat))
        else:
            # print(f"Warning: Missing coordinates for point {p.get('name', 'Unnamed')}")
            continue
    except (TypeError, ValueError) as e:
        # print(f"Warning: Could not create point for {p.get('name', 'Unnamed')}: {e}")
        continue

    # Identify points of interest for debugging
    point_name = p.get('name')
    is_vanern_pt = point_name == 'Vänern'
    is_malaren_pt = point_name == 'Mälaren'
    is_amungen_pt = point_name == 'Amungen'

    # Query the STRtree for potentially intersecting polygons (get indices)
    candidate_indices = []
    try:
        # Using predicate='intersects' is generally safer
        candidate_indices = index.query(point_geom, predicate='intersects')
        if candidate_indices is not None and len(candidate_indices) > 0:
            points_matched_query += 1
    except Exception as e:
        # print(f"Warning: Error querying index for point {p.get('name', 'Unnamed')}: {e}")
        continue

    # --- Debug Mälaren/Amungen Point Queries ---
    if is_malaren_pt or is_amungen_pt:
        print(f"\n--- DEBUG POINT: Processing point '{point_name}' ({lat}, {lon}) ---")
        if not candidate_indices:
            print(f"  STRtree query returned NO candidate polygon indices for {point_name}.")
        else:
            # Ensure indices are printable ints
            printable_indices = [int(idx) for idx in candidate_indices if isinstance(idx, (int, numpy.integer))]
            print(f"  STRtree query returned candidate polygon indices: {printable_indices}")

    # --- Original Vänern Debug ---
    # if is_vanern_pt:
    #     print(f"\n--- DEBUG: Processing Vänern point: {p}")
    #     print(f"    Query returned {len(candidate_indices)} candidate indices.")

    # --- Check Intersections ---
    if candidate_indices is not None:
        for g_index in candidate_indices:
            # Validate index type
            if not isinstance(g_index, (int, numpy.integer)):
                # print(f"Warning: STRtree query returned non-integer index: {g_index} (Type: {type(g_index)}) for point {point_name}")
                continue

            g_index = int(g_index) # Convert numpy int if necessary
            actual_geom = None
            try:
                # Validate index range
                if 0 <= g_index < len(geoms):
                    actual_geom = geoms[g_index]
                    # Use 'intersects' check
                    if actual_geom.intersects(point_geom):
                        geom_id = id(actual_geom)
                        if geom_id not in assoc:
                            assoc[geom_id] = []
                        assoc[geom_id].append(p)
                        # Increment counter only once per point that intersects *any* polygon
                        # This logic needs care if we want intersection count vs point count
                        # For now, let's just track successful associations
                        # points_matched_containment += 1 # Re-evaluate how to count this

                        # Debug logging for specific points within the check
                        # if is_vanern_pt:
                        #     print(f"      >>> Vänern point INTERSECTS candidate index {g_index} (Geom ID: {id(actual_geom)})!")
                # else:
                    # print(f"Warning: STRtree query returned invalid index: {g_index} for point {point_name}")
                    pass # Index out of bounds is handled

            except Exception as e:
                # print(f"Warning: Error during intersects check for point {point_name} (Candidate Index: {g_index}): {e}")
                pass

end_assoc = time.time()
print(f"Association done in {end_assoc - start_assoc:.2f} seconds.")
# Recalculate actual containment count based on final assoc structure
points_associated = sum(len(points) > 0 for points in assoc.values()) 
# This counts unique geometries that got *any* points associated
geometries_associated = len(assoc)
print(f"Points associated with at least one polygon via intersects: {geometries_associated} (covering {len(points)} points)") # Mismatch in count description, fixing
# --- End Replacement Block ---

print("\nUpdating polygon properties...")
start_update = time.time()
updated = 0
skipped_no_candidates = 0
updated_features_indices = set()

for i, g in enumerate(geoms):
    geom_id = id(g)
    cand = assoc.get(geom_id, [])
    
    if not cand:
        skipped_no_candidates += 1
        continue
        
    # --- Debug Specific Lakes ---
    debug_candidates = {p.get('name') for p in cand if isinstance(p.get('name'), str)}
    debug_lakes = {'Mälaren', 'Hjälmaren', 'Amungen', 'Essingedjupet', 'Dalkarlsaspen'}
    trigger_debug = bool(debug_candidates.intersection(debug_lakes))
    
    # Get the corresponding feature for debug/update
    feat = None
    for f in feats:
        if f.get('geometry'):
            if id(shape(f['geometry'])) == geom_id:
                feat = f
                break
    if feat is None:
        # This shouldn't happen if the map is built correctly
        print(f"Warning: Could not find feature for geometry ID {geom_id}")
        continue
    original_poly_name = feat.get('properties', {}).get('name')

    if trigger_debug:
        print(f"\n--- DEBUG: Polygon Index {i} (Original Name: {original_poly_name}) ---")
        print("  Candidates found ({})".format(len(cand))) # Removed f-string

    # --- Prioritization Logic ---
    chosen = None
    high_priority_point = None
    for p in cand:
        point_name = p.get('name')
        is_high_priority = False
        if isinstance(point_name, str) and point_name in HIGH_PRIORITY_LAKE_NAMES and p.get('wikidata'):
            high_priority_point = p
            is_high_priority = True
            if trigger_debug:
                 print(f"    - {point_name} (Score: {score_name(p):.2f}) [PRIORITY MATCH!] Wd: {p.get('wikidata')}")
            break # Found the first high-priority point, use it
        elif trigger_debug and isinstance(point_name, str): # Log non-priority candidates only if debugging this poly
             print(f"    - {point_name} (Score: {score_name(p):.2f}) Wd: {p.get('wikidata')}")
            
    if high_priority_point:
        chosen = high_priority_point
        if trigger_debug:
            print("  --> Using High-Priority Point: " + chosen.get('name'))
        # print(f"Debug: Using high-priority point {chosen.get('name')} for polygon {i}")
    else:
        # --- Fallback to Scoring Logic ---
        if trigger_debug:
             print("  No high-priority point found. Falling back to scoring.") # Removed f-string
        # Score candidates - Pass the whole point object to score_name
        cand_scored = sorted(cand, key=lambda p: -score_name(p))

        if cand_scored:
            chosen = cand_scored[0] # Pick the highest scoring point
            if trigger_debug:
                 print(f"  --> Using Highest Scoring Point: {chosen.get('name')} (Score: {score_name(chosen):.2f})")
        # else: # No scorable candidates if chosen is still None
            # print(f"Warning: No scorable candidates for feature index {i}")

    # --- Assign Properties ---        
    if not chosen:
        if trigger_debug:
            print("  --> No point chosen for update.") # Removed f-string
        # print(f"Warning: No candidate chosen for feature index {i}")
        continue # Skip if no point was chosen (neither priority nor scored)
        
    # feat = valid_feat_map.get(geom_id) # Already retrieved above
    # if feat is None:
    #     # This shouldn't happen if the map is built correctly
    #     print(f"Warning: Could not find feature for geometry ID {geom_id}")
    #     continue
        
    props = feat.setdefault('properties', {})
    
    # Handle potential existing name conflict
    existing_name = props.get('name')
    chosen_name = chosen.get('name')

    # Ensure chosen name is a string before comparing/assigning
    if not isinstance(chosen_name, str):
        # print(f"Warning: Chosen candidate for feature index {i} has non-string name: {chosen_name}. Skipping name update.")
        chosen_name = None # Prevent assignment

    if chosen_name:
        if existing_name and existing_name != chosen_name:
            # Add old name to alt_name list if it's different
            alt_names = props.setdefault('alt_name', [])
            if isinstance(alt_names, list) and existing_name not in alt_names:
                 alt_names.append(existing_name)
            elif not isinstance(alt_names, list):
                 # If alt_name was somehow not a list, reset it
                 props['alt_name'] = [existing_name]
                 
        props['name'] = chosen_name

    # Assign other properties
    for k in ('wikidata', 'wikipedia', 'description'):
        if k in chosen and chosen[k] is not None:
            props[k] = chosen[k]
            
    updated += 1
    # original_index = feats.index(feat) # Find index in original list might be slow
    # updated_features_indices.add(original_index)

end_update = time.time()
print(f"Properties updated in {end_update - start_update:.2f} seconds.")

# --- Summary --- 
print(f"\n--- Processing Summary ---")
print(f"Total points processed: {len(points)}")
print(f"Total polygon features considered: {len(geoms)} (out of {len(feats)} original)")
print(f"Points found with candidates from index query: {points_matched_query}") # Debug
print(f"Points successfully associated via intersects: {points_associated}")
# print(f"Polygons associated with points: {len(assoc) - skipped_no_candidates}") # Need careful calculation
print(f"Polygon features updated with data: {updated}")


print(f"\nSaving updated GeoJSON to: {OUT_PATH}")
start_save_time = time.time()
try:
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        # Dump the original 'geo' object which contains the 'feats' list that we modified
        json.dump(geo, f, ensure_ascii=False, indent=2) # Added indent for readability
except Exception as e:
    print(f"Error saving output file: {e}")
    exit(1)
    
end_save_time = time.time()
print(f"File saved successfully in {end_save_time - start_save_time:.2f} seconds.")

print(f"\nScript finished. Updated features: {updated}")
