/* global topojson, legend, dimensions, options */
const { valueField, stateCodeField } = dimensions

const {
  interpolateScheme = 'interpolateBlues',
  colorLegendTitle = valueField,

  marginTop = 0,
  marginRight = 0,
  marginBottom = 0,
  marginLeft = 0,

  bgColor = 'transparent',

  heading = '{{ Heading }}',
  subheading = '{{ Subheading }}',
} = options
const coreChartHeight = 610
const coreChartWidth = 975

const viewBoxHeight = coreChartHeight + marginTop + marginBottom
const viewBoxWidth = coreChartWidth + marginLeft + marginRight

// const colorLegendTitle = 'Higher education rate'

d3.select('#chart-heading').node().textContent = heading
d3.select('#chart-subheading').node().textContent = subheading

const svgParentNodeSelector = '#svg-container'

const svgParent = d3.select(svgParentNodeSelector)

const svg = svgParent
  .append('svg')
  .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
  .style('background', bgColor)

const path = d3.geoPath()

Promise.all([
  d3.json('./counties-albers-10m.json'),
  d3.csv('./data.csv'),
  d3.csv('./us_postal_abbr.csv'),
]).then(([us, edu, stateCodes]) => {
  renderMap(us, edu, stateCodes)
})

const tooltipDiv = d3
  .select('body')
  .append('div')
  .attr(
    'class',
    'tooltip absolute text-center bg-white rounded px-1 text-xs border',
  )
  .style('opacity', 0)

// id in counties-albers-10m.json is FIPS code

function renderMap(topo, dataRaw, stateCodesArr) {
  const data = dataRaw.map(d => ({
    ...d,
    [valueField]: Number.parseFloat(d[valueField]),
    // [fipsField]: Number.parseInt(d[fipsField], 10),
  }))
  const ed = data.map(el => el[valueField])
  const edDomain = d3.extent(ed)

  // TODO: make flexible such that it supports both states code and state names provided in data

  const dataObj = {}
  data.forEach(s => {
    dataObj[s[stateCodeField]] = s
  })
  console.log({ dataObj })

  const stateCodeMap = {}

  stateCodesArr.forEach(sc => {
    stateCodeMap[sc.state] = sc
  })
  console.log(stateCodeMap)

  const colorScale = d3.scaleSequential(d3[interpolateScheme]).domain(edDomain)
  // console.log({ edDomain })

  const allStates = svg
    .append('g')
    .attr('class', 'group-states')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)
    .selectAll('path')
    .data(topojson.feature(topo, topo.objects.states).features)
    .join('path')
    .attr('d', path)
    .attr('id', d => `iv-state-${d.id}`)
    .attr('class', 'iv-state')
    .attr('stroke-width', 2)
    .attr('fill', d => {
      const stateName = d.properties.name
      const stateCode = stateCodeMap[stateName].abbr
      return stateCode
        ? colorScale(dataObj[stateCode][valueField])
          ? colorScale(dataObj[stateCode][valueField])
          : 'gray'
        : 'gray'
    })
    .on('mouseover', (e, d) => {
      tooltipDiv.transition().duration(200).style('opacity', 1)
      // const found = data.find(
      //   el => Number.parseInt(el[fipsField], 10) === Number.parseInt(d.id, 10),
      // )

      const stateName = d.properties.name
      const stateCode = stateCodeMap[stateName].abbr

      if (dataObj[stateCode]) {
        tooltipDiv.html(`${stateName}
          <br />
          ${valueField}: ${d3.format('.2f')(dataObj[stateCode][valueField])}
          `)
      }

      d3.select(e.target).attr('stroke', '#333').attr('stroke-width', 2).raise()
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target).attr('stroke', 'transparent')
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  const search = d3.select('#search')

  search.attr('placeholder', 'Find by state')

  function searchBy(term) {
    if (term) {
      d3.select('.group-states').classed('searching', true)
      allStates.classed(
        's-match',
        // should be boolean
        d => {
          return d.properties.name.toLowerCase().includes(term.toLowerCase())
          // return false
          // return dataObj[Number.parseInt(d.id, 10)][countyNameField]
          //   .toLowerCase()
          //   .includes(term.toLowerCase())
        },
      )
    } else {
      d3.select('.group-states').classed('searching', false)
    }
  }

  search.on('keyup', e => {
    searchBy(e.target.value.trim())
  })

  svg
    .append('path')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)
    .datum(topojson.mesh(topo, topo.objects.states, (a, b) => a !== b))
    .attr('fill', 'none')
    .attr('stroke', 'white')
    .attr('stroke-linejoin', 'round')
    .attr('d', path)
    .attr('opacity', 0.5)

  svg
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)
    .append('g')
    .attr('transform', 'translate(610, 20)')
    .append(() =>
      legend({
        color: colorScale,
        title: colorLegendTitle,
        width: 260,
      }),
    )
}
