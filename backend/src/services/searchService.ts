import { tavily } from "@tavily/core";
import { mockDataService } from "./mockDataService";

export interface SearchResult {
    results: Array<{
        title: string;
        url: string;
        author: string;
        image: string;
        content: string;
    }>;
    images: Array<{
        url: string;
        thumbnail: string;
        description: string;
    }>;
}

export interface SearchOptions {
    searchDepth?: "basic" | "advanced";
    includeImages?: boolean;
    maxResults?: number;
}

export class SearchService {
    private static instance: SearchService;
    private tavilyClient: any = null;
    private isDevMode: boolean;

    private constructor() {
        this.isDevMode = process.env.MODE === 'DEV';
        this.initializeTavilyClient();
    }

    public static getInstance(): SearchService {
        if (!SearchService.instance) {
            SearchService.instance = new SearchService();
        }
        return SearchService.instance;
    }

    private initializeTavilyClient() {
        // Initialize Tavily client only if not in dev mode
        if (!this.isDevMode) {
            try {
                this.tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
                console.log('Tavily client initialized successfully');
            } catch (error) {
                console.error('Failed to initialize Tavily client:', error);
                this.tavilyClient = null;
            }
        } else {
            console.log('Running in development mode - Tavily client not initialized');
        }
    }

    /**
     * Perform a search using Tavily API or mock data
     * @param query - The search query
     * @param options - Search options
     * @returns Search results
     */
    public async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
        const {
            searchDepth = "basic",
            includeImages = true,
            maxResults = 3
        } = options;

        try {
            // Use mock data if Tavily client is not available
            if (!this.tavilyClient) {
                console.log("Tavily client not available, using mock data for search");
                return await mockDataService.mockTavilySearch(query);
            }

            // Perform real search with Tavily
            console.log(`Performing Tavily search for: "${query}"`);
            const searchResults = await this.tavilyClient.search(query, {
                searchDepth,
                includeImages,
                maxResults,
            });

            return this.formatSearchResults(searchResults);
        } catch (error) {
            console.error("Error performing search:", error);
            // Fallback to mock data on error
            console.log("Falling back to mock data");
            return await mockDataService.mockTavilySearch(query);
        }
    }

    /**
     * Format search results to ensure consistent structure
     * @param rawResults - Raw results from Tavily API
     * @returns Formatted search results
     */
    private formatSearchResults(rawResults: any): SearchResult {
        return {
            results: rawResults.results ? rawResults.results.map((result: any) => ({
                title: result.title || "",
                url: result.url || "",
                author: result.author || "",
                image: result.image || "",
                content: result.content || ""
            })) : [],
            images: rawResults.images ? rawResults.images.map((image: any) => ({
                url: image.url || "",
                thumbnail: image.url || "",
                description: image.description || ""
            })) : []
        };
    }

    /**
     * Check if Tavily client is available
     * @returns Whether Tavily client is initialized and ready
     */
    public isAvailable(): boolean {
        return this.tavilyClient !== null;
    }

    /**
     * Get the current mode (development or production)
     * @returns Whether the service is running in development mode
     */
    public isDevelopmentMode(): boolean {
        return this.isDevMode;
    }

    /**
     * Re-initialize the Tavily client (useful for configuration changes)
     */
    public reinitialize(): void {
        this.initializeTavilyClient();
    }
}

// Export singleton instance
export const searchService = SearchService.getInstance(); 