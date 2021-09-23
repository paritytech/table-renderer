import { TableState } from "./types"

export const getStringValuesDelimited = function (
  str: string,
  delimiter: string,
) {
  return str
    .split(delimiter)
    .map(function (value) {
      return value.trim()
    })
    .filter(function (value) {
      return value.length !== 0
    })
}

export const getInitialTableState = function (): TableState<{}> {
  return {
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
}

// Adapted from https://github.com/lodash/lodash/blob/2f79053d7bc7c9c9561a30dda202b3dcd2b72b90/.internal/baseRange.js#L12
export const createRange = function (start: number, end: number) {
  let index = -1
  let length = Math.max(Math.ceil((end - start) / 1), 0)

  const result = new Array(length)
  while (++index != length) {
    result[index] = start
    start += 1
  }

  return result
}
