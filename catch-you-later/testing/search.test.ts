import { describe, it, expect } from 'vitest';
import { type FormattedFishingRule } from '../src/backend/fetch-fishing-regulations';
import { prioritizeAndFilterQuery } from '../src/backend/search-handler';

// Extend the type to include _score for testing purposes
type ScoredFishingRule = FormattedFishingRule & { _score: number };

describe('prioritizeAndFilterQuery', () => {
    const mockRegulations: FormattedFishingRule[] = [
        {
            text: 'You may not catch herring during the spawning season.',
            species: ['Herring', 'Salmon'],
            location: [{ id: '1', name: 'Baltic Sea', geography: { geometry: { type: 'Polygon', coordinates: [[[12, 56], [14, 56]]] } } }],
            type: "Förbud",
            startsAt: '2024-01-01',
            gear: 'Nät',
            targetGroup: ['RECREATIONAL'],
        },
        {
            text: 'Catching cod is limited in the Kattegat.',
            species: ['Cod'],
            location: [{ id: '2', name: 'Kattegat', geography: { geometry: { type: 'Polygon', coordinates: [[[12, 56], [14, 56]]] } } }],
            type: "Förbud",
            startsAt: '2024-01-02',
            gear: 'Nät',
            targetGroup: ['RECREATIONAL'],
        },
        {
            text: 'Fishing is allowed in the North Sea.',
            species: ['Trout'],
            location: [{ id: '3', name: 'North Sea', geography: { geometry: { type: 'Polygon', coordinates: [[[12, 56], [14, 56]]] } } }],
            type: "Förbud",
            startsAt: '2024-01-03',
            gear: 'Nät',
            targetGroup: ['RECREATIONAL'],
        }
    ];

    it('prioritizes exact species name match highest', () => {
        const result = prioritizeAndFilterQuery('herring', mockRegulations) as ScoredFishingRule[];

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].species[0].toLowerCase()).toBe('herring');
        expect(result[0]._score).toBeGreaterThan(9); // 10 points for exact species match
    });

    it('gives partial species match lower score', () => {
        const partial = prioritizeAndFilterQuery('herr', mockRegulations) as ScoredFishingRule[];
        const exact = prioritizeAndFilterQuery('herring', mockRegulations) as ScoredFishingRule[];

        expect(partial[0]._score).toBeLessThan(exact[0]._score);
    });

    it('matches on location name', () => {
        const result = prioritizeAndFilterQuery('kattegat', mockRegulations) as ScoredFishingRule[];
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].location[0].name.toLowerCase()).toContain('kattegat');
        expect(result[0]._score).toBeGreaterThanOrEqual(6); // 6 points for exact location match
    });

    it('matches on rule text', () => {
        const result = prioritizeAndFilterQuery('spawning', mockRegulations) as ScoredFishingRule[];
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].text.toLowerCase()).toContain('spawning');
        expect(result[0]._score).toBeGreaterThanOrEqual(4); // 4 points for exact rule text match
    });

    it('reorders species to put exact match first', () => {
        const result = prioritizeAndFilterQuery('salmon', mockRegulations) as ScoredFishingRule[];
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].species[0].toLowerCase()).toBe('salmon');
    }); //This test found incorrect logic in our function, and after fixing this test worked.

    it('returns empty array for unmatched queries', () => {
        const result = prioritizeAndFilterQuery('unicorn', mockRegulations) as ScoredFishingRule[];
        expect(result.length).toBe(0);
    });
});
