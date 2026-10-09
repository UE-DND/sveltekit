import type { Plugin, ResolvedConfig } from 'vite'
import type { VitePluginPWAAPI, VitePWAOptions } from 'vite-plugin-pwa'
import { lstat, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * SvelteKit 3 builds every Vite environment from its own `buildApp` hooks, in this order:
 *
 * 1. `vite-plugin-sveltekit-compile` (normal order): ssr build, client build and prerendering.
 * 2. `vite-plugin-sveltekit-adapter` (`post` order): kit's service worker build, then the adapter.
 *
 * The service worker must be generated between both: after prerendering, so the precache manifest
 * includes the prerendered pages, and before the adapter, so the adapter copies it with the rest of
 * the client output.
 *
 * - `generateSW`: a normal order `buildApp` hook, `enforce: 'post'` keeps it after SvelteKit's one.
 * - `injectManifest`: kit builds the service worker in step 2, the manifest is injected from the
 *   `serviceWorker` environment `closeBundle` hook, before the adapter runs.
 */
export function SvelteKitPlugin(
  options: Partial<VitePWAOptions>,
  apiResolver: () => VitePluginPWAAPI | undefined,
) {
  let viteConfig: ResolvedConfig
  return <Plugin>{
    name: 'vite-plugin-pwa:sveltekit:build',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      viteConfig = config
    },
    async generateBundle(_, bundle) {
      // generate only for client: kit's serviceWorker environment is also a client consumer
      if (this.environment.name !== 'client')
        return

      const api = apiResolver()
      if (!api)
        return

      const assetsGenerator = await api.pwaAssetsGenerator()
      if (assetsGenerator)
        assetsGenerator.injectManifestIcons()

      // vite-plugin-pwa's API is typed with Rollup's types, Vite 8 bundles with Rolldown
      type GenerateBundle = Parameters<VitePluginPWAAPI['generateBundle']>
      api.generateBundle(bundle as unknown as GenerateBundle[0], this as unknown as GenerateBundle[1])
    },
    writeBundle: {
      sequential: true,
      async handler() {
        if (this.environment.name !== 'client')
          return

        const api = apiResolver()
        if (!api)
          return

        const assetsGenerator = await api.pwaAssetsGenerator()
        if (assetsGenerator)
          await assetsGenerator.generate()
      },
    },
    async buildApp() {
      const api = apiResolver()
      if (!api || api.disabled)
        return

      if (!options.strategies || options.strategies === 'generateSW' || options.selfDestroying)
        await api.generateSW()
    },
    closeBundle: {
      sequential: true,
      async handler() {
        if (this.environment.name !== 'serviceWorker')
          return

        const api = apiResolver()
        if (!api || api.disabled || options.strategies !== 'injectManifest')
          return

        const clientOutputDir = options.outDir ?? join(viteConfig.root, '.svelte-kit/output/client')
        // kit fixes sw name to 'service-worker.js'
        const kitSW = join(clientOutputDir, 'service-worker.js').replace(/\\/g, '/')

        // the self-destroying service worker was generated in the buildApp hook: remove kit's one
        if (options.selfDestroying) {
          if (await isFile(kitSW))
            await rm(kitSW)

          return
        }

        let swName = options.filename ?? 'sw.js'
        if (swName.endsWith('.ts'))
          swName = swName.replace(/\.ts$/, '.js')

        const injectionPoint = !options.injectManifest || !('injectionPoint' in options.injectManifest) || !!options.injectManifest.injectionPoint

        const { logWorkboxResult } = await import('./log')
        if (injectionPoint) {
          const { injectManifest } = await import('workbox-build')
          // inject the manifest
          const buildResult = await injectManifest({
            ...options.injectManifest,
            globDirectory: options.injectManifest!.globDirectory!,
            swSrc: kitSW,
            swDest: kitSW,
          })
          logWorkboxResult('injectManifest', viteConfig, buildResult)
        }
        else {
          logWorkboxResult('injectManifest', viteConfig)
        }

        if (swName !== 'service-worker.js')
          await rename(kitSW, join(clientOutputDir, swName).replace(/\\/g, '/'))
      },
    },
  }
}

async function isFile(path: string) {
  try {
    const stats = await lstat(path)
    return stats.isFile()
  }
  catch {
    return false
  }
}
