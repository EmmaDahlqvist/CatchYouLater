import type { FormattedFishingRule } from './fetchFishingRegulations.ts';

/** Group the rules by species and location, each specie location pair gives a set of rules */
export function groupFormattedRulesBySpeciesAndLocation(
  data: FormattedFishingRule[]
): Map<string, FormattedFishingRule[]> {
  const grouped = new Map<string, FormattedFishingRule[]>();

  for (const rule of data) {
    const key = `${rule.species}::${rule.location
      .map(loc => loc.id)
      .sort()
      .join(', ')}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)!.push(rule);
  }

  return grouped;
}

/** Filter out the general rules from the data, i.e ones with type "Allmän regel"*/
export function removeGeneralRules(data: FormattedFishingRule[]): FormattedFishingRule[] {
  return data.filter(rule => rule.type !== 'Allmän regel');
}

/** gives the rules with type "Allmän regel"*/
export function getGeneralRules(data: FormattedFishingRule[]): FormattedFishingRule[] {
  return data.filter(rule => rule.type === 'Allmän regel' &&  !rule.targetGroup.includes('OTHER'));
}