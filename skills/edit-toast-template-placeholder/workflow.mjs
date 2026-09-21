export const GALLERY_URL =
  'https://preprod.eng.toasttab.com/restaurants/admin/marketing/template-gallery'

const MARKER_NAME_PATTERN = /^[A-Z][A-Z0-9_]*$/

function requireValue(name, value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${name} must be a non-empty string`)
  }

  return value.trim()
}

export function templateGuidFromUrl(url) {
  const parsed = new URL(requireValue('url', url))
  const templateGuid = parsed.searchParams.get('templateGuid')

  if (!templateGuid) {
    throw new Error(`URL does not contain templateGuid: ${parsed.toString()}`)
  }

  return templateGuid
}

export function templateEditorUrl({
  templateGuid,
  galleryUrl = GALLERY_URL,
}) {
  const guid = requireValue('templateGuid', templateGuid)
  const base = requireValue('galleryUrl', galleryUrl).replace(/\/$/, '')

  return `${base}/manager/edit/${encodeURIComponent(guid)}`
}

export async function clickUseTemplate({
  page,
  templateName,
  timeout = 15_000,
}) {
  const name = requireValue('templateName', templateName)
  const heading = page.getByRole('heading', { name, exact: true })
  const card = page.locator('li').filter({ has: heading })
  const cardCount = await card.count()

  if (cardCount !== 1) {
    throw new Error(
      `Expected exactly one template card titled "${name}", found ${cardCount}`,
    )
  }

  await card.hover()
  const button = card.getByRole('button', { name: /^Use template$/i })
  await button.waitFor({ state: 'visible', timeout })

  const editorNavigation = page.waitForURL(
    (nextUrl) => nextUrl.searchParams.has('templateGuid'),
    { timeout },
  )
  await button.click()
  await editorNavigation

  const templateGuid = templateGuidFromUrl(page.url())
  return { templateGuid, url: page.url() }
}

export async function openManagerEditor({
  page,
  templateGuid,
  timeout = 15_000,
}) {
  const url = templateEditorUrl({ templateGuid })
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout })
  return { templateGuid, url: page.url() }
}

export async function inspectExtractionState({ page }) {
  const extractButton = page.getByRole('button', { name: /^Extract copy$/i })
  const available =
    (await extractButton.count()) > 0 && (await extractButton.first().isVisible())
  const placeholderCount = await page
    .locator('[data-testid^="placeholder-card-"]')
    .count()

  return {
    available,
    placeholderCount,
    reason: available
      ? 'extract-copy-available'
      : placeholderCount > 0
        ? 'placeholders-already-present'
        : 'no-extractable-copy',
  }
}

export async function extractCopy({ page, timeout = 10_000 }) {
  const state = await inspectExtractionState({ page })
  if (!state.available) {
    return { extracted: false, reason: state.reason }
  }

  await page.getByRole('button', { name: /^Extract copy$/i }).click()
  const cards = page.locator('[data-testid^="placeholder-card-"]')
  await cards.first().waitFor({ state: 'visible', timeout })

  return { extracted: true, placeholderCount: await cards.count() }
}

export async function listPlaceholderCards({ page }) {
  const cards = page.locator('[data-testid^="placeholder-card-"]')
  const result = []

  for (let index = 0; index < (await cards.count()); index += 1) {
    const card = cards.nth(index)
    const input = card.locator('input[id^="marker-name-"]').first()
    const previewButton = card.locator('button[aria-label]').first()
    const locatable = (await previewButton.count()) > 0

    result.push({
      name: await input.inputValue(),
      summary: locatable
        ? (await previewButton.innerText()).trim()
        : (await card.innerText()).trim(),
      locatable,
    })
  }

  return result
}

export async function highlightPlaceholder({ page, name, timeout = 10_000 }) {
  const markerName = requireValue('name', name)
  const card = page.getByTestId(`placeholder-card-${markerName}`)
  await card.waitFor({ state: 'visible', timeout })
  const previewButton = card.locator('button[aria-label]').first()

  if ((await previewButton.count()) === 0) {
    return { highlighted: false, reason: 'placeholder-is-not-locatable' }
  }

  await previewButton.click()
  return { highlighted: true, name: markerName }
}

export function validateRenamePlan({ currentNames, plan }) {
  if (!Array.isArray(currentNames) || !Array.isArray(plan)) {
    throw new TypeError('currentNames and plan must be arrays')
  }

  const expected = new Set(currentNames)
  const sources = new Set()
  const targets = new Set()

  for (const entry of plan) {
    const from = requireValue('plan.from', entry?.from)
    const to = requireValue('plan.to', entry?.to)

    if (!expected.has(from)) {
      throw new Error(`Rename plan contains unknown source placeholder: ${from}`)
    }
    if (sources.has(from)) {
      throw new Error(`Rename plan contains source more than once: ${from}`)
    }
    if (from === to) {
      throw new Error(`Every placeholder must receive a new name: ${from}`)
    }
    if (!MARKER_NAME_PATTERN.test(to)) {
      throw new Error(`Invalid placeholder name: ${to}`)
    }
    if (targets.has(to)) {
      throw new Error(`Rename targets must be unique: ${to}`)
    }

    sources.add(from)
    targets.add(to)
  }

  const missing = currentNames.filter((name) => !sources.has(name))
  if (missing.length > 0 || plan.length !== currentNames.length) {
    throw new Error(
      `Rename plan must cover every placeholder exactly once; missing: ${missing.join(', ') || 'none'}`,
    )
  }

  return { valid: true, count: plan.length }
}

export async function renamePlaceholder({ page, from, to, timeout = 10_000 }) {
  const currentKey = requireValue('from', from)
  const replacementKey = requireValue('to', to)

  validateRenamePlan({
    currentNames: [currentKey],
    plan: [{ from: currentKey, to: replacementKey }],
  })

  if ((await page.getByTestId(`placeholder-card-${replacementKey}`).count()) > 0) {
    throw new Error(`Placeholder name is already in use: ${replacementKey}`)
  }

  const card = page.getByTestId(`placeholder-card-${currentKey}`)
  await card.waitFor({ state: 'visible', timeout })
  const input = card.locator('input[id^="marker-name-"]').first()
  await input.click({ clickCount: 3 })
  await input.fill(replacementKey)
  await input.press('Tab')

  await page
    .getByTestId(`placeholder-card-${replacementKey}`)
    .waitFor({ state: 'visible', timeout })

  return { from: currentKey, to: replacementKey }
}

export async function saveTemplate({ page, timeout = 10_000 }) {
  const button = page.getByRole('button', { name: /^Save template$/i })
  await button.waitFor({ state: 'visible', timeout })
  await button.click()
  return { saveRequested: true }
}

export async function waitForSaveSuccess({ page, timeout = 15_000 }) {
  const success = page.getByText(/^Success$/, { exact: true }).last()
  await success.waitFor({ state: 'visible', timeout })
  return { saved: true, message: await success.innerText() }
}
