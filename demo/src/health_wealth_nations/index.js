/* global d3, viz, _ */

const gdpPerCapDataPath =
  'GM-GDP per capita - Dataset - v27 - data-for-countries-etc-by-year.csv'
const lifeExpDataPath =
  'GM-Life Expectancy- Dataset - v11 - data-for-countries-etc-by-year.csv'

const popDataPath =
  'GM-Population - Dataset - v6 - data-for-countries-etc-by-year.csv'

const regionsDataPath =
  'Data Geographies - v2 - by Gapminder - list-of-countries-etc.csv'

// Read data
Promise.all([
  d3.csv(gdpPerCapDataPath),
  d3.csv(lifeExpDataPath),
  d3.csv(popDataPath),
  d3.csv(regionsDataPath),
]).then(([gdpPerCapitaData, lifeExpData, popData, regionsData]) => {
  // console.log({ gdpPerCapitaData, lifeExpectancyData })
  // Combine datasets. Filter oldest year to prevous year

  const timeFieldGdpData = 'time'
  const timeFieldLifeExpData = 'time'

  const yearsInGdpData = gdpPerCapitaData.map(d => d[timeFieldGdpData])
  const yearsInLifeExpData = lifeExpData.map(d => d[timeFieldLifeExpData])

  // const minYearGdpData =

  const commonOldestYear = parseFloat(
    d3.max([d3.min(yearsInGdpData), d3.min(yearsInLifeExpData)]),
  )

  const commonLatestYear = parseFloat(
    d3.min([d3.max(yearsInGdpData), d3.max(yearsInLifeExpData)]),
  )

  const currentYear = parseFloat(d3.timeFormat('%Y')(new Date()))

  const yearBeforeCurrent = currentYear - 1

  const rangeEndYear = d3.min([yearBeforeCurrent, commonLatestYear])

  const rangeYear = [commonOldestYear, rangeEndYear]

  const geoToRegionMapping = {}

  const regionKey = 'six_regions' // 'four_regions' //'World bank region'

  regionsData.forEach(r => {
    geoToRegionMapping[r.geo] = r[regionKey]
  })

  const uniqueRegions = _(regionsData).map(regionKey).uniq().value()

  // Filter data from commonOldestYear to yearBeforeCurrent
  // Combine data
  // country key: name (common in both)
  const countryKey = 'name'
  // color key: region: missing
  // year key: time (common in both)
  const yearKey = 'time'
  // life exp key: Life expectancy (y axis)
  // gdp per capita: Income per person (x axis)

  const dataColumns = [...lifeExpData.columns, ...gdpPerCapitaData.columns]

  // Assuming there is no missing data for a year in range

  const allCountriesGdpData = {}
  gdpPerCapitaData.forEach(d => {
    allCountriesGdpData[d[countryKey]] = 1
  })

  const allCountriesLifeExpectancy = {}
  lifeExpData.forEach(d => {
    allCountriesLifeExpectancy[d[countryKey]] = 1
  })

  const allCountries = {
    ...allCountriesGdpData,
    ...allCountriesLifeExpectancy,
  }

  const overlap = { inBoth: [], inGdpDataOnly: [], inLifeExpDataOnly: [] }

  Object.keys(allCountries).forEach(d => {
    if (allCountriesLifeExpectancy[d]) {
      if (allCountriesGdpData[d]) {
        // both
        overlap.inBoth.push(d)
      } else {
        // in life exp only
        overlap.inLifeExpDataOnly.push(d)
      }
    } else {
      // in gdp only
      overlap.inGdpDataOnly.push(d)
    }
  })

  console.log(overlap)

  // overlap.inBoth
  const objCountriesInBothDatasets = {}
  overlap.inBoth.forEach(d => {
    objCountriesInBothDatasets[d] = 1
  })

  console.log({ objCountriesInBothDatasets })

  // Combine common data
  const rawCombinedData = [...gdpPerCapitaData, ...lifeExpData, ...popData]

  const rawCombinedDataForYearRange = rawCombinedData.filter(
    d =>
      parseFloat(d[yearKey]) >= rangeYear[0] &&
      parseFloat(d[yearKey]) <= rangeYear[1],
  )

  const combinedDataObj = {}

  let count = 0
  rawCombinedDataForYearRange.forEach(d => {
    const uniqueKey = `${d[yearKey]}-${d[countryKey]}`
    if (!objCountriesInBothDatasets[d[countryKey]]) {
      count++
    } else {
      if (combinedDataObj[uniqueKey]) {
        combinedDataObj[uniqueKey] = { ...combinedDataObj[uniqueKey], ...d }
      } else {
        combinedDataObj[uniqueKey] = d
      }
      combinedDataObj[uniqueKey].region = geoToRegionMapping[d.geo]
    }
  })

  console.log({ count })
  console.log({ combinedDataLength: Object.keys(combinedDataObj).length })
  console.log({
    expectedDataLength:
      (rangeYear[1] - rangeYear[0] + 1) * overlap.inBoth.length,
  })

  const combinedDataArr = []
  Object.keys(combinedDataObj).forEach(k => {
    combinedDataArr.push(combinedDataObj[k])
  })
  combinedDataArr.columns = [...dataColumns, 'region']

  const startStopButtonClassNames = `
inline-flex
items-center
px-2
py-1
border border-transparent
text-xs
font-medium
rounded-sm
shadow-sm
text-white
bg-gray-600
hover:bg-gray-700
disabled:bg-gray-300
focus:outline-none
focus:ring-2
focus:ring-offset-2
focus:ring-gray-500
disabled:cursor-not-allowed`

  viz.renderMotionBubble({
    chartContainerSelector: '#chart-container',
    dimensions: {
      sizeField: 'Population',
      xField: 'Income per person',
      yField: 'Life expectancy',
      timeField: 'time',
      nameField: 'name',
      colorField: 'region',
    },
    options: {
      motionDelay: 200,
      sizeRange: [5, 40],
      xScaleType: 'log',
      // inbuiltScheme: d3.quantize(d3.interpolateWarm, uniqueRegions.length),
      // numberOfColors: uniqueRegions.length,
      inbuiltScheme: d3.schemeSet1,
      activeOpacity: 0.8,

      startButtonClassNames: startStopButtonClassNames,
      stopButtonClassNames: startStopButtonClassNames,
      searchButtonClassNames: `focus:ring-gray-500 focus:border-gray-500
    text-xs
    border-gray-300
    rounded-sm
    px-2
    py-1
    shadow-inner border`,
    },
    data: combinedDataArr,
  })
})
