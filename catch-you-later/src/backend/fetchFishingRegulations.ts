/* A type for fetching fishing regulations */
export type FishingRegulation = {
    Species: string;
    MinSize: string | null;
    MaxSize: string | null;
    Area: string;
};

/* A type for the filter criteria */
export type RegulationFilter = {
  [K in keyof FishingRegulation]?: FishingRegulation[K];
};

/* A function to filter fishing regulations based on specified criteria */
export function filterRegulations(
  regulations: FishingRegulation[],
  filters: RegulationFilter
): FishingRegulation[] {
  return regulations.filter(regulation => {
    // Iterate over each key in the filters object
    for (const key in filters) {
      // Check if the filter key is a valid key of FishingRegulation
      if (Object.prototype.hasOwnProperty.call(filters, key) && key in regulation) {
        // Type assertion to help TypeScript understand the key
        const filterKey = key as keyof FishingRegulation;
        const filterValue = filters[filterKey];
        const regulationValue = regulation[filterKey];


        if (typeof regulationValue === 'string' && typeof filterValue === 'string') {
          if (regulationValue.toLowerCase() !== filterValue.toLowerCase()) {
            return false; 
          }
        } else {
          // If not both strings, perform a standard comparison
          // Handles null comparison correctly (filterValue === null means we want regulations where the value is null)
          if (regulationValue !== filterValue) {
            return false; // Doesn't match this filter criterion
          }
        }
      } else {
         // Optionally handle cases where the filter key isn't part of FishingRegulation,
         // though the RegulationFilter type should largely prevent this.
         // console.warn(`Filter key \"${key}\" is not a valid attribute of FishingRegulation.`);
         // Depending on desired behavior, you might want to return false or ignore the invalid key.
         // For now, we'll ignore invalid keys.
      }
    }
    // If the regulation passed all filter checks, include it
    return true;
  });
}


/* A function to fetch fishing regulations from a JSON file */
export async function fetchFishingRegulations(): Promise<FishingRegulation[]> {
    const response = await fetch('/data/fishing_regulations.json');
    if (!response.ok) {
        throw new Error('Failed to fetch fishing regulations');
    }

    return await response.json();
}


/*KODEN OVAN HÖR TILL DET GAMLA, KANSKE INTE BEHÖVS MER???*/

type GearType = string | {
  gearName?: string;
  gearCode?: string;
};

type Rule = {
  ruleId: string;
  ruleText?: string;
  ruleType?: string;
  entryIntoForceAt?: string;
  targetGroups?: string[];
  geographies?: string[];
  gearTypeRestriction?: {
    allGearTypes?: boolean;
    explicitGearTypes?: GearType[];
    species?: {
      speciesCode: string;
      speciesNameSwedish: string;
      speciesNameEnglish: string;
      speciesNameLatin: string;
      speciesSubcategory?: string;
    }[];
  };
};


export type FormattedRule = {
  species: string;
  text: string;
  location: string;
  type: string;
  startsAt: string;
  gear: string;
  targetGroup: string;
};

/* A function to fetch all fishing regulations from the API */
export async function fetchAllFishingRegulations(): Promise<FormattedRule[]> {
  const rules = await fetchAllFishingRules();
  const formattedRules = await formatRules(rules);
  return formattedRules;
}

/* A function to fetch all fishing rules from the API / from localStorage*/
async function fetchAllFishingRules(): Promise<Rule[]> {

  const localStorageData = loadFishingRulesFromStorage();
  if(localStorageData != null) {
    return localStorageData;
  }
  // If we don't have a fresh cached version, fetch fresh data from the API
  return await fetchFishingRulesFromAPI();
}

/* A function to fetch all fishing rules from the API (havOchVatten)*/
async function fetchFishingRulesFromAPI(): Promise<Rule[]> {
  // Fetch fresh data from the API, had no cached data
  const allRules: Rule[] = [];
  let after: string | null = null;
  let hasMore = true;

  // Loop through rules 20 at a time until we have all of them
  while (hasMore) {
    const url = new URL('https://gw-test.havochvatten.se/external-public/fishing-regulations/v1/rules');
    url.searchParams.set('limit', '20');
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Could not fetch fishing rules');

    const data = await res.json();
    const list: Rule[] = data.list;

    allRules.push(...list);

    if (list.length < 20) {
      hasMore = false; // sista sidan
    } else {
      after = list.at(-1)?.ruleId ?? null;
    }
  }

  saveFishingRulesToStorage(allRules);

  return allRules;

}


/* A function to format the fishing rules into a more readable format */
async function formatRules(rules: Rule[]): Promise<FormattedRule[]> {
  const geoCache = loadGeoCacheFromStorage();

  // Format the rules into a more readable format
  return await Promise.all(
    rules.map(async (rule) => {
      const species = rule.gearTypeRestriction?.species?.map((s) =>
        s.speciesSubcategory
          ? `${s.speciesNameSwedish} (${s.speciesSubcategory})`
          : s.speciesNameSwedish
      ) ?? [];

      const locationNames = await Promise.all(
        (rule.geographies ?? []).map(id => getGeoName(id, geoCache))
      );

      return {
        species: species.join(', ') || '---',
        text: rule.ruleText || '---',
        location: locationNames.join(', ') || '---',
        type: rule.ruleType || '---',
        startsAt: rule.entryIntoForceAt?.split('T')[0] || '---',
        gear: rule.gearTypeRestriction?.allGearTypes
        ? 'Alla redskap tillåtna'
        : Array.isArray(rule.gearTypeRestriction?.explicitGearTypes)
          ? rule.gearTypeRestriction.explicitGearTypes
              .map(g => typeof g === 'string'
                ? g
                : g.gearName ?? g.gearCode ?? 'okänt redskap'
              )
              .join(', ')
          : 'Inga specifika redskap',
        targetGroup: rule.targetGroups?.join(', ') || '---',
      };
    })
  );
}

/* A function to get the name of a geography by its ID */
async function getGeoName(id: string, geoCache: Map<string, string>): Promise<string> {
  // Check if we have a cached version of the geography name
  if (geoCache.has(id)) {
    return geoCache.get(id)!;
  }

  // If we don't have a cached version, fetch it from the API
  try {
    const res = await fetch(`https://gw-test.havochvatten.se/external-public/fishing-regulations/v1/geographies/${id}`);
    if (!res.ok) throw new Error('Failed to fetch geo');

    const data = await res.json();
    const name = data.geographyName ?? 'Okänd plats';

    geoCache.set(id, name);
    saveGeoCacheToStorage(geoCache);

    return name;
  } catch (err) {
    console.error(`Failed to get geography for ID ${id}`, err);
    return 'Okänd plats';
  }
}

/* A function to load geoMap cache from localstorage */
function loadGeoCacheFromStorage(): Map<string, string> {
  const cached = localStorage.getItem('geoMap');
  const timestamp = localStorage.getItem('geoMap:timestamp');
  const maxAge = 1000 * 60 * 60 * 72; // 72h

  const isFresh = cached && timestamp && Date.now() - Number(timestamp) < maxAge;

  // Check if we have a cached version and if it's still fresh
  // (less than 72 hours old)
  if (isFresh) {
    try {
      const entries: [string, string][] = JSON.parse(cached);
      return new Map(entries);
    } catch {
      console.warn('Kunde inte läsa från geoMap-cachen, nollställer.');
    }
  }

  return new Map();
}

/* A function to save geoMap cache to localstorage */
function saveGeoCacheToStorage(map: Map<string, string>) {
  const entries = [...map.entries()];
  localStorage.setItem('geoMap', JSON.stringify(entries));
  localStorage.setItem('geoMap:timestamp', String(Date.now()));
}

/* A function to save fishing rules to localStorage */
function saveFishingRulesToStorage(rules: Rule[]) {
  localStorage.setItem('fishingRules', JSON.stringify(rules));
  localStorage.setItem('fishingRules:timestamp', String(Date.now()));
  console.log('Saved rules to cache:', rules.length);
}

/* A function to fetch fishing rules from localStorage */
function loadFishingRulesFromStorage() {
  const cacheKey = 'fishingRules';
  const timestampKey = 'fishingRules:timestamp';
  const maxAge = 1000 * 60 * 60 * 72; // 72h

  // Check if we have a cached version and if it's still fresh
  // (less than maxAge old)
  const cached = localStorage.getItem(cacheKey);
  const cachedAt = localStorage.getItem(timestampKey);

  const isFresh = cached && cachedAt && (Date.now() - Number(cachedAt) < maxAge);

  if (isFresh) {
    try {
      console.log('Get fishing rules from cache...');
      return JSON.parse(cached);
    } catch (err) {
      console.warn('Could not parse cached fishing rules, fetching fresh data...');
    }
  }

  return null;
}



