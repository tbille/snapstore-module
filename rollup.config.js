import nodeResolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default [
  {
    input: 'canonicalwebteam/snapstore/static/js/base/base.js',
    plugins: [
      nodeResolve({
        jsnext: true
      }),
      babel({
        exclude: 'node_modules/**'
      })
    ],
    output: {
      file: 'canonicalwebteam/snapstore/static/js/dist/base.js',
      format: 'iife',
      name: 'snapcraft.base',
      sourcemap: true
    }
  },
  {
    input: 'canonicalwebteam/snapstore/static/js/public.js',
    plugins: [
      nodeResolve({
        jsnext: true
      }),
      babel({
        exclude: 'node_modules/**'
      })
    ],
    output: {
      file: 'canonicalwebteam/snapstore/static/js/dist/public.js',
      format: 'iife',
      name: 'snapcraft.public',
      sourcemap: true
    }
  }];
