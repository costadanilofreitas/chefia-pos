module.exports = {
  plugins: {
    'postcss-import': {},
    'tailwindcss/nesting': 'postcss-nesting',
    tailwindcss: {},
    'postcss-preset-env': {
      features: {
        'nesting-rules': true,
        'custom-properties': true,
        'custom-media-queries': true,
        'custom-selectors': true,
        'color-function': true,
        'gap-properties': true,
        'overflow-wrap-property': true,
        'place-properties': true,
        'logical-properties-and-values': true,
        'is-pseudo-class': true,
        'focus-visible-pseudo-class': true,
        'focus-within-pseudo-class': true
      }
    },
    autoprefixer: {},
    ...(process.env.NODE_ENV === 'production' ? {
      cssnano: {
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
          colormin: true,
          convertValues: true,
          minifyFontValues: true,
          minifyGradients: true,
          minifyParams: true,
          minifySelectors: true,
          reduceIdents: true,
          reduceInitial: true,
          reduceTransforms: true,
          svgo: true,
          zindex: true,
        }]
      }
    } : {})
  }
}