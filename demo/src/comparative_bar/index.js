/* global viz */

const dimensions = {
  yField: 'Dimension', // Categorical

  barLeftLabelField: 'Democratic Label', // Categorical
  barLeftValueField: 'Democratic', // Numeric

  barRightLabelField: 'Republican Label', // Categorical
  barRightValueField: 'Republican', // Numeric
}

const options = {
  /* Chart Area */
  aspectRatio: 1.4,

  marginTop: 20,
  marginRight: 20,
  marginBottom: 20,
  marginLeft: 20,

  bgColor: '#eee', // background color

  /* Dimensions */
  /* xField */
  leftXAxisLabel: 'Chance of voting democratic',
  rightXAxisLabel: 'Chance of voting republican',
  xAxisLabel: 'Probability of voting, %',

  /* Chart Specific */
  colorScheme: ['#3077aa', '#ed3833'], // [leftColor, rightColor]
  // barValueMidPoint: 50, // default is 50
  barOpacity: 1, // Between 0 & 1
}

const dataPath = 'data.csv'

viz.validateAndRenderComparativeBar({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
