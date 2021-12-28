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

  xAxisPosition: 'bottom',
  xAxisLabel: 'Year',
  xAxisLabelOffset: 50,
  xAxisTickRotation: 90,
  xAXisLabelFontSize: 12,

  yAxisPosition: 'left',
  yAxisLabel: 'Runs',
  yAxisLabelOffset: 50,
  yAXisLabelFontSize: 12,

  // to tackle too many x tick labels
  // remove this to show all values
  showOnlyEveryNthValue: 1,

  nanDisplayMessage: 'NA',
  referenceLines: [
    { value: 2005, label: 'Zim-Avg', color: 'orange' },
    { value: 2015, label: 'Afg-Avg', color: 'blue' },
  ],
  referenceLinesOpacity: 0.8,
}

const dataPath = 'data_.csv'

viz.validateAndRenderOverlapBar({
  chartContainerSelector: '#chart-container',
  options,
  dimensions,
  dataPath,
})
