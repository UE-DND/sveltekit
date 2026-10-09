import type { VitePWAOptions } from 'vite-plugin-pwa'

export interface KitOptions {
  /**
   * The base path for your application: by default will use SvelteKit's `paths.base`.
   *
   * @default `${kit.paths.base}/`
   * @see https://kit.svelte.dev/docs/configuration#paths
   */
  base?: string

  /**
   * The static folder for your application.
   *
   * @default SvelteKit's `files.assets`, 'static'
   * @see https://kit.svelte.dev/docs/configuration#files
   */
  assets?: string

  /**
   * @default SvelteKit's `outDir`, '.svelte-kit'
   * @see https://kit.svelte.dev/docs/configuration#outdir
   */
  outDir?: string

  /**
   * @see https://kit.svelte.dev/docs/adapter-static#options-fallback
   */
  adapterFallback?: string

  /**
   * Check your SvelteKit version, `trailingSlash` should be used in `+page[jt]s` files or `+layout.[jt]s.
   * @default 'never'
   */
  trailingSlash?: 'never' | 'always' | 'ignore'

  /**
   * @default SvelteKit's `appDir`, `_app`
   * @see https://kit.svelte.dev/docs/configuration#appdir
   */
  appDir?: string

  /**
   * Include `${appDir}/version.json` in the service worker precache manifest?
   *
   * @default false
   */
  includeVersionFile?: boolean

  /**
   * Enable SPA mode for the application.
   *
   * By default, the plugin will use `adapterFallback` to include the entry in the service worker
   * precache manifest.
   *
   * If you are using a logical name for the fallback, you can use the object syntax with the
   * `fallbackMapping`.
   *
   * For example, if you're using `fallback: 'app.html'` in your static adapter and your server
   * is redirecting to `/app`, you can configure `fallbackMapping: '/app'`.
   *
   * Since the static adapter will run after the PWA plugin generates the service worker,
   * the PWA plugin doesn't have access to the adapter fallback page to include the revision in the
   * service worker precache manifest.
   * To generate the revision for the fallback page, the PWA plugin will use the
   * `.svelte-kit/output/client/_app/version.json` file.
   * You can configure the `fallbackRevision` to generate a custom revision.
   *
   * @see https://svelte.dev/docs/kit/single-page-apps
   */
  spa?: true | {
    fallbackMapping?: string
    fallbackRevision?: () => Promise<string>
  }
}

export interface SvelteKitPWAOptions extends Partial<VitePWAOptions> {
  kit?: KitOptions
}
