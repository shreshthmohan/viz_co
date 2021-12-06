/* global viz, d3 */

const dimensions = {
  valueField: 'bachelorsOrHigher',
  fipsField: 'fips',
  // TODO: user need not provide these:
  countyNameField: 'area_name',
  stateField: 'state',
}

const options = {
  colorLegendTitle: 'Higher education rate',
  interpolateScheme: d3.interpolateGreens,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa', // try white, gray, black, #333

  searchButtonClassNames: `focus:ring-gray-500 focus:border-gray-500
    text-xs
    border-gray-300
    rounded-sm
    px-2
    py-1
    shadow-inner border`,
}
const dataPath = 'data.csv'

viz.validateAndRenderChoroplethCounties({
  dataPath,
  options,
  dimensions,
  chartContainerSelector: '#chart-container',
})
