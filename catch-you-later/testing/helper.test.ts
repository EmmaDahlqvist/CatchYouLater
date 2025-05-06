import { describe, it, expect } from 'vitest';
import {
    groupFormattedRulesBySpeciesAndLocation,
    removeGeneralRules,
    removeRulesWithText,
    getGeneralRules
} from '../src/backend/helpers';

const mockData = [
    {
        species: 'Salmon',
        location: [{ id: 'L1' }],
        type: 'Special rule',
        text: 'No fishing allowed',
        targetGroup: [],
        _score: 10
    },
    {
        species: 'Salmon',
        location: [{ id: 'L1' }],
        type: 'Allmän regel',
        text: 'General rule text',
        targetGroup: [],
        _score: 5
    },
    {
        species: 'Trout',
        location: [{ id: 'L2' }],
        type: 'Special rule',
        text: 'Regel om fisketid',
        targetGroup: ['OTHER'],
        _score: 8
    }
] as any; // Use FormattedFishingRule if available

describe('groupFormattedRulesBySpeciesAndLocation', () => {
    it('groups by species and location key', () => {
        const result = groupFormattedRulesBySpeciesAndLocation(mockData);
        expect(result.size).toBe(2); // Salmon::L1 and Trout::L2
    });

    it('sorts groups by _score descending', () => {
        const result = [...groupFormattedRulesBySpeciesAndLocation(mockData).keys()];
        expect(result[0]).toBe('Salmon::L1'); // score 10 > 8
    });
});

describe('removeGeneralRules', () => {
    it('filters out Allmän regel and OTHER group', () => {
        const result = removeGeneralRules(mockData);
        expect(result.length).toBe(1);
        expect(result[0].species).toBe('Salmon');
    });
});


describe('getGeneralRules', () => {
    it('returns only general rules', () => {
        const result = getGeneralRules(mockData);
        expect(result.length).toBe(1);
        expect(result[0].type).toBe('Allmän regel');
    });
});
