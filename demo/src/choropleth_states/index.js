/* global d3, viz */

const dimensions = {
  valueField: 'bachelorsOrHigher',
  stateAbbrField: 'state_code',
}

// eslint-disable-next-line no-unused-vars
const options = {
  colorLegendTitle: 'Higher education rate',
  interpolateScheme: d3.interpolateBlues, // see numbers in inbuiltSchemeOptions above for options

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: 'transparent', // try white, gray, black, #333

  searchButtonClassNames: `focus:ring-gray-500 focus:border-gray-500
    text-xs
    border-gray-300
    rounded-sm
    px-2
    py-1
    shadow-inner border`,
}
const dataPath = 'data.csv'

viz.validateAndRenderChoroplethStates({
  dataPath,
  options,
  dimensions,
  chartContainerSelector: '#chart-container',
})
