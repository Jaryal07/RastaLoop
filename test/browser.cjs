const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const { performance } = require('node:perf_hooks')

const base = process.env.RASTALOOP_TEST_URL || 'http://127.0.0.1:3000'
const record = process.env.RASTALOOP_RECORD === '1'
const output = 'tmp/browser'

async function waitingForButton(page, name) {
  const button = page.getByRole('button', { name, exact: typeof name === 'string' })
  await button.waitFor()
  return button
}

async function click(page, name) {
  const button = await waitingForButton(page, name)
  if (record) {
    await button.scrollIntoViewIfNeeded()
    const box = await button.boundingBox()
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 })
  }
  await button.click()
}

async function capture(page, label) {
  await page.screenshot({ path: `${output}/${label}.png`, animations: 'disabled' })
}

async function beginRecording(page) {
  await fs.mkdir(`${output}/frames`, { recursive: true })
  const client = await page.context().newCDPSession(page)
  const frames = []
  const writes = []
  const started = performance.now()
  client.on('Page.screencastFrame', ({ data, sessionId }) => {
    const path = `${output}/frames/${String(frames.length).padStart(5, '0')}.jpg`
    frames.push({ path, seconds: (performance.now() - started) / 1000 })
    writes.push(fs.writeFile(path, data, 'base64'))
    void client.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1440, maxHeight: 900 })
  return async () => {
    await client.send('Page.stopScreencast')
    await Promise.all(writes)
    await fs.writeFile(`${output}/recording.json`, JSON.stringify({ frames, seconds: (performance.now() - started) / 1000 }))
  }
}

async function run() {
  await fs.mkdir(output, { recursive: true })
  const browser = await chromium.launch({ executablePath: process.env.RASTALOOP_CHROME_PATH, headless: true })
  try {
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await desktop.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(base)
    await page.locator('.hero-photo img').evaluate(image => image.decode())
    await page.getByRole('heading', { level: 1 }).waitFor()
    await capture(page, 'landing-desktop')
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Skip to content')
    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main')
    await page.getByRole('link', { name: 'Try the demo' }).first().click()
    const resets = page.getByRole('button', { name: 'Reset demo' })
    await resets.waitFor()
    await waitingForButton(page, /Community clinic 320 m/)
    await capture(page, 'demo-initial')
    if (record) await page.evaluate(() => {
      const cursor = document.createElement('div')
      Object.assign(cursor.style, { position: 'fixed', width: '20px', height: '20px', border: '3px solid #176958', background: '#d9ece1ad', borderRadius: '50%', pointerEvents: 'none', zIndex: '100', transform: 'translate(-50%, -50%)' })
      cursor.setAttribute('aria-hidden', 'true')
      document.body.append(cursor)
      window.addEventListener('mousemove', ({ clientX, clientY }) => { cursor.style.left = `${clientX}px`; cursor.style.top = `${clientY}px` })
    })
    const stop = record ? await beginRecording(page) : undefined
    const started = performance.now()
    const holdUntil = async seconds => { if (record) await new Promise(resolve => setTimeout(resolve, Math.max(0, seconds * 1000 - (performance.now() - started)))) }

    await holdUntil(5)
    await click(page, 'Submit report')
    await page.getByText('A matching case is already open').waitFor()
    await waitingForButton(page, /Community clinic 320 m/)
    await capture(page, 'demo-report')
    await holdUntil(11)
    await click(page, 'Add to existing case')
    await page.getByRole('status').filter({ hasText: 'Observation added' }).waitFor()
    await holdUntil(17)
    await click(page, /Reviewer Isha/)
    await click(page, 'Verify barrier')
    await waitingForButton(page, /Community clinic No surveyed step-free route/)
    await waitingForButton(page, /Market bus stop 250 m/)
    assert.match(await page.locator('.case-row').first().textContent(), /Restores step-free access to community clinic/)
    await capture(page, 'demo-verified')
    await holdUntil(27)
    await click(page, 'Steps allowed')
    await waitingForButton(page, /Community clinic 590 m/)
    await capture(page, 'demo-alternate')
    await holdUntil(32)
    await click(page, 'Step-free')
    await click(page, /Operator Dev/)
    await click(page, 'Assign maintenance')
    await holdUntil(38)
    await click(page, 'Record repair evidence')
    await waitingForButton(page, /Community clinic No surveyed step-free route/)
    await capture(page, 'demo-evidence')
    await holdUntil(45)
    await click(page, /Rechecker Noor/)
    await click(page, 'Still blocked')
    await page.getByRole('status').filter({ hasText: 'returned to the repair queue' }).waitFor()
    await capture(page, 'demo-failed')
    await holdUntil(53)
    await click(page, /Operator Dev/)
    await click(page, 'Assign maintenance')
    await click(page, 'Record repair evidence')
    await holdUntil(61)
    await click(page, /Rechecker Noor/)
    await click(page, 'Pass recheck')
    await waitingForButton(page, /Community clinic 320 m/)
    assert.match(await page.locator('.case-history').textContent(), /Passage rechecked and clear/)
    await capture(page, 'demo-restored')
    await holdUntil(70)
    if (record) await page.getByRole('heading', { name: 'Case history' }).scrollIntoViewIfNeeded()
    await holdUntil(80)
    if (stop) await stop()

    await page.reload()
    await waitingForButton(page, /Community clinic 320 m/)
    assert.equal(await page.locator('.case-row').count(), 2)
    await resets.click()
    await page.getByRole('status').filter({ hasText: 'corridor has been reset' }).waitFor()
    assert.equal(await page.locator('.case-row').count(), 1)

    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 })
    const phone = await mobile.newPage()
    await phone.goto(base)
    await phone.locator('.hero-photo img').evaluate(image => image.decode())
    await capture(phone, 'landing-mobile')
    await phone.goto(`${base}/demo`)
    await waitingForButton(phone, /Community clinic 320 m/)
    assert.equal(await phone.locator('.case-row').count(), 1)
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth), 390)
    await capture(phone, 'demo-mobile')
    assert.deepEqual(errors, [])
    console.log('Passed desktop workflow, keyboard skip link, recheck, persistence, reset, and mobile isolation checks.')
  } finally {
    await browser.close()
  }
}

run().catch(error => { console.error(error); process.exitCode = 1 })
