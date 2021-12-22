/* global d3, viz */

const dataPath = 'data.csv'

const dimensions = {
  groupField: 'group',
  xField: 'frustration_index',
  yField: 'incidence',
  seriesField: 'period',
}

const options = {
  aspectRatio: 1.6,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: 'transparent',

  // colorScheme: d3.scheme[6].reverse(),
  colorScheme: d3.schemeCategory10,
  // colorScheme: ['red', 'blue', 'green'],

  yAxisTicksFontSize: '12px',
  yAxisPosition: 'right',
  yAxisTickSizeOffset: 10,
  yAxisGridLines: true,
  // yAxisLabel: 'custom y label',
  yAxisLabelHorizontalOffset: 25,

  xAxisTicksFontSize: '12px',
  xAxisPosition: 'bottom',
  xAxisTickSizeOffset: 0,
  xAxisGridLines: true,
  // xAxisLabel: 'custom x label',
  alternatingTickLabelsXAxis: true,

  areaOpacity: 0.6,

  verticalLines: [
    { x: '6', group: 'United Income', series: 'Pan' },
    { x: '4', group: 'United Income', series: 'Pre' },
    { x: '2', group: 'Consumer Auto', series: 'Pre' },
    { x: '5', group: 'Dealer', series: 'Post' },
    { x: '4', group: 'Refinance', series: 'Pan' },
    { x: '8', group: 'Servicing', series: 'Pan' },
  ],
  verticalDashedLineLabels: [
    { series: 'Pan', label: 'Pan Avg' },
    { series: 'Pre', label: 'Pre Avg' },
    { series: 'Post', label: 'Post Avg' },
  ],
}

viz.validateAndRenderOverlapArea({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
