/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    fetchAllFishingRegulations,
    getLatestFetchDate,
    filterRegulations,
    RegulationFilter
} from '../src/backend/fetch-fishing-regulations'; // adjust this path

// Mocking localStorage
beforeEach(() => {
    localStorage.clear();
});

// Mock fetch
(globalThis.fetch as typeof fetch) = vi.fn();

describe('Fishing regulations logic', () => {
    it('getLatestFetchDate returns current date if no cache exists', async () => {
        const today = new Date().toISOString().split('T')[0];
        const result = await getLatestFetchDate();
        expect(result).toBe(today);
    });

    it('getLatestFetchDate returns cached date if it exists', async () => {
        const pastTimestamp = Date.now() - 10_000;
        localStorage.setItem('fishingRules:timestamp', pastTimestamp.toString());
        const result = await getLatestFetchDate();
        const expected = new Date(pastTimestamp).toISOString().split('T')[0];
        expect(result).toBe(expected);
    });

    it('filterRegulations correctly filters by species and type', () => {
        const mockRules = [
            {
                species: ['Abborre'],
                text: 'No fishing allowed',
                location: [],
                type: 'Förbud',
                startsAt: '2024-01-01',
                gear: 'Nät',
                targetGroup: ['RECREATIONAL'],
            },
            {
                species: ['Gädda'],
                text: 'Catch & Release',
                location: [],
                type: 'Rekommendation',
                startsAt: '2024-02-01',
                gear: 'Krok',
                targetGroup: ['COMMERCIAL'],
            },
        ];

        const filters: RegulationFilter = {
            species: ['Abborre'],
            type: 'Förbud',
        };

        const result = filterRegulations(mockRules, filters);
        expect(result).toHaveLength(1);
        expect(result[0].species).toContain('Abborre');
    });

    it('fetchAllFishingRegulations returns formatted regulation list', async () => {
        const mockRegulations = [{
            ruleId: 'rule-1',
            ruleText: 'Fishing is prohibited.',
            ruleType: 'PROHIBITION',
            entryIntoForceAt: '2024-01-01T00:00:00Z',
            targetGroups: ['RECREATIONAL'],
            geographies: ['geo123'],
            gearTypeRestriction: {
                allGearTypes: true,
                species: [{
                    speciesCode: '001',
                    speciesNameSwedish: 'Abborre',
                    speciesNameEnglish: 'Perch',
                    speciesNameLatin: 'Perca fluviatilis'
                }]
            }
        }];

        const mockGeo = {
            list: [{
                geographyId: 'geo123',
                geographyName: 'Östersjön',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[12, 56], [14, 56]]],
                }
            }]
        };

        // Mock fetch for regulations
        (fetch as unknown as vi.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ list: mockRegulations }),
        });

        // Mock fetch for geographies
        (fetch as unknown as vi.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockGeo,
        });

        const result = await fetchAllFishingRegulations();

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].species).toContain('Abborre');
        expect(result[0].type).toBe('Förbud');
        expect(result[0].location[0]).toEqual({
            name: 'Östersjön',
            geometry: {
                type: 'Polygon',
                coordinates: [[[12, 56], [14, 56]]],
            }
        });
    });
});
