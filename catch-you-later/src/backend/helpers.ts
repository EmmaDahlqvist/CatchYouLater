import type { FormattedFishingRule } from './fetchFishingRegulations.ts';

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