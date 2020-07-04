#!/usr/bin/env node
import rollup from '@rollup/stream'
import browserConfig from './browser.js'
import nodejsConfig from './nodejs.js'
import yargs from 'yargs'
import { writeFileSync, unlinkSync, createWriteStream } from 'fs'
import { promises as fs } from 'fs'
import tempy from 'tempy'
import { join } from 'path'
import { execSync } from 'child_process'
import rimraf from 'rimraf'

const bundleBrowser = opts => rollup(browserConfig(opts))
const bundleNodejs = opts => rollup(nodejsConfig(opts))

const parse = str => {
  if (str.includes('@', 1)) {
    const name = str.slice(0, str.indexOf('@', 1))
    const version = str.slice(str.indexOf('@') + 1)
    const full = str
    return { name, version, full }
  }
  return { full: str, name: str }
}

const proxyFile = pkg => `module.exports = require('${pkg}')`

const install = async pkg => {
  const dir = await tempy.directory()
  process.on('exit', () => rimraf.sync(dir))
  const pkgjson = join(dir, 'package.json')
  writeFileSync(pkgjson, Buffer.from(JSON.stringify({ name: 'build' })))
  const { name, full } = parse(pkg)
  execSync(`npm install ${full}`, { cwd: dir, stdio: [0, process.stderr, 'pipe'] })
  const filename = join(dir, `.brrp.${name}.cjs`)
  writeFileSync(filename, Buffer.from(proxyFile(name)))
  return { input: filename, dir, pkgjson, name, full }
}

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
  const nodejs = bundleNodejs({input})
  const browser = bundleBrowser({input})
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
  let _bundle = argv.nodejs ? bundleNodejs : bundleBrowser
  let bundle
  if (argv.p) bundle = opts => _bundle({...opts, nodePolyfills: true})
  else bundle = _bundle
  if (argv.install) {
    const { input } = await install(argv.pkg)
    return bundle({input})
  }
  if (argv.input) return bundle({input: argv.input})
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
  return bundle({input: filename})
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
  yargs.option('nodejs-polyfills', {
    alias: 'p',
    type: 'boolean',
    default: false,
    desc: 'Add nodejs polyfills'
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
