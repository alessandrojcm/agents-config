# Lake-formation tables (`LAKEFORMATION_EXPLORER_PREPROD` / `LAKEFORMATION_EXPLORER_PROD`)

Iceberg tables ingested from service events. Column shapes below were read from `DESC TABLE ...MARKETING_CAMPAIGNS.CAMPAIGNS`; other schemas follow the same conventions, but run `DESC TABLE` to confirm before writing a query.

## Conventions

- `YYYYMMDD NUMBER` — daily partition. Filter on it whenever the event date is known: `WHERE YYYYMMDD = 20260907`.
- `VERSION NUMBER` — epoch **milliseconds** of ingestion. Convert with `TO_TIMESTAMP_NTZ(VERSION/1000)`; the result is UTC. `MAX(VERSION)` over the table is the **ingestion watermark**.
- `CREATED_AT`, `UPDATED_AT`, and the `TRIGGER.*_at` fields are `OBJECT(seconds NUMBER, nanos NUMBER)` protobuf timestamps. Read with `TO_TIMESTAMP_NTZ(CREATED_AT:seconds::NUMBER)` and alias to something other than `CREATED_AT`.
- `SENDER`, `AUDIENCE`, `CONTENT_TEMPLATE`, `CONFIG` are `OBJECT`s: `SENDER:restaurant_guid::STRING`. Management-set-level campaigns have `SENDER:restaurant_guid = null`, so filter by `MANAGEMENT_SET_GUID` rather than restaurant when the sender may be the set.
- `CUSTOMPROPERTIES VARCHAR` holds a JSON string (tags, `recommendationId`, `jobGenerationGuid`). Search it with `ILIKE '%<literal>%'`, or `PARSE_JSON(CUSTOMPROPERTIES):tags`.
- `TYPEOF()` rejects these structured `OBJECT` columns; use `DESC TABLE` for types.

## Watermark check

Run this alongside any identifier lookup that returns `[]`:

```sql
SELECT TO_TIMESTAMP_NTZ(MAX(VERSION)/1000) AS latest_ingested_utc,
       MAX(YYYYMMDD) AS latest_partition,
       COUNT_IF(CUSTOMPROPERTIES ILIKE '%<job-or-tag-literal>%') AS matching_rows
FROM <TABLE>
```

Compare `latest_ingested_utc` to the event's UTC time from the logs. Watermark before event → *not ingested yet*, say so and stop. Watermark after event and `matching_rows = 0` → the record did not reach the lake.

## `MARKETING_CAMPAIGNS` schema

Tables: `CAMPAIGNS` (one row per campaign version), `CAMPAIGN_SENDS`, `CONTENTS`, `CAMPAIGN_EXTERNAL_REFERENCES`, `SEGMENTATIONS`, `USAGE`, `USAGE_SUMMARY`, plus `*DF` attribution tables. Campaign lookup by identifier:

```sql
SELECT YYYYMMDD, CAMPAIGN_GUID, NAME, CHANNEL, MANAGEMENT_SET_GUID, CUSTOMPROPERTIES,
       TO_TIMESTAMP_NTZ(CREATED_AT:seconds::NUMBER) AS created_utc,
       TO_TIMESTAMP_NTZ(VERSION/1000)               AS ingested_utc
FROM CAMPAIGNS
WHERE CAMPAIGN_GUID = '<guid>' OR CUSTOMPROPERTIES ILIKE '%<jobGenerationGuid>%'
ORDER BY VERSION DESC
```
