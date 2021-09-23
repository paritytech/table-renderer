export type TableFilterValue =
  | {
      tag: "ISO8601 date"
      value: string | null
    }
  | {
      tag: "string[]"
      value: string[] | null
    }
  | {
      tag: "number"
      value: number | null
    }
  | {
      tag: "string"
      value: string | null
    }
  | {
      tag: "boolean"
      value: boolean | null
    }

export type TableFilter = {
  name: string
  value: TableFilterValue
}

export type TableRequest = {
  page: number | "all"
  pageSize: number
  filters: TableFilter[]
  sort: {
    column: string
    direction: "asc" | "desc"
    sortedByDefault?: boolean
  } | null
}

export type TableColumn = {
  name: string
  isSortable: boolean
}

export type TableResponse<T> = Omit<TableRequest, "page"> & {
  page: number
  pageCount: number
  data: T
  columns: TableColumn[]
}

export type TableState<T> = TableResponse<T> & {
  isLoading: boolean
  error?: string
  isInitialized: boolean
  loadCount: number
  wereFiltersApplied: boolean
  scrollTo?: ScrollToOptions
}
