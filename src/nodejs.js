import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import shebangs from 'rollup-plugin-preserve-shebangs'
import json from '@rollup/plugin-json'
import { terser } from 'rollup-plugin-terser'

const options = {
  mainFields: ['module', 'main'],
  extensions: ['.mjs', '.cjs', '.js', '.json'],
  preferBuiltins: true
}

export default ({ input, outputFile, minify }) => {
  const plugins = [
    json(),
    shebangs.preserveShebangs(),
    resolve(options),
    commonjs({ extensions: ['.js', '.cjs'] })
  ]
  if (minify) plugins.push(terser())
  return {
    input,
    output: {
      file: outputFile,
      format: 'es'
    },
    plugins
  }
}
