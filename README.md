<p align='center'>
<img src='./hero.png' alt="@vite-pwa/sveltekit - Zero-config PWA for SvelteKit"><br>
Zero-config PWA Plugin for SvelteKit
</p>

<p align='center'>
<a href='https://www.npmjs.com/package/@vite-pwa/sveltekit' target="__blank">
<img src='https://img.shields.io/npm/v/@vite-pwa/sveltekit?color=33A6B8&label=' alt="NPM version">
</a>
<a href="https://www.npmjs.com/package/@vite-pwa/sveltekit" target="__blank">
    <img alt="NPM Downloads" src="https://img.shields.io/npm/dm/@vite-pwa/sveltekit?color=476582&label=">
</a>
<a href="https://vite-pwa-org.netlify.app/frameworks/sveltekit" target="__blank">
    <img src="https://img.shields.io/static/v1?label=&message=docs%20%26%20guides&color=2e859c" alt="Docs & Guides">
</a>
<br>
<a href="https://github.com/vite-pwa/sveltekit" target="__blank">
<img alt="GitHub stars" src="https://img.shields.io/github/stars/vite-pwa/sveltekit?style=social">
</a>
</p>

<br>

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## 🚀 Features

- 📖 [**Documentation & guides**](https://vite-pwa-org.netlify.app/)
- 👌 **Zero-Config**: sensible built-in default configs for common use cases
- 🔩 **Extensible**: expose the full ability to customize the behavior of the plugin
- 🦾 **Type Strong**: written in [TypeScript](https://www.typescriptlang.org/)
- 🔌 **Offline Support**: generate service worker with offline support (via Workbox)
- ⚡ **Fully tree shakable**: auto inject Web App Manifest
- 💬 **Prompt for new content**: built-in support for Vanilla JavaScript, Vue 3, React, Svelte, SolidJS and Preact
- ⚙️ **Stale-while-revalidate**: automatic reload when new content is available
- ✨ **Static assets handling**: configure static assets for offline support
- 🐞 **Development Support**: debug your custom service worker logic as you develop your application
- 🛠️ **Versatile**: integration with meta frameworks: [îles](https://github.com/ElMassimo/iles), [SvelteKit](https://github.com/sveltejs/kit), [VitePress](https://github.com/vuejs/vitepress), [Astro](https://github.com/withastro/astro), [Nuxt 3](https://github.com/nuxt/nuxt) and [Remix](https://github.com/remix-run/remix)
- 💥 **PWA Assets Generator**: generate all the PWA assets from a single command and a single source image
- 🚀 **PWA Assets Integration**: serving, generating and injecting PWA Assets on the fly in your application

## 📦 Install

> This Kit 3 branch (based on [upstream PR #111](https://github.com/vite-pwa/sveltekit/pull/111)) requires **SvelteKit 3**, **Vite 8** and **`vite-plugin-pwa` 2**: use the published upstream v1 for SvelteKit 1 and 2. This fork has not been published to npm. The plugin options are unchanged, and `kit.base`, `kit.outDir`, `kit.assets` and `kit.appDir` now default to your SvelteKit configuration.

> From v0.3.0, `@vite-pwa/sveltekit` supports SvelteKit 2 (should also support SvelteKit 1).

> From v0.2.0, `@vite-pwa/sveltekit` requires **SvelteKit 1.3.1 or above**.

```bash
npm i @vite-pwa/sveltekit -D

# yarn
yarn add @vite-pwa/sveltekit -D

# pnpm
pnpm add @vite-pwa/sveltekit -D
```

## 🦄 Usage

Add `SvelteKitPWA` plugin to `vite.config.js / vite.config.ts` and configure it:

```ts
// vite.config.js / vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite'
import { SvelteKitPWA } from '@vite-pwa/sveltekit'

export default {
  plugins: [
    sveltekit({ serviceWorker: { register: false } }),
    SvelteKitPWA()
  ]
}
```

For `injectManifest`, configure the source entry through SvelteKit as well as the PWA plugin:

```ts
sveltekit({
  serviceWorker: { register: false },
  files: { serviceWorker: 'src/prompt-sw.ts' },
})
SvelteKitPWA({ strategies: 'injectManifest', srcDir: 'src', filename: 'prompt-sw.ts' })
```

SvelteKit builds the custom worker; this plugin injects its precache manifest before the adapter copies the output. Import `virtual:pwa-register` (or `virtual:pwa-register/svelte`) from client code to register it. Kit 3 configuration lives in `vite.config.ts`; `svelte.config.js` is no longer supported. Node.js 22.17 or later is required.

Read the [📖 documentation](https://vite-pwa-org.netlify.app/frameworks/sveltekit) for a complete guide on how to configure and use
this plugin.

## 👀 Full config

Check out the type declaration [src/types.ts](./src/types.ts) and the following links for more details.

- [Web app manifests](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Workbox](https://developers.google.com/web/tools/workbox)

## 📄 License

[MIT](./LICENSE) License &copy; 2022-PRESENT [Anthony Fu](https://github.com/antfu)
