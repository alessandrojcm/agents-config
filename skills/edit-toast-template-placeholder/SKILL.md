---
name: edit-toast-template-placeholder
description: Discover a Toast marketing template GUID from Use template, extract baked copy when available, assign relevant names to every generated placeholder, and save the template in preprod. Use when a user asks to prepare or improve Template Gallery manager placeholders.
---

# Name all placeholders in a Toast marketing template

Use this workflow to replace automatically generated names such as `TEXT_1` and
`IMAGE_2` with names that explain each placeholder's role in the email.

## Input

Get the exact template title from the user. Discover its GUID through the
gallery workflow; do not ask the user to find the GUID manually and do not infer
it from the template title.

Saving mutates preprod. Use a dedicated Playwriter session and keep each browser
interaction in the Playwriter **observe → act → observe** loop.

## 1. Discover the template GUID

Load the `playwriter` skill and run `playwriter skill` first if its full output
has not been read in this session. Create a session and open the gallery:

```bash
playwriter session new --tab-group template
```

```bash
playwriter -s <session> -e 'state.workflow = await import(process.env.HOME + "/.agents/skills/edit-toast-template-placeholder/workflow.mjs"); state.templateName = "<exact template title>"; state.page = context.pages().findLast((p) => p.url() === "about:blank") ?? (await context.newPage()); await state.page.goto(state.workflow.GALLERY_URL, { waitUntil: "domcontentloaded" }); await waitForPageLoad({ page: state.page, timeout: 10000 }); console.log("URL:", state.page.url()); console.log("Page logs:", await getLatestLogs({ page: state.page, sinceLastCall: true })); console.log(await snapshot({ page: state.page, showDiffSinceLastCall: false }));'
```

Find the card whose heading exactly matches `state.templateName`. Call
`state.workflow.clickUseTemplate({ page: state.page, templateName: state.templateName })`.
The helper hovers that card, clicks its **Use template** button, waits for the
email editor URL, and returns its `templateGuid`. Store the result in
`state.templateGuid`, then observe the resulting URL and page logs.

## 2. Open the manager editor

Call
`state.workflow.openManagerEditor({ page: state.page, templateGuid: state.templateGuid })`.
Observe and verify that the manager URL ends in
`/template-gallery/manager/edit/<templateGuid>` and that the page title matches
the selected template.

## 3. Apply the extraction gate

Call `state.workflow.inspectExtractionState({ page: state.page })`.

- **Extract copy unavailable:** stop. Leave the template unchanged; do not
  rename, save, or otherwise modify it. Report that it was already marked or had
  no extractable copy.
- **Extract copy available:** call
  `state.workflow.extractCopy({ page: state.page })`, then observe. Continue only
  when placeholder cards appear in the left rail.

This gate is strict: the remainder of the workflow only applies to placeholders
created by the current **Extract copy** action.

## 4. Inspect every generated placeholder

Call `state.workflow.listPlaceholderCards({ page: state.page })` and store the
returned array in `state.placeholders`. Every returned name must receive a new,
unique name.

For each card, one at a time:

1. Read its content summary from `state.placeholders`.
2. Call
   `state.workflow.highlightPlaceholder({ page: state.page, name: "<current name>" })`.
3. Observe the snapshot. Because placement in the rendered email matters, take
   a screenshot after the snapshot and inspect the highlighted preview element:

   ```bash
   playwriter -s <session> -e 'const path = process.env.TMPDIR + "/toast-placeholder-highlight.png"; await state.page.screenshot({ path, scale: "css" }); await resizeImageForAgent({ input: path }); console.log("URL:", state.page.url()); console.log("Page logs:", await getLatestLogs({ page: state.page, sinceLastCall: true }));'
   ```

4. Choose a name from the placeholder's meaning, element type, and location.
   Use uppercase snake case matching `^[A-Z][A-Z0-9_]*$`.

Prefer semantic roles over coordinates or extraction order. Examples:

- online-version text/link → `ONLINE_VERSION_LINK`
- small text above the hero heading → `HERO_EYEBROW`
- main hero title → `HERO_HEADING`
- main image → `HERO_IMAGE`
- primary paragraph → `BODY_COPY`
- button text → `PRIMARY_CTA_LABEL`
- button destination → `PRIMARY_CTA_LINK`
- secondary section heading → `SECONDARY_HEADING`

Use content-specific names when the copy has a clear purpose, such as
`EVENT_DATE`, `DISCOUNT_AMOUNT`, or `LOCATION_NAME`. Add section qualifiers only
to disambiguate repeated roles. Names such as `TOP_TEXT`, `COPY_1`, and
`LEFT_IMAGE` merely restate layout or extraction order and are not relevant
placeholder names.

Build `state.renamePlan` as an array of `{ from, to }` entries. Call
`state.workflow.validateRenamePlan({ currentNames: state.placeholders.map((item) => item.name), plan: state.renamePlan })`.
Completion requires every original card exactly once, every target name unique,
and every target different from its generated source name.

Platform-managed markers such as `PERMALINK` and `UNSUB_LINK_EN` are excluded by
the manager UI and remain untouched. If an unused card cannot be highlighted,
use its displayed value and context; do not invent a visual location.

## 5. Rename and save

Apply one plan entry per Playwriter call with
`state.workflow.renamePlaceholder({ page: state.page, from, to })`. The helper
clicks the name input before filling and tabs away so the Formik `onBlur` rename
is committed. Observe after every rename and confirm the card changes to the
new name while its content stays the same.

If **Extract copy** was clicked, saving is mandatory. Do not finish after the
renames or leave the edits only in browser state.

After all entries are applied:

1. Call `listPlaceholderCards` again.
2. Verify the card count is unchanged, every target name is present, and none of
   the original generated names remain.
3. Verify the URL still contains `state.templateGuid`.
4. Take a fresh full snapshot.
5. Call `saveTemplate`, then `waitForSaveSuccess`, and observe once more.

Click **Save template** exactly once after all checks pass. The workflow is
complete only after the green **Success** notification appears.
Report the discovered template GUID and the complete rename mapping. If a check
fails, leave the page open and report the failed check rather than saving again.
