---
name: snowflake-cli
description: Query Snowflake with the `snow` CLI. Use when the user says "snow", "Snowflake", "cross-reference in Snowflake / the data platform", or asks whether a record reached the lake-formation tables.
---

# Snowflake CLI (`snow sql`)

One query shape carries every step:

```bash
snow sql -c <connection> --database <DB> --schema <SCHEMA> -q "<SQL>" --format JSON
```

`--format JSON` returns an array of row objects; a SQL error exits 1 with the Snowflake error code and message in a boxed block. Queries against the Toast lake-formation tables take 2–5s; give the shell a 30s timeout. The `externalbrowser` authenticator may block on a browser login the first time — if the first call hangs, that is why; raise the timeout once rather than retrying.

## Steps

1. **Discover the connection.** `snow connection list --format JSON`, then confirm with
   `SELECT CURRENT_ACCOUNT(), CURRENT_ROLE(), CURRENT_WAREHOUSE(), CURRENT_DATABASE()`. Done when a `-c` value is chosen and the role resolves.
2. **Discover the target.** `SHOW DATABASES`, `SHOW SCHEMAS IN DATABASE <DB>`, `SHOW TABLES IN SCHEMA <DB>.<SCHEMA>`, `DESC TABLE <DB>.<SCHEMA>.<TABLE>`. Ask the user only when a discovery call returns nothing that matches their words. Done when the table and its column types are in hand — the `DESC TABLE` output decides how nested columns and timestamps are addressed in step 3. For `LAKEFORMATION_EXPLORER_*` databases read [`lakeformation-tables.md`](lakeformation-tables.md) before writing the query.
3. **Write the query.** Address nested `OBJECT` columns with `COL:field::TYPE`. Filter on the partition column when the table has one. Give every projected expression an alias that differs from every source column name — an alias that equals a column name shadows it in `ORDER BY`/`WHERE` and produces `Invalid argument types for function 'GET'`.
4. **Interpret an empty result before reporting absence.** An empty array means *not visible in this table right now*. Check the table's ingestion watermark (see the lake-formation reference) against the event time; only when the watermark is past the event time does "empty" mean "absent".

## Cross-referencing logs (Splunk) with Snowflake

Gather from the logs first: the entity identifiers (campaign GUID, job GUID, management set GUID) and the event's **UTC** timestamp. Query Snowflake by identifier, not by time window. Report both timestamps in UTC when comparing (step 4) — Snowflake session output is in the session `TIMEZONE`, currently `America/New_York`.
