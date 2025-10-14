import type { PaginatedResult } from "@/store/types/dashboard";

export interface FetchAllPaginatedOptions<T> {
  pageSize?: number;
  maxPages?: number;
  getId?: (item: T) => string | number;
}

export const fetchAllPaginated = async <T>(
  request: (page: number, pageSize: number) => Promise<PaginatedResult<T>>,
  { pageSize = 200, maxPages = 40, getId }: FetchAllPaginatedOptions<T> = {},
): Promise<{ items: T[]; total: number }> => {
  const aggregated: T[] = [];
  const seen = new Set<string>();

  let total = 0;
  let page = 1;

  while (page <= maxPages) {
    const response = await request(page, pageSize);
    total = response.count ?? total;

    let added = false;
    response.items.forEach((item, index) => {
      const identifier = getId ? String(getId(item)) : `${page}-${index}`;
      if (!seen.has(identifier)) {
        seen.add(identifier);
        aggregated.push(item);
        added = true;
      }
    });

    const reachedTotal = total > 0 && aggregated.length >= total;
    const noMoreItems = response.items.length === 0 || !added;
    const noNextPage = response.nextOffset === null;

    if (reachedTotal || noMoreItems || noNextPage) {
      break;
    }

    page += 1;
  }

  return {
    items: aggregated,
    total: total || aggregated.length,
  };
};
