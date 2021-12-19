/* global viz */

const dimensions = {
  xField: 'Year',
  // yFields: ['India', 'Ireland', 'Zim', 'WI', 'Australia', 'Afg'],
  yFields: ['Zim', 'Afg'],
}

const options = {
  aspectRatio: 2,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa',
  barThickness: 0.9,
  outerPadding: 0.5,

  barOpacity: 0.5,
  colors: ['orange', 'blue', '#8c8d85', '#29b1c4', 'green', 'yellow'],

  // to tackle too many x tick labels
  // remove this to show all values
  showOnlyEveryNthValue: 1,
}

const dataPath = 'data_.csv'

viz.validateAndRenderOverlapBar({
  chartContainerSelector: '#chart-container',
  options,
  dimensions,
  dataPath,
})
