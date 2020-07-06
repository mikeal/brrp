#!/usr/bin/env node
import yargs from 'yargs'
import { writeFileSync, unlinkSync, createWriteStream, promises as fs } from 'fs'

import { join } from 'path'

import { install, bundleBrowser, bundleNodejs, proxyFile } from './src/index.js'

const notfound = pkg => `No package named "${pkg}" installed locally.
Use '--install' to pull the package from npm and bundle it.
Use '--input' to compile a specific file instead of a package from npm`

const writeStream = async (stream, filename) => {
  const writable = createWriteStream(filename)
  for await (const chunk of stream) {
    writable.write(chunk)
  }
  writable.end()
  console.log('compiled', filename)
}

const mkdirIfMissing = async dir => {
  try {
    await fs.mkdir(dir)
  } catch (e) {
    if (e.errno !== -17) throw e
  }
}

const loadJSON = async f => JSON.parse((await fs.readFile(f)).toString())

const exporter = async argv => {
  const dir = join(process.cwd(), 'npm')
  await mkdirIfMissing(dir)
  const { input, pkgjson, name } = await install(argv.pkg)
  const nodejs = bundleNodejs({ input })
  const browser = bundleBrowser({ input })
  const pkg = await loadJSON(pkgjson)
  const version = pkg.dependencies[name].slice(1)
  const nodejsFilename = `${name}-${version}.nodejs.js`
  const browserFilename = `${name}-${version}.browser.js`
  await Promise.all([
    writeStream(nodejs, join(dir, nodejsFilename)),
    writeStream(browser, join(dir, browserFilename))
  ])
  const mypkgjson = join(process.cwd(), 'package.json')
  const mypkg = await loadJSON(mypkgjson)
  if (!mypkg.exports) {
    mypkg.exports = {}
  }
  const ex = {
    node: nodejsFilename,
    browser: browserFilename
  }
  mypkg.exports[nodejsFilename] = ex
  writeFileSync(mypkgjson, Buffer.from(JSON.stringify(mypkg, null, 2)))
  console.log('appended export map', ex)
}

const runner = async argv => {
  const bundle = argv.nodejs ? bundleNodejs : bundleBrowser
  const opts = { }
  if (argv.p) opts.nodePolyfills = true
  if (argv.m) opts.minify = true
  if (argv.install) {
    const { input } = await install(argv.pkg)
    return bundle({ input, ...opts })
  }
  if (argv.input) return bundle({ input: argv.input, ...opts })
  try {
    await import(argv.pkg)
  } catch (e) {
    console.error(notfound(argv.pkg))
    process.exit(1)
  }
  const build = proxyFile(argv.pkg)
  const filename = `.brrp.${argv.pkg}.cjs`
  writeFileSync(filename, Buffer.from(build))
  process.on('exit', () => unlinkSync(filename))
  return bundle({ input: filename, ...opts })
}

const run = async argv => {
  if (argv.exports) return exporter(argv)
  const bundler = await runner(argv)
  let f
  if (argv.output) f = createWriteStream(argv.output)
  for await (const chunk of bundler) {
    if (!f) process.stdout.write(chunk)
    else f.write(chunk)
  }
  if (f) f.end()
}

const options = yargs => {
  yargs.options('input', {
    alias: 'i',
    desc: 'Compile input file instead of npm package'
  })
  yargs.option('install', {
    desc: 'Install the npm package locally before running',
    alias: 'x',
    type: 'boolean',
    default: false
  })
  yargs.option('output', {
    alias: 'o',
    desc: 'Write output to file instead of stdout'
  })
  yargs.option('nodejs', {
    alias: 'n',
    type: 'boolean',
    default: false,
    desc: 'Compile output file for Node.js instead of browser'
  })
  yargs.option('node-polyfills', {
    alias: 'p',
    type: 'boolean',
    default: false,
    desc: 'Add nodejs polyfills'
  })
  yargs.option('minify', {
    alias: 'm',
    type: 'boolean',
    default: false,
    desc: 'Minify bundle'
  })
  yargs.option('exports', {
    alias: 'e',
    type: 'boolean',
    default: false,
    desc: 'Write output to ./npm/pkg.v1.1.1.js and pkg.browser.v1.1.1.js and edit local package.json exports property for browser overwrite'
  })
}

const desc = 'Output bundle of npm package'

const args = yargs.command('$0 [pkg]', desc, options, run).argv
if (!args.pkg && !args.input) {
  yargs.showHelp()
  process.exit()
}
