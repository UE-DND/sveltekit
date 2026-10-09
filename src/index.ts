import type { Plugin } from 'vite'
import type { VitePluginPWAAPI } from 'vite-plugin-pwa'
import type { SvelteKitPWAOptions } from './types'
import { VitePWA } from 'vite-plugin-pwa'
import { configureSvelteKitOptions } from './config'
import { SvelteKitPlugin } from './plugins/SvelteKitPlugin'

export function SvelteKitPWA(userOptions: Partial<SvelteKitPWAOptions> = {}): Plugin[] {
  if (!userOptions.integration)
    userOptions.integration = {}

  // `outDir` is SvelteKit's output folder (`.svelte-kit/output`), keep it: configureOptions rewrites it
  const kitOutputDir = userOptions.outDir

  userOptions.integration.closeBundleOrder = 'pre'
  userOptions.integration.configureOptions = (
    viteConfig,
    options,
  ) => configureSvelteKitOptions(
    userOptions.kit ?? {},
    viteConfig,
    options,
    kitOutputDir,
  )

  const plugins = VitePWA(userOptions)

  const plugin = plugins.find(p => p && typeof p === 'object' && 'name' in p && p.name === 'vite-plugin-pwa')
  const resolveVitePluginPWAAPI = (): VitePluginPWAAPI | undefined => {
    return plugin?.api
  }

  return [
    // remove the build plugin: we're using a custom one
    ...plugins
      .filter(p => p && typeof p === 'object' && 'name' in p && p.name !== 'vite-plugin-pwa:build')
      .map((p) => {
        // SvelteKit doesn't call transformIndexHtml hooks and warns about every plugin using one:
        // there is no index.html, the app imports the service worker registration itself.
        if ('transformIndexHtml' in p)
          delete p.transformIndexHtml
        return p
      }),
    SvelteKitPlugin(userOptions, resolveVitePluginPWAAPI),
  ]
}

export * from './types'
