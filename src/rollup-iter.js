// adapted from https://github.com/rollup/stream/blob/master/src/index.ts
import { rollup } from 'rollup'

const build = async function * (opts) {
  const bundle = await rollup(opts)
  const { output } = await bundle.generate(opts.output)

  for (const chunk of output) {
    if (!chunk) continue
    if (chunk.type === 'asset') {
      yield chunk.source
    } else {
      yield chunk.code
      if (chunk.map) {
        yield `\n//# sourceMappingURL=${chunk.map.toUrl()}`
      }
    }
  }
}

export default build
