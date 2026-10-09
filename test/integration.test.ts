import type { VitePWAOptions } from 'vite-plugin-pwa'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

const exec = promisify(execFile)

it.each(['generateSW', 'injectManifest', 'selfDestroying'] as const)('builds a real Kit 3 app with custom paths: %s', async (strategy) => {
  const root = await mkdtemp(join(tmpdir(), 'kit-pwa-integration-'))
  try {
    await mkdir(join(root, 'src/routes/about'), { recursive: true })
    await mkdir(join(root, 'static'))
    await mkdir(join(root, 'node_modules'))
    // Keep Kit's generated $app package local to this fixture.
    for (const name of ['svelte', '@sveltejs', 'vite', 'workbox-window'])
      await symlink(resolve('node_modules', name), join(root, 'node_modules', name))
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'kit-pwa-fixture', type: 'module', private: true }))
    await writeFile(join(root, 'src/app.html'), '<!doctype html><html><head>%sveltekit.head%</head><body><div>%sveltekit.body%</div></body></html>')
    await writeFile(join(root, 'src/routes/+layout.ts'), 'export const prerender = true;')
    await writeFile(join(root, 'src/routes/+page.svelte'), `<script>
      import { onMount } from 'svelte';
      import { registerSW } from 'virtual:pwa-register';
      onMount(() => { registerSW({ immediate: true }); });
    </script><h1>Home</h1><a href="/nested/about">About</a>`)
    await writeFile(join(root, 'src/routes/about/+page.svelte'), '<h1>About</h1>')
    if (strategy !== 'generateSW')
      await writeFile(join(root, 'src/service-worker.ts'), 'const precache = self.__WB_MANIFEST; console.log(precache);')
    const options: Partial<VitePWAOptions> = {
      strategies: strategy === 'generateSW' ? 'generateSW' : 'injectManifest',
      selfDestroying: strategy === 'selfDestroying',
      manifest: { name: 'Kit 3 fixture' },
    }
    await writeFile(join(root, 'vite.config.mjs'), `
      import adapter from ${JSON.stringify(resolve('node_modules/@sveltejs/adapter-static/index.js'))};
      import { sveltekit } from ${JSON.stringify(resolve('node_modules/@sveltejs/kit/src/exports/vite/index.js'))};
      import { SvelteKitPWA } from ${JSON.stringify(resolve('dist/index.mjs'))};
      export default {
        logLevel: 'silent',
        plugins: [
          sveltekit({ adapter: adapter(), paths: { base: '/nested' }, outDir: '.kit', appDir: 'assets', serviceWorker: { register: false } }),
          SvelteKitPWA(${JSON.stringify(options)})
        ]
      };
    `)
    await exec(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'build'], { cwd: root })
    const name = strategy === 'generateSW' ? 'sw.js' : 'service-worker.js'
    const worker = await readFile(join(root, 'build', name), 'utf8')
    expect(worker).not.toContain('self.__WB_MANIFEST')
    const clientDir = join(root, '.kit/output/client')
    const files = await readdir(clientDir, { recursive: true })
    const scripts = await Promise.all(files.filter(file => file.endsWith('.js')).map(file => readFile(join(clientDir, file), 'utf8')))
    expect(scripts.some(script => script.includes(`/nested/${name}`))).toBe(true)
    if (strategy === 'selfDestroying') {
      expect(worker).toContain('self.registration.unregister()')
    }
    else {
      expect(worker).toContain('/nested/')
      expect(worker).toContain('about')
      expect(worker).toContain('assets/immutable/')
    }
    expect(await readFile(join(root, '.kit/output/client', name), 'utf8')).toBe(worker)
  }
  finally {
    await rm(root, { recursive: true, force: true })
  }
}, 30000)
