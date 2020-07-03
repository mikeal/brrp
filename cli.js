#!/usr/bin/env node
import rollup from '@rollup/stream'
import browserConfig from './browser.js'
import yargs from 'yargs'
import { writeFileSync, unlinkSync } from 'fs'
import { promises as fs } from 'fs'

const bundle = async filename => {
  const stream = rollup(browserConfig(filename))
  for await (const chunk of stream) {
    process.stdout.write(chunk)
  }
}

const run = async argv => {
  if (argv.input) return bundle(argv.input)
  const build = `module.exports = require('${argv.pkg}')`
  const filename = `.brrp.${build}.cjs`
  writeFileSync(filename, Buffer.from(build))
  await bundle(filename)
  unlinkSync(filename)
}

const options = yargs => {
  yargs.options('input', {
    alias: 'i',
    desc: 'Compile input file instead of npm package'
  })
  // TODO
  yargs.option('install', {
    desc: 'Install the npm package locally before running'
  })
  // TODO
  yargs.option('nodejs', {
    alias: 'n',
    type: 'boolean',
    default: false,
    desc: 'Compile output file for Node.js instead of browser'
  })
  // TODO
  yargs.option('output', {
    alias: 'o',
    desc: 'Write output to file instead of stdout'
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
