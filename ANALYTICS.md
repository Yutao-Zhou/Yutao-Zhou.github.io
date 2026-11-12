# Project analytics

All projects use one Umami Cloud website (`yutaozhou.com`). The shared script is
`https://yutaozhou.com/js/site-analytics.js`; each HTML entry specifies its stable
`data-project` value. New projects must include this script explicitly.

## Viewing details

Open the private [dashboard](https://cloud.umami.is/analytics/us/websites/f8cf3636-b17d-4011-92dc-6ae29d0d91a3).
Overview → Pages shows project paths. Events → Properties lets you choose an event
and group it by the properties below. Activity shows individual anonymous events;
it does not identify people.

| Project | Event | Properties and meaning |
| --- | --- | --- |
| house-shopping | `tool_tab_click` | `tab`, `previous_tab`: actual navigation tab clicks, including clicking the selected tab |
| house-shopping | `tool_tab_view` | `tab`, `previous_tab`, `entry`: initial restored view and subsequent actual view changes |
| showroom-talks | `car_view` | `car_slug`, `car_name`: each time a valid car review is opened; language/section changes do not add views |
| showroom-talks | `car_engaged` | Car identifiers; at least 30 seconds of visible reading, once per car per page lifetime |
| showroom-talks | `car_complete` | Car identifiers; review end reached after scrolling and at least 3 seconds of visible time |
| finance | `report_open` | `report_date`, optional `previous_report_date`, `entry`: each edition opening, including returns from the archive |
| finance | `report_read` | `report_date`: first opening of an edition per page lifetime |
| finance | `report_engaged` | `report_date`: at least 30 seconds of visible reading, once per edition per page lifetime |
| finance | `report_complete` | `report_date`: report end reached after scrolling and at least 3 seconds of visible time |
| finance | `source_click` | `report_date`, `destination`, `path`: click on a report source link |

Every event includes `project` and the interface `language` at event time.
The house tabs are `calculator` (Mortgage calculator), `compare` (Compare plans),
`schedule` (Amortization), `recast`, `refinance`, `buy-rent`, and `guide` (How it works).
View counts are opens, not proof of reading; completion is an end-of-page signal.
Engagement time accumulates across returns to the same article within a page
lifetime. Background time does not count. Reloads begin a new page lifetime.

## Collection boundaries

Only explicitly marked views and allowlisted event fields are collected. Loan
inputs, saved plan names, search text, URL queries and fragments are excluded.
The shared loader observes rendered DOM markers, so it also handles delayed
application loading without requiring a loaded analytics global in each app.
Repeated React rendering and language changes do not create duplicate view events.

Use [analytics preferences](https://yutaozhou.com/analytics-settings.html) to exclude
your browser across all projects. Refresh already open pages after changing the
preference. Each browser/device needs its own setting. DNT and GPC are honored.
New events begin at deployment; past clicks and review visits cannot be recovered.
QA visits appear in the live data. All projects and custom events share the plan's
event allowance.

## Maintenance

The app markers are `data-analytics-tool` (set only after restored state is ready),
`data-analytics-tab`, `data-analytics-car`/`data-analytics-car-name` on the visible
review, `data-analytics-car-end`, `data-report-date`, `data-analytics-view`, and
optional `data-analytics-language`. Keep markers tied to actual rendered state,
and update this catalog when adding an event. Never copy form values into markers.

Run `npm run test:analytics` after installing the declared dev dependencies.
