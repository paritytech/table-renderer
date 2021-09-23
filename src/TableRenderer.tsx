import { css } from "@linaria/core"
import { styled } from "@linaria/react"
import { saveAs } from "file-saver"
import React from "react"

import { tableRendererStateURLParam } from "./constants"
import ErrorMessage from "./ErrorMessage"
import { CenteredFlexRow, CenteredVerticalLayout } from "./layout"
import { TableColumn, TableRequest, TableState } from "./types"
import {
  createRange,
  getInitialTableState,
  getStringValuesDelimited,
} from "./utils"

const disabledButtonStyle = css`
  background-color: white;
`

const TokenInputRow = styled(CenteredFlexRow)`
  width: 100%;
  margin-top: 1rem;

  > *:nth-child(2) {
    flex: 1;
  }
`

const TableColumnHeader = styled.td`
  user-select: none;
  white-space: nowrap;
`

const Scroller = styled.div`
  height: 1px;
`

const TableContainer = styled.div`
  overflow-x: auto;
`

const TokenInputLabel = styled.label`
  margin-right: 1rem;
`

const TokenInput = styled.input`
  flex: 1;
  margin-right: 1rem;
`

const Table = styled.table`
  width: 100%;

  td {
    padding: 8px;
  }

  td:first-child {
    padding-left: 0px;
  }

  td:last-child {
    padding-right: 0px;
  }
`

const DataSection = styled.div`
  margin: 1rem 0;
`

const FiltersTable = styled(Table)`
  tr:first-child > * {
    padding-top: 0px;
  }
`

const DataTable = styled(Table)`
  td {
    border-left: 1px solid grey;
  }

  td:first-child {
    border-left: none;
  }

  tr + tr > td {
    border-top: 1px solid grey;
  }

  thead > tr {
    background-color: rgba(0, 0, 0, 0.1);

    > td {
      border-bottom: 1px solid grey;
    }
  }
`

const FilterRow = styled.tr`
  > *:nth-child(1) {
    width: 1px;
    white-space: nowrap;
  }
  > *:nth-child(2) {
    width: 1px;
  }
  > *:nth-child(3) > *:not(input[type="checkbox"]) {
    width: 100%;
  }
`

const TableRendererContainer = styled.div`
  margin: 1rem 0;
`

const PaginationGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`

const PaginatorGoToPage = styled.input`
  width: 4rem;
`

const defaultGetColumnChild = function <T>(row: T, { name }: TableColumn) {
  const value = (row as any)[name] ?? null

  return typeof value === "boolean" ? String(value) : value
}

const TableRenderer = function <T>({
  tableInitializeMessage,
  fetchEndpoint,
  getColumnChild,
  token,
  classNames,
}: {
  tableInitializeMessage?: string
  fetchEndpoint: string
  getColumnChild: (
    row: T,
    column: TableColumn,
    index: number,
  ) => React.ReactNode
  token?: {
    value: string
    autoload: boolean
  }
  classNames?: Record<"TableRendererContainer", string>
}) {
  type ThisTableState = TableState<T[]>
  tableInitializeMessage ??= "Initialize"

  const { initialState, abortController } = React.useMemo(function () {
    const queryParams = new URLSearchParams(window.location.search)
    const queryState = queryParams.get("state")
    const baseInitialState = getInitialTableState()
    const initialState = queryState
      ? {
          ...baseInitialState,
          ...JSON.parse(queryState),
          isInitialized: false,
          error: undefined,
          isLoading: false,
          wereFiltersApplied: false,
        }
      : baseInitialState
    return { initialState, abortController: new AbortController() }
  }, [])

  const [state, setState] = React.useState<ThisTableState>(initialState)
  const [scrollerRef, setScrollerRef] = React.useState<HTMLDivElement | null>(
    null,
  )
  const [tableRef, setTableRef] = React.useState<HTMLTableElement | null>(null)
  const errorRef = React.useRef<HTMLDivElement | null>(null)

  const load = React.useMemo(
    function () {
      const setStateAndUpdateURL = function (newState: ThisTableState) {
        const queryParams = new URLSearchParams(window.location.search)
        const queryState = queryParams.get(tableRendererStateURLParam)
        const targetStateValue = encodeURIComponent(
          JSON.stringify({
            filters: state.filters,
            page: state.page,
            pageSize: state.pageSize,
            sort: state.sort,
          }),
        )
        if (queryState !== targetStateValue) {
          queryParams.set(tableRendererStateURLParam, targetStateValue)
          const replaceQueryStart = window.location.href.indexOf("?")
          history.replaceState(
            {},
            document.title,
            `${window.location.href.slice(
              ...[0, ...(replaceQueryStart === -1 ? [] : [replaceQueryStart])],
            )}${queryParams.toString()}`,
          )
        }
        setState(newState)
      }

      return async function (request: TableRequest) {
        const loadCount = ++state.loadCount

        try {
          if (tokenInput.current === null) {
            throw new Error("tokenRef is null")
          }

          if (state.isLoading) {
            abortController.abort()
          }

          const isExportRequest = request.page === "all"

          setStateAndUpdateURL({
            ...state,
            isLoading: true,
            ...(isExportRequest ? { wereFiltersApplied: false } : {}),
          })

          const response = await fetch(fetchEndpoint, {
            method: "POST",
            signal: abortController.signal,
            headers: {
              "x-auth": tokenInput.current.value,
              "content-type": "application/json",
              accept: isExportRequest ? "application/csv" : "application/json",
            },
            body: JSON.stringify(request),
          })

          const responseText = await response.text()
          if (response.ok) {
            if (isExportRequest) {
              const blob = new Blob(responseText.split("\n"), {
                type: "text/csv;charset=utf-8",
              })
              saveAs(
                blob,
                `${new Date().toISOString().replace(/\./g, "_")}.csv`,
              )
              setStateAndUpdateURL({
                ...state,
                error: undefined,
                isLoading: false,
              })
            } else {
              setStateAndUpdateURL({
                ...state,
                ...JSON.parse(responseText),
                isLoading: false,
                wereFiltersApplied: true,
                isInitialized: true,
                error: undefined,
                ...(tableRef === null
                  ? {}
                  : { scrollTo: { top: tableRef.offsetTop } }),
              })
            }
          } else {
            try {
              const errorDescription = JSON.parse(responseText)
              setState({
                ...state,
                error:
                  "error" in errorDescription
                    ? errorDescription.error
                    : JSON.stringify(errorDescription),
                isLoading: false,
                wereFiltersApplied: false,
                ...(errorRef.current === null
                  ? {}
                  : { scrollTo: { top: errorRef.current.offsetTop } }),
              })
            } catch (error) {
              throw new Error(
                `Request failed with code ${response.status} (${response.statusText})`,
              )
            }
          }
        } catch (error: any) {
          const updates: Partial<ThisTableState> = {
            wereFiltersApplied: false,
            ...(errorRef.current === null
              ? {}
              : { scrollTo: { top: errorRef.current.offsetTop } }),
          }

          if (state.loadCount === loadCount) {
            updates.isLoading = false
          }

          if (!(error instanceof DOMException) || error.name !== "AbortError") {
            updates.error =
              error.toString() ?? "Caught unexpected error in Table.load"
          }

          setState({ ...state, ...updates })
        }
      }
    },
    [state, tableRef, errorRef],
  )

  const {
    ApplyFiltersButton,
    Paginator,
    ErrorDisplay,
    markFiltersWereChanged,
    applyFiltersForCurrentState,
  } = React.useMemo(
    function () {
      const applyFiltersForCurrentState = function () {
        load({
          pageSize: state.pageSize,
          page: state.page,
          filters: state.filters,
          sort: state.sort,
        })
      }

      const ApplyFiltersButton = function ({
        filtersWereAppliedText,
      }: {
        filtersWereAppliedText?: string
      }) {
        return (
          <button
            {...(state.isLoading || state.wereFiltersApplied
              ? { disabled: true }
              : { onClick: applyFiltersForCurrentState })}
          >
            {state.wereFiltersApplied
              ? filtersWereAppliedText ?? "Filters are applied"
              : state.isInitialized
              ? "Apply"
              : tableInitializeMessage}
          </button>
        )
      }

      const Paginator = function ({
        goToPagePlacement,
      }: {
        goToPagePlacement: "top" | "bottom"
      }) {
        if (!state.data?.length) {
          return null
        }

        const GoToPage = (
          <>
            <span>
              Page {state.page} of {state.pageCount}
            </span>
            {state.isLoading ? (
              <em>Loading...</em>
            ) : state.wereFiltersApplied === false ? (
              <div>
                <em>Note: Filters should be applied for enabling pagination</em>{" "}
                <ApplyFiltersButton />
              </div>
            ) : null}
            <CenteredFlexRow>
              <PaginatorGoToPage
                defaultValue={state.page}
                type="number"
                placeholder="Page"
              />
              <button
                {...(state.wereFiltersApplied
                  ? {
                      onClick: function ({ target }: { target: any }) {
                        const page = parseInt(
                          target.parentElement.querySelector("input").value,
                        )
                        if (isNaN(page)) {
                          return
                        }
                        load({
                          pageSize: state.pageSize,
                          page: Math.min(Math.max(page, 1), state.pageCount),
                          filters: state.filters,
                          sort: state.sort,
                        })
                      },
                    }
                  : { disabled: true, className: disabledButtonStyle })}
              >
                Go
              </button>
            </CenteredFlexRow>
          </>
        )

        return (
          <PaginationGroup>
            {goToPagePlacement === "top" ? GoToPage : null}
            <CenteredFlexRow>
              {createRange(
                Math.max(state.page - 10, 1),
                Math.min(state.page + 10, state.pageCount + 1),
              ).map(function (page) {
                return (
                  <button
                    key={page}
                    title={`Go to page number ${page}`}
                    {...(state.page === page ||
                    state.wereFiltersApplied === false
                      ? { disabled: true, className: disabledButtonStyle }
                      : {
                          onClick: function () {
                            load({
                              pageSize: state.pageSize,
                              page,
                              filters: state.filters,
                              sort: state.sort,
                            })
                          },
                        })}
                  >
                    {page}
                  </button>
                )
              })}
            </CenteredFlexRow>
            {goToPagePlacement === "bottom" ? GoToPage : null}
          </PaginationGroup>
        )
      }

      const ErrorDisplay = function () {
        return (
          <ErrorMessage
            ref={errorRef}
            error={state.error}
            dismiss={function () {
              setState({ ...state, error: undefined })
            }}
          />
        )
      }

      const markFiltersWereChanged = function () {
        if (!state.wereFiltersApplied) {
          return
        }
        state.wereFiltersApplied = false
        setState({ ...state, wereFiltersApplied: false })
      }

      return {
        ApplyFiltersButton,
        Paginator,
        ErrorDisplay,
        markFiltersWereChanged,
        applyFiltersForCurrentState,
      }
    },
    [state, load, setState],
  )

  const tokenInput = React.useRef<HTMLInputElement | null>(null)

  React.useLayoutEffect(
    function () {
      if (scrollerRef === null || tableRef === null) {
        return
      }

      const targetScrollerWidth = `${tableRef.scrollWidth}px`
      if (scrollerRef.style.width !== targetScrollerWidth) {
        scrollerRef.style.width = targetScrollerWidth
      }

      const scrollerParent = scrollerRef.parentElement
      if (scrollerParent === null) {
        return
      }

      const tableParent = tableRef.parentElement
      if (tableParent === null) {
        return
      }

      // https://stackoverflow.com/a/56384091/16833094
      // This implementation prevents two scroller listeners from interfering
      // with each other
      let isScrolling = false

      const scrollerParentScrollCallback = function () {
        if (isScrolling) {
          isScrolling = false
          return true
        }
        isScrolling = true
        tableParent.scrollLeft = scrollerParent.scrollLeft
      }
      scrollerParent.removeEventListener("scroll", scrollerParentScrollCallback)
      scrollerParent.addEventListener("scroll", scrollerParentScrollCallback)

      const tableParentScrollCallback = function () {
        if (isScrolling) {
          isScrolling = false
          return true
        }
        isScrolling = true
        scrollerParent.scrollLeft = tableParent.scrollLeft
      }
      tableParent.removeEventListener("scroll", tableParentScrollCallback)
      tableParent.addEventListener("scroll", tableParentScrollCallback)
    },
    [tableRef, scrollerRef],
  )

  React.useLayoutEffect(
    function () {
      if (state.scrollTo === undefined) {
        return
      }
      window.scrollTo({ behavior: "smooth", ...state.scrollTo })
    },
    [state.scrollTo],
  )

  const initializedComponents = state.isInitialized ? (
    <>
      <FiltersTable>
        <tbody>
          {state.filters.map(function ({ name, value }, key) {
            let {
              input,
              clear,
            }: {
              input: JSX.Element
              clear: (event: { target: any }) => void
            } = (function () {
              const clearInput = function ({ target }: { target: any }) {
                value.value = null
                target.parentElement
                  .closest("tr")
                  .querySelector("input").value = ""
                markFiltersWereChanged()
              }
              const clearCheckbox = function ({ target }: { target: any }) {
                value.value = null
                target.parentElement
                  .closest("tr")
                  .querySelector("input").checked = value.value = false
                markFiltersWereChanged()
              }
              const defaultInputProps = {
                onKeyUp: function (event: React.KeyboardEvent) {
                  if (event.keyCode === 13) {
                    event.preventDefault()
                    applyFiltersForCurrentState()
                  }
                },
              }

              switch (value.tag) {
                case "string[]": {
                  return {
                    input: (
                      <input
                        {...defaultInputProps}
                        placeholder="Comma-delimited: a,b,c,..."
                        defaultValue={
                          value.value ? value.value.join(",") : undefined
                        }
                        onChange={function ({ target: { value: newValue } }) {
                          value.value = getStringValuesDelimited(newValue, ",")
                          markFiltersWereChanged()
                        }}
                      />
                    ),
                    clear: clearInput,
                  }
                }
                case "number":
                case "string": {
                  return {
                    input: (
                      <input
                        {...defaultInputProps}
                        type={value.tag === "number" ? "number" : undefined}
                        defaultValue={value.value ?? undefined}
                        onChange={function ({ target: { value: newValue } }) {
                          value.value = newValue
                          markFiltersWereChanged()
                        }}
                      />
                    ),
                    clear: clearInput,
                  }
                }
                case "boolean": {
                  return {
                    input: (
                      <input
                        {...defaultInputProps}
                        type="checkbox"
                        defaultChecked={value.value ?? undefined}
                        onChange={function ({ target: { checked } }) {
                          value.value = checked
                          markFiltersWereChanged()
                        }}
                      />
                    ),
                    clear: clearCheckbox,
                  }
                }
                case "ISO8601 date": {
                  return {
                    input: (
                      <input
                        {...defaultInputProps}
                        type="date"
                        defaultValue={value.value ?? undefined}
                        onChange={function ({ target: { value: newValue } }) {
                          value.value = newValue
                          markFiltersWereChanged()
                        }}
                      />
                    ),
                    clear: clearInput,
                  }
                }
                default: {
                  const exhaustivenessCheck: never = value
                  throw new Error(`Not exhaustive: ${exhaustivenessCheck}`)
                }
              }
            })()

            return (
              <FilterRow {...{ key }}>
                <td>{name}</td>
                <td>
                  <button onClick={clear}>Clear</button>
                </td>
                <td>{input}</td>
              </FilterRow>
            )
          })}
          <tr>
            <td colSpan={2}>
              <ApplyFiltersButton />
            </td>
          </tr>
        </tbody>
      </FiltersTable>

      <ErrorDisplay />

      <div>
        <button
          {...(state.wereFiltersApplied && !state.isLoading
            ? {
                onClick: function () {
                  load({
                    pageSize: state.pageSize,
                    page: "all",
                    filters: state.filters,
                    sort: state.sort,
                  })
                },
              }
            : { disabled: true, className: disabledButtonStyle })}
        >
          Export the data (with filters applied)
        </button>{" "}
        {state.wereFiltersApplied ? null : (
          <em>Note: Filters should be applied before exporting</em>
        )}
      </div>

      <Paginator goToPagePlacement="top" />

      <DataSection>
        {state.data?.length ? (
          <TableContainer>
            <Scroller ref={setScrollerRef} />
          </TableContainer>
        ) : null}
        <TableContainer>
          <DataTable ref={setTableRef}>
            <thead>
              <tr>
                {state.columns.map(function ({ name, isSortable }, key) {
                  const {
                    currentDirection,
                    nextDirection,
                    sortedByDefault,
                  }: {
                    nextDirection: "asc" | "desc" | null
                    currentDirection: "asc" | "desc" | null
                    sortedByDefault: boolean
                  } =
                    state.sort?.column === name
                      ? {
                          nextDirection:
                            state.sort.direction === "asc"
                              ? "desc"
                              : state.sort.direction === "desc"
                              ? state.sort.sortedByDefault
                                ? "asc"
                                : null
                              : "asc",
                          currentDirection: state.sort.direction,
                          sortedByDefault: state.sort.sortedByDefault ?? false,
                        }
                      : {
                          nextDirection: "asc",
                          currentDirection: null,
                          sortedByDefault: false,
                        }

                  return (
                    <TableColumnHeader
                      {...{ key }}
                      {...(isSortable
                        ? {
                            onClick: function () {
                              load({
                                pageSize: state.pageSize,
                                page: state.page,
                                filters: state.filters,
                                sort:
                                  nextDirection === null
                                    ? null
                                    : {
                                        column: name,
                                        direction: nextDirection,
                                        sortedByDefault,
                                      },
                              })
                            },
                            style: { cursor: "pointer" },
                          }
                        : {})}
                    >
                      {name}
                      {isSortable ? (
                        <>
                          {" "}
                          <span
                            style={{
                              visibility: currentDirection
                                ? "visible"
                                : "hidden",
                              width: "5ch",
                            }}
                          >
                            {`(${currentDirection})`}
                          </span>
                        </>
                      ) : null}
                    </TableColumnHeader>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {state.data.map(function (row, key) {
                return (
                  <tr {...{ key }}>
                    {state.columns.map(function (column, index) {
                      const customChild =
                        getColumnChild === undefined
                          ? undefined
                          : getColumnChild(row, column, index)
                      const child =
                        customChild === undefined
                          ? defaultGetColumnChild(row, column)
                          : customChild
                      return <td key={index}>{child}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </TableContainer>
      </DataSection>

      <Paginator goToPagePlacement="bottom" />
    </>
  ) : (
    <CenteredVerticalLayout>
      <ErrorDisplay />
      First insert your access token below and then click on "
      {tableInitializeMessage}"
    </CenteredVerticalLayout>
  )

  React.useLayoutEffect(function () {
    if (token?.autoload) {
      load({
        pageSize: state.pageSize,
        page: state.page,
        filters: state.filters,
        sort: state.sort,
      })
    }
  }, [])

  return (
    <TableRendererContainer className={classNames?.TableRendererContainer}>
      {initializedComponents}
      <TokenInputRow>
        <TokenInputLabel>Token</TokenInputLabel>
        <TokenInput
          placeholder="Access Token"
          ref={tokenInput}
          type="password"
          defaultValue={token?.value}
          onChange={function () {
            markFiltersWereChanged()
          }}
        />
        <ApplyFiltersButton filtersWereAppliedText="Active" />
      </TokenInputRow>
    </TableRendererContainer>
  )
}

export default TableRenderer
