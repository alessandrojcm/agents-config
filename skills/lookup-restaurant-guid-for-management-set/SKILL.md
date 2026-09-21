---
name: lookup-restaurant-guid-for-management-set
description: Given one or more management set GUIDs, find the corresponding restaurant_external_id (restaurant guid) by searching Splunk for the "Created communication sender request for managementSet" log emitted by CommunicationSenderService.
---

# Lookup restaurant guid for a management set guid (via Splunk)

## When to use

Use this skill when someone provides management set GUID(s) and wants the
`restaurant_external_id` (restaurant guid) associated with each one. The
mapping is recovered from the sender-creation log line emitted by
`CommunicationSenderService.createCommunicationSender` (see
`toast-communication-management-application/src/main/kotlin/com/toasttab/service/communicationmanagement/service/senderManagement/CommunicationSenderService.kt`):

```
Created communication sender request for managementSet <management_set_guid> using logo: <logo>
```

Each event carries contextual (MDC) key-value fields in square brackets,
including `restaurant_external_id=<guid>` and `management_set_guid=<guid>`,
so both values can be extracted from `_raw` with `rex`.

Note: the log is only emitted when a sender is **created** (first
verification flow for that management set + provider). If no sender was
created for a management set inside the searched time range, it will not
appear — widen the range or report the GUID as not found.

## Query

Use the `mcp__splunk__run_splunk_query` tool (Splunk MCP) with:

```spl
index=prod_g2 sourcetype=g2_svc source=prod-communication-management-*
  "Created communication sender request for managementSet"
  ("<GUID_1>" OR "<GUID_2>" OR ... OR "<GUID_N>")
| rex field=_raw "restaurant_external_id=(?<restaurant_external_id>[0-9a-fA-F-]{36})"
| rex field=_raw "management_set_guid=(?<management_set_guid>[0-9a-fA-F-]{36})"
| stats values(restaurant_external_id) as restaurant_external_id latest(_time) as last_seen by management_set_guid
```

- Substitute the quoted GUID list with the management set GUIDs to look up.
  Quoting each GUID makes it a fast indexed term search.
- For preproduction, use `index=preproduction_g2` and
  `source=preproduction-communication-management-*`.

## Splunk best practices (must follow)

1. **Always scope the search**: include `index=prod_g2`,
   `sourcetype=g2_svc`, and `source=prod-communication-management-*`. Never
   run unscoped or wildcard-index (`index=prod*`) searches.
2. **Constrain by time**: default to `earliest=-30m latest=now` unless the
   user asks for a wider range.
3. **Requests time out at ~1 minute** — a single 30-day query WILL time out.
   Chunk the range and run chunks sequentially, merging the per-chunk
   `stats` rows yourself:
   - The most recent window (`earliest_time=-7d latest_time=now`) is fast
     (hot buckets) and can be taken in one 7-day chunk.
   - Older data is much slower: a 7-day chunk (e.g. `-14d`/`-7d`) times
     out. Use **3-day chunks** for anything older than ~7 days, e.g.
     `-10d`/`-7d`, `-13d`/`-10d`, `-16d`/`-13d`, … `-28d`/`-25d`,
     `-30d`/`-28d`.
4. **Prune as you go**: once a GUID is found, drop it from the OR-list for
   subsequent chunks, and stop sweeping entirely when all GUIDs are
   resolved.
5. **Row limit**: Splunk appends `| head 1001`; the `stats ... by
   management_set_guid` aggregation keeps result counts small, so this is
   rarely an issue.

## Output format

Report a table mapping each requested GUID to its restaurant guid:

| management_set_guid | restaurant_guid (restaurant_external_id) |
|---|---|
| ... | ... |

Explicitly list any requested GUIDs that were **not found**, along with the
time range actually searched.
