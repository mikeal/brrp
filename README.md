# brrp

Creates ESM bundles of npm packages for use in the browser or Node.js.

# Usage

## CLI

```
$ brrp -x lodash.merge > lodash-merge.bundle.js
```

This will do a fresh install of the npm module `lodash.merge` in temporary
directory and then create a bundle of the module.

If you have the target module already installed in your local npm project
you can avoid running any `npm install` locally by omitting the `-x` property.

```
$ brrp lodash.merge > lodash-merge.bundle.js
```

## As a module.

You can import `brrp` into Node.js for use in your own tooling.

```js
import { install, browserBundle } from 'brrp'

const { input } = await install('lodash.merge')
const stream = browserBundle({input})

for await (const chunk of stream) {
  process.stdout.write(chunk)
}
```

## Inject Node.js polyfills

By default we don't bundle in any Node.js polyfills. You can include them
by using the `-p` or `--node-polyfills` option.

```
$ brrp -x -p base-x
```

Or, if you're using `brrp` as a module.

```js
import { install, browserBundle } from 'brrp'

const { input } = await install('lodash.merge')
const nodePolyfills = true
const stream = browserBundle({input, nodePolyfills})

for await (const chunk of stream) {
  process.stdout.write(chunk)
}
```
## Minification

```
$ brrp -x -m bent
```

Or, if you're using `brrp` as a module.

```js
import { install, browserBundle } from 'brrp'

const { input } = await install('bent')
const minify = true
const stream = browserBundle({input, minify})

for await (const chunk of stream) {
  process.stdout.write(chunk)
}
```

We use [`terser`](https://github.com/terser/terser) under the hood
for optimal compression targetted at ES6+.

