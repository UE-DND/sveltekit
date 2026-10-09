import type { ResolvedConfig } from 'vite'
import type { VitePWAOptions } from 'vite-plugin-pwa'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { configureSvelteKitOptions } from '../src/config'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

function config(root = '/app'): ResolvedConfig {
  return {
    root,
    base: './',
    plugins: [{
      name: 'vite-plugin-sveltekit-setup',
      api: { options: {
        outDir: '.kit',
        appDir: 'assets',
        paths: { base: '/nested' },
        files: { assets: 'public' },
      } },
    }],
  } as unknown as ResolvedConfig
}

describe('svelteKit 3 configuration', () => {
  it('uses the deployed Kit base for registration and navigation', () => {
    const options: Partial<VitePWAOptions> = {}
    configureSvelteKitOptions({}, config(), options)
    expect(options.base).toBe('/nested/')
    expect(options.workbox?.navigateFallback).toBe('/nested/')
    expect(options.outDir).toBe('/app/.kit/output/client')
    expect(options.workbox?.dontCacheBustURLsMatching?.test('assets/immutable/a.js')).toBe(true)
  })

  it('preserves explicit PWA base and Workbox overrides', () => {
    const options: Partial<VitePWAOptions> = {
      base: '/custom/',
      workbox: { navigateFallback: null, globDirectory: '/custom-output' },
    }
    configureSvelteKitOptions({}, config(), options)
    expect(options.base).toBe('/custom/')
    expect(options.workbox?.navigateFallback).toBeNull()
    expect(options.workbox?.globDirectory).toBe('/custom-output')
  })

  it('uses one custom output directory for the worker, precache and generated icons', () => {
    const options: Partial<VitePWAOptions> = { strategies: 'injectManifest', pwaAssets: { config: true } }
    configureSvelteKitOptions({ includeVersionFile: true }, config(), options, 'output')
    expect(options.outDir).toBe('/app/output/client')
    expect(options.injectManifest?.globDirectory).toBe('/app/output')
    expect(options.injectManifest?.globPatterns).toContain('client/assets/version.json')
    expect(options.pwaAssets?.integration).toEqual({
      baseUrl: '/nested/',
      publicDir: '/app/public',
      outDir: '/app/output/client',
    })
  })

  it('maps prerendered routes and excludes server and unused fallback assets', async () => {
    const options: Partial<VitePWAOptions> = {}
    configureSvelteKitOptions({ trailingSlash: 'always' }, config(), options)
    const transform = options.workbox!.manifestTransforms![0]
    const result = await transform([
      { url: 'client/assets/immutable/a.js', revision: null, size: 1 },
      { url: 'prerendered/pages/index.html', revision: 'root', size: 1 },
      { url: 'prerendered/pages/about/index.html', revision: 'about', size: 1 },
      { url: 'prerendered/fallback.html', revision: 'fallback', size: 1 },
      { url: 'client/manifest.webmanifest', revision: 'manifest', size: 1 },
    ])
    expect(result.manifest.map(entry => entry.url)).toEqual(['assets/immutable/a.js', '/nested/', 'about/'])
    expect(options.workbox?.globIgnores).toContain('server/**')
  })

  it('reads SPA fallback revisions from the configured appDir', async () => {
    const root = await mkdtemp(join(tmpdir(), 'kit-pwa-'))
    roots.push(root)
    await mkdir(join(root, '.kit/output/client/assets'), { recursive: true })
    await writeFile(join(root, '.kit/output/client/assets/version.json'), '{"version":"test"}')
    const options: Partial<VitePWAOptions> = {}
    configureSvelteKitOptions({ spa: true, adapterFallback: 'fallback.html' }, config(root), options)
    const result = await options.workbox!.manifestTransforms![0]([])
    expect(result.manifest).toEqual([{ url: 'fallback.html', revision: expect.stringMatching(/^[a-f0-9]{32}$/), size: 0 }])
  })
})
