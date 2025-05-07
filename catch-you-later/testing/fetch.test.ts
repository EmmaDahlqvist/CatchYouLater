/// <reference types="vitest" />
import { describe, it, expect, vi, type Mock, beforeEach } from 'vitest';
import {
    fetchAllFishingRegulations,
    getLatestFetchDate
} from '../src/backend/fetch-fishing-regulations'; // Adjust the path as needed

const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem(key: string) {
            return store[key] || null;
        },
        setItem(key: string, value: string) {
            store[key] = value.toString();
        },
        removeItem(key: string) {
            delete store[key];
        },
        clear() {
            store = {};
        },
        get length() {
            return Object.keys(store).length;
        },
        key(index: number) {
            const keys = Object.keys(store);
            return keys[index] || null;
        },
    };
})();

globalThis.localStorage = localStorageMock as Storage;
// Ensure global fetch is mocked
globalThis.fetch = vi.fn() as unknown as typeof fetch;

// Reset mocks before each test
beforeEach(() => {
    localStorage.clear();
    (fetch as unknown as Mock).mockReset();

    // Provide a default fallback response to prevent unhandled fetch calls
    (fetch as unknown as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
    });
});

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

        // First fetch call returns regulations
        (fetch as unknown as Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({list: mockRegulations}),
        });

        // Second fetch call returns geographies
        (fetch as unknown as Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockGeo,
        });

        const result = await fetchAllFishingRegulations();

        expect(result.length).toBeGreaterThan(0);
        expect(result[0].species).toContain('Abborre');
        expect(result[0].type).toBe('Förbud');
        expect(result[0].location[0]).toEqual({
            name: 'Östersjön',
            id: 'geo123',
            geography: {
                geometry: {
                    type: 'Polygon',
                    coordinates: [[[12, 56], [14, 56]]],
                },
            },
        });
    });
});

