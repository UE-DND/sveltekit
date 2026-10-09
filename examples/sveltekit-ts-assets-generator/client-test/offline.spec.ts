import { expect, test } from '@playwright/test'
// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore
import { generateSW } from '../pwa.mjs'

test('Test offline and trailing slashes', async ({ browser }) => {
  // test offline + trailing slashes routes
  const context = await browser.newContext()
  const offlinePage = await context.newPage()
  await offlinePage.goto('/')
  const offlineSwURL = await offlinePage.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    return registration.active?.scriptURL
  })
  const offlineSwName = generateSW ? 'sw.js' : 'prompt-sw.js'
  expect(offlineSwURL).toBe(`http://localhost:4173/${offlineSwName}`)
  // An activated worker controls a new navigation even without clientsClaim.
  await offlinePage.reload()
  await offlinePage.waitForFunction(() => !!navigator.serviceWorker.controller)
  await context.setOffline(true)
  const aboutAnchor = offlinePage.getByRole('link', { name: 'About' })
  expect(await aboutAnchor.getAttribute('href')).toBe('/about')
  await aboutAnchor.click({ noWaitAfter: false })
  await expect(offlinePage).toHaveURL('http://localhost:4173/about')
  await expect(offlinePage.getByRole('heading', { name: 'About this app' })).toBeVisible()
  await offlinePage.reload({ waitUntil: 'load' })
  expect(offlinePage.url()).toBe('http://localhost:4173/about')
  await expect(offlinePage.getByRole('heading', { name: 'About this app' })).toBeVisible()
  // Dispose context once it's no longer needed.
  await context.close()
})
