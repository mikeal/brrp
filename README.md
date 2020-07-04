# brrp

Creates ES bundles of npm packages for use in the browser or Node.js.

# Usage

## CLI

```
$ brrp -x lodash.merge > lodash-merge.bundle.js
```

This will do a fresh install of the npm module `buffer` in temporary
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
