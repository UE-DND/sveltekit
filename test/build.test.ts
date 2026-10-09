import type { Plugin, ResolvedConfig } from 'vite'
import type { VitePluginPWAAPI, VitePWAOptions } from 'vite-plugin-pwa'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it, vi } from 'vitest'
import { SvelteKitPlugin } from '../src/plugins/SvelteKitPlugin'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function fixture(options: Partial<VitePWAOptions> = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kit-pwa-build-'))
  roots.push(root)
  options.outDir = root
  if (options.injectManifest)
    options.injectManifest.globDirectory ??= root
  const generateSW = vi.fn(async () => {
    const name = (options.filename ?? 'service-worker.js').replace(/\.ts$/, '.js')
    await writeFile(join(root, name), 'self-destroying-worker')
  })
  const api = { generateSW, disabled: false } as unknown as VitePluginPWAAPI
  const plugin = SvelteKitPlugin(options, () => api)
  await hook(plugin, 'configResolved', undefined, { root, logLevel: 'silent' } as ResolvedConfig)
  return { root, plugin, generateSW }
}

async function hook(plugin: Plugin, name: keyof Plugin, environment: string | undefined, ...args: unknown[]) {
  const value = plugin[name]
  const handler = typeof value === 'function' ? value : (value as { handler: (this: unknown, ...args: unknown[]) => unknown }).handler
  return handler.call({ environment: { name: environment } }, ...args)
}

it.each(['service-worker.js', 'prompt-sw.ts'])('keeps the self-destroying worker after Kit builds %s', async (filename) => {
  const { root, plugin, generateSW } = await fixture({ strategies: 'injectManifest', selfDestroying: true, filename })
  await hook(plugin, 'buildApp', undefined)
  await writeFile(join(root, 'service-worker.js'), 'kit-overwrite')
  await hook(plugin, 'closeBundle', 'serviceWorker')
  expect(generateSW).toHaveBeenCalledTimes(2)
  expect(await readFile(join(root, filename.replace(/\.ts$/, '.js')), 'utf8')).toBe('self-destroying-worker')
  if (filename !== 'service-worker.js')
    await expect(readFile(join(root, 'service-worker.js'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('injects real Workbox precache entries before renaming the Kit worker', async () => {
  const { root, plugin } = await fixture({
    strategies: 'injectManifest',
    filename: 'prompt-sw.ts',
    injectManifest: { globPatterns: ['*.html'] },
  })
  await writeFile(join(root, 'index.html'), '<h1>offline</h1>')
  await writeFile(join(root, 'service-worker.js'), 'const precache = self.__WB_MANIFEST;')
  await hook(plugin, 'closeBundle', 'client')
  expect(await readFile(join(root, 'service-worker.js'), 'utf8')).toContain('self.__WB_MANIFEST')
  await hook(plugin, 'closeBundle', 'serviceWorker')
  expect(await readFile(join(root, 'prompt-sw.js'), 'utf8')).toContain('index.html')
  await expect(readFile(join(root, 'service-worker.js'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('supports workers without a precache injection point', async () => {
  const { root, plugin } = await fixture({ strategies: 'injectManifest', filename: 'custom.ts', injectManifest: { injectionPoint: undefined } })
  await writeFile(join(root, 'service-worker.js'), 'custom-worker')
  await hook(plugin, 'closeBundle', 'serviceWorker')
  expect(await readFile(join(root, 'custom.js'), 'utf8')).toBe('custom-worker')
})

it('generates generateSW before adaptation and ignores other environment close hooks', async () => {
  const { plugin, generateSW } = await fixture()
  await hook(plugin, 'buildApp', undefined)
  await hook(plugin, 'closeBundle', 'ssr')
  await hook(plugin, 'closeBundle', 'client')
  expect(generateSW).toHaveBeenCalledOnce()
})
