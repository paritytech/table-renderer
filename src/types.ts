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

export type TableColumn<T extends Record<string, any>> = {
  name: keyof T
  isSortable: boolean
}

export interface GetColumnChild<T> {
  (row: T, column: TableColumn<T>): React.ReactNode
}

export type TableResponse<T extends Record<string, any>> = Omit<
  TableRequest,
  "page"
> & {
  page: number
  pageCount: number
  data: T[]
  columns: TableColumn<T>[]
}

export type TableState<T extends Record<string, any>> = TableResponse<T> & {
  isLoading: boolean
  error?: string
  isInitialized: boolean
  loadCount: number
  wereFiltersApplied: boolean
  scrollTo?: ScrollToOptions
}
