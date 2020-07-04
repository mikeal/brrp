#!/usr/bin/env node
import rollup from '@rollup/stream'
import browserConfig from './browser.js'
import nodejsConfig from './nodejs.js'
import { writeFileSync } from 'fs'

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

export { install, bundleBrowser, bundleNodejs, parse, proxyFile }
