/* globals it */
import assert from 'assert'
import * as brrp from 'brrp'

const test = it
const same = assert.deepStrictEqual
const timeout = 60 * 1000

test('install', async () => {
  const result = await brrp.install('bent')
  same(result.input.endsWith('bent.cjs'), true)
  same(!!result.dir, true)
  same(result.pkgjson.endsWith('package.json'), true)
  same(result.name, 'bent')
  same(result.full, 'bent')
}).timeout(timeout)

const bundle = async (bundler, pkg, opts) => {
  const { input } = await brrp.install(pkg)
  const stream = await bundler({ input, ...opts })
  const parts = []
  for await (const chunk of stream) {
    parts.push(chunk)
  }
  return parts.join('')
}

test('install version', async () => {
  const [b1, b2] = await Promise.all([
    bundle(brrp.bundleBrowser, 'bent'),
    bundle(brrp.bundleBrowser, 'bent@6.0.0')
  ])
  same(b1 !== b2, true)
  same(b1.includes('btoa'), true)
  same(b2.includes('btoa'), false)
}).timeout(timeout)

test('nodejs polyfills', async () => {
  const nodePolyfills = true
  const [b1, b2] = await Promise.all([
    bundle(brrp.bundleBrowser, 'base-x@3.0.8'),
    bundle(brrp.bundleBrowser, 'base-x@3.0.8', { nodePolyfills })
  ])
  same(b1 !== b2, true)
  same(b1.includes('Buffer.prototype.readUIntBE'), false)
  same(b2.includes('Buffer.prototype.readUIntBE'), true)
}).timeout(timeout)

test('nodejs bundle', async () => {
  const str = await bundle(brrp.bundleNodejs, 'bent')
  same(str.includes("from 'http'"), true)
  same(str.includes('fetch'), false)
}).timeout(timeout)
