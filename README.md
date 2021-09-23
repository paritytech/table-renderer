# table-renderer

This repository provides React components for rendering tables of JSON data
from APIs.

# Features

- Dynamically-rendered filters according to the API response
- Pagination
- Sorting
- Automatic vertical/horizontal table scrolling and layout
- Persistent URL-based filters
- Data exporting
- Token-based authentication

# How to use

```typescript
import TableRenderer from "table-renderer/src/TableRenderer"

const MyTable = function () {
  return (
    <TableRenderer
      api={{
        fetchEndpoint: "http://foo/api",
        exportEncoding: "text/csv; charset=utf-8",
        exportExtension: "csv",
        exportRequestAcceptHeader: "application/csv",
      }}
    />
  )
}
```

# Protocol

All the types mentioned below are gathered in the
[types module](./src/types).

The basic idea is for the client to send a `TableRequest` and the API to reply
with

- `TableResponse` with success status code on pagination requests
- `ExportResponse` with success status code on export requests
- `ErrorResponse` with error status code for error

Success or failure is determined by the status code and not the shape of the
response, which means one should not use a success code for an ErrorResponse
and so on.

## TableRequest

The request's body is always sent as JSON via `POST`.

For Pagination Requests, the response body's format should be JSON and comply
with the structure of `TableResponse`.

For Export Requests, the response body's can have any arbitrary content. The
response's body will be saved as-is straight into a file and not processed
through the application.

## TableRequest.filters

The API should include any missing filters in `TableRequest.filters` and send
them back in the response; each newly-initialized filter might include its
default initial value.

Normally a clean-slate client (one that does not have saved filters from a
previous run) sends the first request with an empty `filters` because it does
not yet know which filters are available in the API.

## TableRequest.page

`TableRequest.page` is the way to differentiate between Pagination Requests and
Export Requests. It is either:

- A page number, 1-indexed, for paginated browsing; this is what we consider a
  Pagination Request and therefore the result should be a `TableResponse`.
- The word "all", which signals that the API should export all of the data
  **according to the filters**; this is what we consider an Export Request and
  therefore the result should be an `ExportResponse`.

## TableRequest.pageSize

The number of items which are included in a page. It should not matter for when
`TableRequest.page` is "all".

## TableRequest.pageCount

This is the number of total records which were matched **according to the
filters** divided by `TableRequest.pageSize`, rounded up. It should not matter
for when `TableRequest.page` is "all".

## Example scenario

1. The client sends the initial request. In this case it has never used this
   API before, therefore most fields are empty, but that is not always the
   case.

```json
{
  "page": 1,
  "pageSize": 4,
  "filters": [],
  "sort": null
}
```

2. The API responds with the filled default information

By the returned data, we can infer that there are **at most** (since it's
rounded up) 4 (pageSize) * 2 (pageCount) = 8 records matching the filters,
which happen to be empty initially, therefore we can assume there are at most 8
records in total. This response also tells us that the API, by default, sorts
the records by "Date" in descending order.

```json
{
  "page": 1,
  "pageCount": 4,
  "pageSize": 2,
  "filters": [
    { "name": "Date", "value": { "tag": "ISO8601 date", "value": null } },
    { "name": "Item", "value": { "tag": "number", "value": null } },
  ]
  "data": [
    { "item": 6, "date": "2021-06-06" },
    { "item": 5, "date": "2021-06-05" },
    { "item": 4, "date": "2021-06-04" },
    { "item": 3, "date": "2021-06-03" },
  ],
  "sort": {
    "column": "date",
    "direction": "desc"
    "sortedByDefault": true
  }
}
```

3. The client sends a request for exporting the data.

```json
{
  "page": "all",
  "filters": [],
  "sort": null
}
```

4. The API sends an arbitrary response, in this case CSV, which the application
   will download.

```csv
"item","date"
6,"2021-06-06"
5,"2021-06-05"
4,"2021-06-04"
3,"2021-06-03"
2,"2021-06-02"
1,"2021-06-01"
```

# Example project

We plan to have a minimal project showcasing how to set up an API and
front-end, but it's not done yet.
