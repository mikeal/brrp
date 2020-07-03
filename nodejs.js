import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'
import nodePolyfills from 'rollup-plugin-node-polyfills'
import shebangs from 'rollup-plugin-preserve-shebangs'
import json from '@rollup/plugin-json'

const options = {
  mainFields: ['module', 'main'],
  extensions: ['.mjs', '.cjs', '.js', '.json'],
  preferBuiltins: true
}

export default ({input, outputFile, polyfills}) => {
  const plugins = [
    json(),
    shebangs.preserveShebangs(),
    resolve(options),
    commonjs({extensions: ['.js', '.cjs']})
  ]
  if (polyfills) plugins.push(nodePolyfills())
  return {
    input,
    output: {
      file: outputFile,
      format: 'es'
    },
    plugins
  }
}
