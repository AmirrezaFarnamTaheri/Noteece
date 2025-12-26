/**
 * Pagination Constants
 *
 * Centralized pagination configuration for FlatList and other virtualized lists.
 * These values are tuned for optimal performance on mobile devices.
 */

/**
 * Initial number of items to render in FlatList
 *
 * Controls how many items are rendered on initial mount.
 * Lower values improve initial render time, higher values reduce blank areas.
 */
export const INITIAL_NUM_TO_RENDER = 15;

/**
 * Maximum number of items to render per batch
 *
 * Controls how many items are rendered at once when scrolling.
 * Lower values spread rendering work over time, higher values reduce stuttering.
 */
export const MAX_TO_RENDER_PER_BATCH = 10;

/**
 * Window size multiplier for FlatList
 *
 * Controls how many screen heights of content are kept rendered.
 * Example: windowSize of 5 means 2.5 screens above and 2.5 screens below.
 */
export const WINDOW_SIZE = 5;

/**
 * Update cells batch period in milliseconds
 *
 * Controls how often updates are batched together.
 * Lower values increase responsiveness, higher values improve performance.
 */
export const UPDATE_CELLS_BATCH_PERIOD_MS = 50;

/**
 * Standard page size for paginated API requests
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Large page size for initial data loads
 */
export const LARGE_PAGE_SIZE = 50;

/**
 * Small page size for resource-intensive queries
 */
export const SMALL_PAGE_SIZE = 10;
