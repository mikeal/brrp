import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import nodejsPolyfills from 'rollup-plugin-node-polyfills'
import { terser } from 'rollup-plugin-terser'

const options = {
  mainFields: ['browser:module', 'module', 'browser', 'main'],
  extensions: ['.mjs', '.cjs', '.js', '.json'],
  preferBuiltins: true
}

export default ({ input, outputFile, nodePolyfills, minify }) => {
  const plugins = [resolve(options), commonjs({ extensions: ['.js', '.cjs'] })]
  if (nodePolyfills) plugins.push(nodejsPolyfills())
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
