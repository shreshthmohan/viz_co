/* global viz */

// eslint-disable-next-line no-unused-vars
const dataPath = 'data.csv'

// eslint-disable-next-line no-unused-vars
const dimensions = {
  xField: 'pick', // Numeric, presorted
  yField: 'year', // Categorical / String, presorted
  colorField: 'value', // Numeric // defaults to xField if not provided
  dominoField: 'name', // string; this is also the search field
}

// eslint-disable-next-line no-unused-vars
const options = {
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#f7f7f7', // background color

  /* Dimensions */
  /* xField */
  xPaddingOuter: 0.4,
  xAxisLabel: 'Pick Order →',

  /* yField */
  yPaddingInner: 0.4,
  yPaddingOuter: 0.2,
  ySortOrder: 'desc',

  /* colorField */
  colorStrategy: 'rank', // ['rank', 'value']
  colorThreshold: 10,
  colorDominoHighlighted: '#c20a66',
  colorDominoNormal: '#d9e2e4',

  /* dominoField */
  dominoSize: 0.8, // Number between 0 & 1

  /* Legends */
  normalLegendLabel: 'Normal Player',
  highlightedLegendLabel: 'Top Player',

  searchInputClassNames:
    'border border-gray-300 text-sm rounded overscroll-y-auto px-1.5 py-0.5 shadow-inner',
  // 'shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md overscroll-y-auto',
  goToInitialStateButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
  clearAllButtonClassNames:
    'bg-gray-200 text-sm rounded px-1.5 py-0.5 border-gray-300 border',
}

viz.validateAndRenderDominoBase({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
