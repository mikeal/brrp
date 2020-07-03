import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs'

const options = {
  mainFields: ['browser:module', 'module', 'browser', 'main'],
  extensions: ['.mjs', '.cjs', '.js', '.json'],
  preferBuiltins: true
}

export default ({input, outputFile}) => {
  return {
    input,
    output: {
      file: outputFile,
      format: 'es'
    },
    plugins: [resolve(options), commonjs({extensions: ['.js', '.cjs']})]
  }
}
