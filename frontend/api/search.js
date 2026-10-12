import apiClient from "./client";

/**
 * Global Search API client
 */
export const searchApi = {
  /**
   * Perform role-scoped global search across all entities and modules.
   *
   * @param {string} query Search text
   * @param {AbortSignal} [signal] Optional abort signal for cancelling previous requests while typing
   * @returns {Promise<{ query: string, totalResults: number, categories: Array }>}
   */
  globalSearch: async (query, signal) => {
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return { query: "", totalResults: 0, categories: [] };
    }

    const response = await apiClient.get("/search", {
      params: { q: query.trim() },
      signal,
    });
    return response.data;
  },
};

export default searchApi;
