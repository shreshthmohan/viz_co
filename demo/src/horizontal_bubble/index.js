/* global viz */

// const inbuiltSchemeOptions = [
//   'schemeBrBG',
//   'schemePRGn',
//   'schemePiYG',
//   'schemePuOr',
//   'schemeRdBu',
//   'schemeRdGy',
//   'schemeRdYlBu',
//   'schemeRdYlGn',
//   'schemeSpectral',
//   'schemeBuGn',
//   'schemeBuPu',
//   'schemeGnBu',
//   'schemeOrRd',
//   'schemePuBuGn',
//   'schemePuBu',
//   'schemePuRd',
//   'schemeRdPu',
//   'schemeYlGnBu',
//   'schemeYlGn',
//   'schemeYlOrBr',
//   'schemeYlOrRd',
//   'schemeBlues',
//   'schemeGreens',
//   'schemeGreys',
//   'schemePurples',
//   'schemeReds',
//   'schemeOranges',
// ]
const options = {
  aspectRatioSplit: 2,
  aspectRatioCombined: 8,

  marginTop: 30,
  marginRight: 50,
  marginBottom: 30,
  marginLeft: 170,

  bgColor: 'transparent',

  collisionDistance: 0.5,

  xDomainCustom: [0, 45],

  sizeRange: [2, 15],

  sizeLegendValues: [10e3, 50e3, 10e4, 25e4],
  sizeLegendTitle: 'size legend title',

  xAxisLabel: 'x-axis label',

  colorLegendTitle: 'color legend label',

  combinedSegmentLabel: 'combined segment label',
  segmentType: 'segment type', // use this if it's the same for both split and combined modes
  segmentTypeCombined: 'segment type (combined)',
  segmentTypeSplit: 'segment type (split)',

  // customColorScheme: ['red', 'blue', 'green', 'black', 'gray'],
  inbuiltScheme: 'schemePuRd',
  // inbuiltSchemeOptions[0], // 0, 27
  numberOfColors: 5, // minumum: 3, maximum: 9

  // headers
  heading: 'This is a heading for the chart',
  subheading: 'This is a subheading for the chart describing it in more detail',
  splitButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  combinedButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
}

const dimensions = {
  sizeField: 'capitalization',
  xField: 'taxRate',
  nameField: 'name',

  segmentField: 'sector',
}
const dataPath = 'data.csv'

viz.validateAndRenderHorizontalBubble({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
