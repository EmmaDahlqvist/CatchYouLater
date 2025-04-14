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
  const rules = await extractFishingRules();
  const geoMap = await fetchAllGeographies();
  const formattedRules = await formatRules(rules, geoMap);
  return formattedRules;
}

/* A function to extract fishing rules from the API */
async function extractFishingRules() {
  const allRules = [];
  let after = null;
  let hasMore = true;

  // Loop to fetch all rules in batches of 20
  // until there are no more rules to fetch
  while (hasMore) {
    const url = new URL('https://gw-test.havochvatten.se/external-public/fishing-regulations/v1/rules');
    url.searchParams.set('limit', '20');
    if (after) url.searchParams.set('after', after);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error('Failed to fetch regulations');
    }

    const data = await response.json();
    console.log(data)
    const rules = data.list;

    // Check if there are no more rules to fetch
    if (rules.length === 0) {
      hasMore = false;
    } else {
      allRules.push(...rules);
      after = rules[rules.length - 1].ruleId;
    }
  }

  return allRules;
}

/* A function to fetch all geographies from the API */
async function fetchAllGeographies(): Promise<Map<string, string>> {
  const geoMap = new Map<string, string>();
  let after: string | null = null;
  let hasMore = true;

  // Loop to fetch all geographies in batches of 20
  // until there are no more geographies to fetch
  while (hasMore) {
    const url = new URL('https://gw-test.havochvatten.se/external-public/fishing-regulations/v1/geographies');
    url.searchParams.set('limit', '20');
    if (after) url.searchParams.set('after', after);

    const res = await fetch(url.toString());
    const data = await res.json();
    console.log('Geography API response:', data); // lägg till detta!
    const list = data.list;

    for (const geo of list) {
      geoMap.set(geo.geographyId, geo.geographyName);
    }

    hasMore = list.length > 0;
    after = list.at(-1)?.geographyId;
  }

  return geoMap;
}


/* A function to format the fishing rules into a more readable format */
async function formatRules(rules: Rule[], geoMap: Map<string, string>): Promise<FormattedRule[]> {
  return await Promise.all(
    rules.map(async (rule) => {
      const species = rule.gearTypeRestriction?.species?.map((s) =>
        s.speciesSubcategory
          ? `${s.speciesNameSwedish} (${s.speciesSubcategory})`
          : s.speciesNameSwedish
      ) ?? [];

      const locations = rule.geographies?.map(id => geoMap.get(id) ?? 'Unknown') ?? [];
      console.log('🔍 explicitGearTypes:', rule.gearTypeRestriction?.explicitGearTypes);
      return {
        species: species.join(', ') || '---',
        text: rule.ruleText || '---',
        location: locations.join(', ') || '---',
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



