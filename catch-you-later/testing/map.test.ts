/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as L from 'leaflet';
import { updatePolygons } from '../src/backend/map-handler'; // adjust path
import type { FormattedFishingRule } from '../src/backend/fetch-fishing-regulations';

// Setup Leaflet DOM dependencies
beforeEach(() => {
    // mock leaflet map and layerGroup behavior
    vi.spyOn(L, 'layerGroup').mockReturnValue({
        addLayer: vi.fn(),
        addTo: vi.fn(),
    } as unknown as L.LayerGroup);

    vi.spyOn(L, 'polygon').mockImplementation(() => ({
        bindPopup: vi.fn(),
    } as unknown as L.Polygon));
});

afterEach(() => {
    vi.restoreAllMocks();
});



describe('updatePolygons', () => {
    it('adds polygons for new regulations to the map', async () => {
        const mockMap = {
            removeLayer: vi.fn(),
        } as unknown as L.Map;

        const regulations: FormattedFishingRule[] = [
            {
                species: ['Abborre'],
                text: 'No fishing',
                location: [
                    {
                        id: 'geo123',
                        name: 'Lake ABC',
                        geography: {
                            geometry: {
                                type: 'Polygon',
                                coordinates: [
                                    [
                                        [10.0, 60.0],
                                        [10.1, 60.0],
                                        [10.1, 60.1],
                                        [10.0, 60.1],
                                        [10.0, 60.0],
                                    ],
                                ],
                            },
                        },
                    },
                ],
                type: 'Förbud',
                startsAt: '2024-01-01',
                gear: 'Nät',
                targetGroup: ['RECREATIONAL'],
            },
        ];

        await updatePolygons(mockMap, regulations);

        expect(L.layerGroup).toHaveBeenCalled(); // polygons were grouped
        expect(L.polygon).toHaveBeenCalled();    // polygons were created
    });

    it('does nothing if regulations list is empty', async () => {

        const mockMap = {
            removeLayer: vi.fn(),
        } as unknown as L.Map;

        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        await updatePolygons(mockMap, []);

        expect(consoleSpy).toHaveBeenCalledWith('No regulations to display on the map.');
        expect(L.layerGroup).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
    });
});
