/* global viz, d3 */
const dataPathStackedBar = 'data_stacked_bar.csv'

const dimensionsStackedBar = {
  xGridField: 'year',
  yGridField: 'crop',
  xField: 'date',
  yFields: ['very poor', 'poor'],
}

const optionsStackedBar = {
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
  // yDomainCustom: [0, 100],
  yGridPaddingInner: 0.15,
  yGridLabelFontSize: 12,
  showYGridLabels: true, // default: false
  yAxisLocation: 'right', // default: left
  // yValueFormatter: '.0%',
  // yValuePrefix: '',
  yValueSuffix: '%',
}

const chartContainerSelectorStackedBar = '#chart-container'

const dataPathChoroplethStates = 'data_choro.csv'

const dimensionsChoroplethStates = {
  valueField: 'bachelorsOrHigher',
  stateAbbrField: 'state_code',
}

const optionsChoroplethStates = {
  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: 'transparent', // try white, gray, black, #333

  valueFormat: '.0f',

  colorLegendTitle: 'Higher education rate',
  interpolateScheme: d3.interpolateBlues,
  missingDataColor: 'gray',
  nullDataColor: 'gray',
  missingDataMessage: 'Data Missing',
  nullDataMessage: 'Data Not Available',

  searchButtonClassNames: `focus:ring-gray-500 focus:border-gray-500
    text-xs
    border-gray-300
    rounded-sm
    px-2
    py-1
    shadow-inner border`,

  // colorDomain: [0, 9000],
}

const chartContainerSelectorChoroplethStates = '#chart-container-choro'

Promise.all([
  d3.csv(dataPathChoroplethStates),
  d3.csv(dataPathStackedBar),
]).then(([dataChoro, dataStackedBar]) => {
  const linkField = 'year' // xGridField in stacked bar

  const choroDataObj = {}

  dataStackedBar.forEach(d => {
    choroDataObj[d[linkField]] = dataChoro.filter(
      dc => dc[linkField] === d[linkField],
    )
  })

  const choroValues = dataChoro.map(d =>
    Number.parseFloat(d[dimensionsChoroplethStates.valueField]),
  )
  optionsChoroplethStates.colorDomain = d3.extent(choroValues)

  let currentYear

  const firstYearValue = dataStackedBar[0][linkField]

  function renderChoroForYear(year) {
    d3.select('#chart-container-choro')
      .append('div')
      .attr('class', 'year-title')
      .html(year)
    viz.renderChoroplethStates({
      data: choroDataObj[year],
      options: optionsChoroplethStates,
      dimensions: dimensionsChoroplethStates,
      chartContainerSelector: chartContainerSelectorChoroplethStates,
    })
  }

  // Initial Render
  renderChoroForYear(firstYearValue)

  viz.renderStackedBar({
    data: dataStackedBar,
    options: optionsStackedBar,
    dimensions: dimensionsStackedBar,
    chartContainerSelector: chartContainerSelectorStackedBar,
    handleCellMouseover: (e, d) => {
      const yr = d[linkField]
      if (currentYear === yr) return
      d3.selectAll('#chart-container-choro > *').remove()
      renderChoroForYear(yr)
      currentYear = yr
    },
  })
})

// viz.renderStackedBar({
//   options,
//   dimensions,
//   dataPath,
//   chartContainerSelector: '#chart-container',
// })
