import type { FormattedFishingRule } from './fetch-fishing-regulations.ts';

/** Group the rules by species and location, each specie location pair gives a set of rules */
export function groupFormattedRulesBySpeciesAndLocation(
  data: (FormattedFishingRule & { _score?: number })[]
): Map<string, FormattedFishingRule[]> {
  const tempGrouped = new Map<string, FormattedFishingRule[]>();
  const scoreMap = new Map<string, number>();

  // Process each rule and group them by species and location temporarily
  for (const rule of data) {
    const key = `${rule.species}::${rule.location.map(loc => loc.id).sort().join(',')}`;
    if (!tempGrouped.has(key)) {
      tempGrouped.set(key, []);
      scoreMap.set(key, rule._score || 0); // First rule score = group score 
    }

    tempGrouped.get(key)!.push(rule);
  }

  // Sort group based on score
  const sortedEntries = [...tempGrouped.entries()].sort((a, b) => {
    const scoreA = scoreMap.get(a[0]) ?? 0;
    const scoreB = scoreMap.get(b[0]) ?? 0;
    return scoreB - scoreA;
  });

  // Create a new Map with the sorted entries
  const orderedGrouped = new Map<string, FormattedFishingRule[]>();
  for (const [key, rules] of sortedEntries) {
    orderedGrouped.set(key, rules);
  }

  return orderedGrouped;
}


/** Filter out the general rules from the data, i.e ones with type "Allmän regel"*/
export function removeGeneralRules(data: FormattedFishingRule[]): FormattedFishingRule[] {
  return data.filter(rule => rule.type !== 'Allmän regel' &&  !rule.targetGroup.includes('OTHER') && !rule.text.toLocaleLowerCase().includes("regel"));
}

/** gives the rules with type "Allmän regel"*/
export function getGeneralRules(data: FormattedFishingRule[]): FormattedFishingRule[] {
  return data.filter(rule => rule.type === 'Allmän regel' &&  !rule.targetGroup.includes('OTHER'));
}