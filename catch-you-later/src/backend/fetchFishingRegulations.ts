/* A type for fetching fishing regulations */
export type FishingRegulation = {
    Species: string;
    MinSize: string | null;
    MaxSize: string | null;
    Area: string;
};

/* A function to fetch fishing regulations from a JSON file */
export async function fetchFishingRegulations(): Promise<FishingRegulation[]> {
    const response = await fetch('/data/fishing_regulations.json');
    if (!response.ok) {
        throw new Error('Failed to fetch fishing regulations');
    }

    return await response.json();
}
