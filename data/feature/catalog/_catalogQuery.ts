/**
 * The catalog collections are ordinary paginated reads, so they use the app-wide helper.
 * Kept as a named export here because every catalog hook imports it by this name.
 */
export { usePagedQuery as useCatalogPage } from "@/data/feature/_pagedQuery";
export type { PagedQueryConfig, PagedQueryResult } from "@/data/feature/_pagedQuery";
