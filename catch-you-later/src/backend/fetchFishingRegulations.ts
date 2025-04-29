type GearType = string | {
  gearName?: string;
  gearCode?: string;
};

/** A type for the fishing rules from the API */ 
type FishingRule = {
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

/** A type for the formatted fishing rules, easier to read/work with*/
export type FormattedFishingRule = {
  species: string[];
  text: string;
  location: {
    name: string;
    id: string;
  }[];
  type: string;
  startsAt: string;
  gear: string;
  targetGroup: string[];
};

/**To translate the target groups to swedish*/
const targetGroupLabels: Record<string, string> = {
  RECREATIONAL: 'Fritidsfiske',
  COMMERCIAL: 'Kommersiellt fiske'
}

/**To translate the type labels to swedish*/
const typeLabels: Record<string, string> = {
  PROHIBITION: 'Förbud',
  RECOMMENDATION: 'Rekommendation',
  LIMITATION: 'Begränsning',
  GENERAL: 'Allmän regel',
  EXEMPTION: 'Undantag',
  OBLIGITION: 'Skyldighet',
  SPECIES_CONSTRAINT: 'Artbegränsning',
  GEAR_CONSTRAINT: 'Redskapsbegränsning',
  TIME_CONSTRAINT: 'Tidsbegränsning',
  AREA_CONSTRAINT: 'Områdesbegränsning',
  OTHER: 'Övrigt',
  GEAR_RESTRICTION: 'Redskapsbegränsning'
}

/** A function to fetch all fishing regulations in a list of formatted rules*/
export async function fetchAllFishingRegulations(): Promise<FormattedFishingRule[]> {
  const rules = await fetchRegulationsFromAPIorStorage();
  // ändra på specieList o ta rules :)
  let specieList: string[] = ['Torsk', 'Lax', 'Öring', "Hummer"]
  const formattedRules = await formatRules(rules, specieList);
  return formattedRules;
}

/** A function to get the date from when the data was last updated (i.e when it was put into local storage) */
export async function getLatestFetchDate() {
  let latestFetch = new Date(Date.now());
  const cached = localStorage.getItem('fishingRules:timestamp');

  // if we have a cached version, use that
  // else, assume we just fetched the data today
  if(cached) {
    latestFetch = new Date(Number(cached));
  }

  const formattedDate = latestFetch.toISOString().split('T')[0];

  return formattedDate;

}

/** A function to fetch all fishing rules from the API / from localStorage*/
async function fetchRegulationsFromAPIorStorage(): Promise<FishingRule[]> {

  const localStorageData = loadFishingRulesFromStorage();
  if (localStorageData != null) {
    return localStorageData;
  }
  // If we don't have a fresh cached version, fetch fresh data from the API
  return await fetchFishingRulesFromAPI();
}

/** A function to fetch all fishing rules from the API (havOchVatten)*/
async function fetchFishingRulesFromAPI(): Promise<FishingRule[]> {
  // Fetch fresh data from the API, had no cached data
  const allRules: FishingRule[] = [];
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
    const list: FishingRule[] = data.list;

    allRules.push(...list);

    if (list.length < 20) {
      hasMore = false; // last page
    } else {
      after = list.length > 0 ? list[list.length - 1]?.ruleId ?? null : null;    }
  }

  saveFishingRulesToStorage(allRules);

  return allRules;

}


/** A function to format the fishing rules into a more readable format */
async function formatRules(rules: FishingRule[], specieList : string[]): Promise<FormattedFishingRule[]> {
  let geoMap = await fetchAllGeographies();

  // Format the rules into a more readable format
  return await Promise.all(
    rules.map(async (rule) => {
      const species = rule.gearTypeRestriction?.species?.map((s) =>
        s.speciesSubcategory
          ? `${s.speciesNameSwedish} (${s.speciesSubcategory})`
          : s.speciesNameSwedish
      ) ?? [];

      // If no species, check in the ruleText
      if(species.length === 0 && rule.ruleText) {
        const ignoredSpecies = getIgnoredSpecies(rule.ruleText, specieList)
        console.log("ignorerade:", ignoredSpecies)
        console.log("rule", rule.ruleText)

        for(const specie of specieList) {
          if(rule.ruleText.toLowerCase().includes(specie.toLowerCase()) &&
          !ignoredSpecies.includes(specie)) {
            species.push(specie)
          }
        }
      }


      const location = (rule.geographies ?? [])
        .map(id => {
          const geo = geoMap.get(id);
          return geo ? { name: geo, id: id} : null;
        })
        .filter((loc): loc is { name: string; id: string } => loc !== null);

      return {
        species: species,
        text: rule.ruleText || '---',
        location: location,
        type: typeLabels[rule.ruleType ?? ''] ?? rule.ruleType ?? '---',
        startsAt: rule.entryIntoForceAt?.split('T')[0] || '---',
        gear: rule.gearTypeRestriction?.allGearTypes
          ? 'Alla redskap tillåtna'
          : Array.isArray(rule.gearTypeRestriction?.explicitGearTypes)
            ? rule.gearTypeRestriction.explicitGearTypes
              .map(g => typeof g === 'string'
                ? g
                : g.gearName ?? g.gearCode ?? 'Okänt redskap'
              )
              .join(', ')
            : 'Inga specifika redskap',
          targetGroup: rule.targetGroups || []
      };
    })
  );
}

/**Ignore species after "än" in ruleText */
function getIgnoredSpecies(ruleText: string, knownSpecies: string[]) {
  const text = ruleText.toLowerCase();
  const ignoredSpecies: string[] = [];

  const afterThanMatch = text.split('än')[1]; // text after "än"
  if (!afterThanMatch) return ignoredSpecies;

  // take words until "."
  const possibleSpeciesList = afterThanMatch.split(/[.]/)[0];

  for (const specie of knownSpecies) {
    if (possibleSpeciesList.includes(specie.toLowerCase())) {
      ignoredSpecies.push(specie);
    }
  }

  return ignoredSpecies;
}


/**A function to fetch all geographies, cached or from API */
async function fetchAllGeographies(): Promise<Map<string, string>> {
  const cached = loadGeoCacheFromStorage();
  if (cached.size > 0) {
    console.log('Get geographies from cache...');
    return loadGeoCacheFromStorage();
  }

  const geoMap = new Map<string, string>();
  let after: string | null = null;
  let hasMore = true;

  while (hasMore) {
    const url = new URL('https://gw-test.havochvatten.se/external-public/fishing-regulations/v1/geographies');
    url.searchParams.set('limit', '20');
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch geographies');

    const data = await res.json();
    const list = data.list ?? [];

    for (const geo of list) {
      geoMap.set(geo.geographyId, geo.geographyName);
    }

    hasMore = list.length > 0;
    after = list.at(-1)?.geographyId ?? null;
  }

  saveGeoCacheToStorage(geoMap);

  return geoMap;
}

// How long to keep the cache in localStorage (in milliseconds)
const maxCacheAge = 1000 * 60 * 60 * 72; // 72h

/** A function to load geoMap cache from localstorage, geo id and name */
function loadGeoCacheFromStorage(): Map<string, string> {
  const cached = localStorage.getItem('geoMap');
  const timestamp = localStorage.getItem('geoMap:timestamp');

  const isFresh = cached && timestamp && Date.now() - Number(timestamp) < maxCacheAge;

  // Check if we have a cached version and if it's still fresh
  if (isFresh) {
    try {
      const entries: [string, string][] = JSON.parse(cached);
      return new Map(entries);
    } catch {
      console.warn('Could not read geoMap cache.');
    }
  }

  return new Map();
}

/** A function to save geoMap cache to localstorage, geo id and name */
function saveGeoCacheToStorage(map: Map<string, string>) {
  const entries = [...map.entries()];
  localStorage.setItem('geoMap', JSON.stringify(entries));
  localStorage.setItem('geoMap:timestamp', String(Date.now()));
}

/** A function to save fishing rules to localStorage */
function saveFishingRulesToStorage(rules: FishingRule[]) {
  localStorage.setItem('fishingRules', JSON.stringify(rules));
  localStorage.setItem('fishingRules:timestamp', String(Date.now()));
  console.log('Saved rules to cache:', rules.length);
}

/** A function to fetch fishing rules from localStorage */
function loadFishingRulesFromStorage() {
  const cacheKey = 'fishingRules';
  const timestampKey = 'fishingRules:timestamp';

  // Check if we have a cached version and if it's still fresh
  const cached = localStorage.getItem(cacheKey);
  const cachedAt = localStorage.getItem(timestampKey);

  const isFresh = cached && cachedAt && (Date.now() - Number(cachedAt) < maxCacheAge);

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






/* A type for the filter criteria */
export type RegulationFilter = {
  [K in keyof FormattedFishingRule]?: FormattedFishingRule[K];
};

/* A function to filter fishing regulations based on specified criteria */
export function filterRegulations(
  regulations: FormattedFishingRule[],
  filters: RegulationFilter
): FormattedFishingRule[] {
  return regulations.filter(regulation => {
    // Iterate over each key in the filters object
    for (const key in filters) {
      // Check if the filter key is a valid key of FishingRegulation
      if (Object.prototype.hasOwnProperty.call(filters, key) && key in regulation) {
        // Type assertion to help TypeScript understand the key
        const filterKey = key as keyof FormattedFishingRule;
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