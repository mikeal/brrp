#!/usr/bin/env node
import rollup from '@rollup/stream'
import browserConfig from './browser.js'
import yargs from 'yargs'
import { writeFileSync, unlinkSync, createWriteStream } from 'fs'
import { promises as fs } from 'fs'
import tempy from 'tempy'
import { join } from 'path'
import { execSync } from 'child_process'
import rimraf from 'rimraf'

const bundle = filename => rollup(browserConfig(filename))

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
  const output = bundle(filename)
  output.dir = dir
  output.pkgjson = pkgjson
  return output
}

const runner = async argv => {
  if (argv.install) return install(argv.pkg)
  if (argv.input) return bundle(argv.input)
  const build = proxyFile(argv.pkg)
  const filename = `.brrp.${argv.pkg}.cjs`
  writeFileSync(filename, Buffer.from(build))
  process.on('exit', () => unlinkSync(filename))
  return bundle(filename)
}

const run = async argv => {
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
  // TODO
  yargs.option('nodejs', {
    alias: 'n',
    type: 'boolean',
    default: false,
    desc: 'Compile output file for Node.js instead of browser'
  })
 // TODO
  yargs.option('exports', {
    alias: 'e',
    desc: 'Write output to ./npm/pkg.v1.1.1.js and pkg.browser.v1.1.1.js and edit local package.json exports property for browser overwrite'
  })
}

const desc = 'Output bundle of npm package'

const args = yargs.command('$0 [pkg]', desc, options, run).argv
if (!args.pkg && !args.input) {
  yargs.showHelp()
}
