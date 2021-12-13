/* global viz */
const dataPath = 'data.csv'

const dimensions = {
  xGridField: 'year',
  yGridField: 'crop',
  xField: 'date',
  yFields: ['very poor', 'poor'],
}

const options = {
  /* Chart Area */
  aspectRatio: 1.6,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#eee', // background-color

  colorScheme: ['#926759', '#d0a558'], // // length of colorScheme should be more than or equal to length of dimensions.yFields

  /* Dimensions */
  xValueTimeParser: '%Y-%m-%d', // 1997-08-17
  xValueTimeFormatter: '%e %b %Y', // 17 Aug 1997

  /* yField */
  yDomainCustom: [0, 100],
  yGridPaddingInner: 0.15,
  showYGridLabels: true, // default: false
  yAxisLocation: 'right', // default: left
  // yValueFormatter: '.0%',
  // yValuePrefix: '',
  yValueSuffix: '%',
}

viz.validateAndRenderStackedBar({
  options,
  dimensions,
  dataPath,
  chartContainerSelector: '#chart-container',
})
