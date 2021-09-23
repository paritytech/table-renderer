import { TableState } from "./types"

export const initialTableState: TableState<unknown> = {
  pageSize: 10,
  page: 1,
  pageCount: 1,
  data: [],
  columns: [],
  filters: [],
  isLoading: false,
  isInitialized: false,
  loadCount: 0,
  sort: null,
  wereFiltersApplied: false,
}

export const tableRendererStateURLParam = "tableRendererState"
