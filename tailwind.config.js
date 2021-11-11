module.exports = {
  purge: ['./demo/**/*.html', './demo/**/*.js'],
  // corePlugins: {
  //   preflight: false,
  // },
  darkMode: false, // or 'media' or 'class'
  theme: {
    // extend: {
    //   fontFamily: {
    //     nunito: ['Nunito'],
    //   },
    // },
  },
  variants: {
    extend: {
      backgroundColor: ['disabled'],
      cursor: ['disabled'],
    },
  },
}
