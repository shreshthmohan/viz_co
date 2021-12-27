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

  barValueMidPoint: 60,

  /* Chart Specific */
  colorScheme: ['#3077aa', '#ed3833'], // [leftColor, rightColor]
  // barValueMidPoint: 50, // default is 50
  barOpacity: 1, // Between 0 & 1

  defaultState: ['Religion'],
  // defaultState: 'All',

  inactiveOpacity: 0.2,
  activeOpacity: 1,

  searchInputClassNames:
    'focus:ring-gray-500 focus:border-gray-500 text-xs border border-gray-300 rounded-sm px-2 py-1 shadow-inner',
  goToInitialStateButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  clearAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
  showAllButtonClassNames:
    'px-2 py-1 border border-transparent text-xs font-medium rounded-sm shadow-sm text-white bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:cursor-not-allowed',
}

const dataPath = 'data.csv'

viz.validateAndRenderComparativeBar({
  chartContainerSelector: '#chart-container',
  dataPath,
  options,
  dimensions,
})
