/* global d3 */

/* global viz */

const dimensionsStacked = {
  xField: 'year',
  // yFields: ['India', 'Ireland', 'Zim', 'WI', 'Australia', 'Afg'],
  yFields: ['one', 'two'],
  // yFields: ['one', 'two'],
}

const optionsStacked = {
  aspectRatio: 0.7,

  marginTop: 0,
  marginRight: 0,
  marginBottom: 0,
  marginLeft: 0,

  bgColor: '#fafafa',
  barThickness: 0.9,
  outerPadding: 0.5,

  barOpacity: 0.5,
  colorScheme: ['orange', 'blue', '#8c8d85', '#29b1c4', 'green', 'yellow'],

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
  // referenceLines: [
  //   { value: 2005, label: 'Zim-Avg', color: 'orange' },
  //   { value: 2015, label: 'Afg-Avg', color: 'blue' },
  // ],
  referenceLinesOpacity: 0.8,
}

// const dataPathStacked = 'data_stacked.csv'

// viz.validateAndRenderOverlapBar({
//   chartContainerSelector: '#chart-container',
//   options,
//   dimensions,
//   dataPath,
// })

const dimensions = {
  valueField: 'bachelorsOrHigher',
  stateAbbrField: 'state_code',
}

// eslint-disable-next-line no-unused-vars
const options = {
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

Promise.all([d3.csv('data_choro.csv'), d3.csv('data_stacked.csv')]).then(
  ([dataChoro, dataStacked]) => {
    // console.log({ dataChoro, dataStacked })
    const timeField = 'year'

    // const choroValueField = 'bachelorsOrHigher'

    // const choroStateAbbrField = 'state_code'

    // First keyed by time, then by state
    const choroDataObj = {}

    dataStacked.forEach(d => {
      choroDataObj[d[timeField]] = dataChoro.filter(
        dc => dc[timeField] === d[timeField],
      )
    })

    const choroValues = dataChoro.map(d =>
      Number.parseFloat(d[dimensions.valueField]),
    )
    options.colorDomain = d3.extent(choroValues)
    // console.log(choroDataObj['1997'].columns)

    viz.renderOverlapBar({
      data: dataStacked,
      options: optionsStacked,
      dimensions: dimensionsStacked,
      chartContainerSelector: '#chart-container',
      handleBarClick: (e, d) => {
        const yr = d[timeField]
        d3.selectAll('#chart-container-choro > *').remove()
        viz.renderChoroplethStates({
          data: choroDataObj[yr],
          options,
          dimensions,
          chartContainerSelector: '#chart-container-choro',
        })
      },
    })

    // console.log({ choroDataObj })
  },
)
