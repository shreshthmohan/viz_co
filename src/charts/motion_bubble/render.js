import * as d3 from 'd3'
import _ from 'lodash-es'

import {
  setupChartArea,
  initializeTooltip,
} from '../../utils/helpers/commonChartHelpers'

export function renderChart({
  data,
  dimensions: { sizeField, xField, yField, timeField, nameField, colorField },
  options: {
    motionDelay = 1000,
    marginTop = 40,
    marginRight = 50,
    marginBottom = 50,
    marginLeft = 40,
    bgColor = 'transparent',
    heading = '',
    subheading = '',
    aspectRatio = 2,

    /* eslint-disable unicorn/no-null */
    sizeRange = [2, 20],
    xDomainCustom = null,
    yDomainCustom = null,
    /* eslint-enable unicorn/no-null */

    inbuiltScheme = 'schemePuRd',
    numberOfColors = 9, // minumum: 3, maximum: 9
    xAxisLabel = xField,
    yAxisLabel = yField,
  },
  chartContainerSelector,
}) {
  console.log(data)

  const coreChartWidth = 1000
  const {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsLeft,
    viewBoxWidth,
  } = setupChartArea({
    chartContainerSelector,
    coreChartWidth,
    aspectRatio,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    bgColor,
  })

  const tooltipDiv = initializeTooltip()

  const dataParsed = data.map(d => ({
    ...d,
    [sizeField]: Number.parseFloat(d[sizeField]),
    [xField]: Number.parseFloat(d[xField]),
    [yField]: Number.parseFloat(d[yField]),
  }))

  const sizes = dataParsed.map(d => d[sizeField])
  const sizeDomain = d3.extent(sizes)
  const sizeScale = d3.scaleSqrt().domain([0, sizeDomain[1]]).range(sizeRange)

  const xDomain = xDomainCustom || d3.extent(dataParsed.map(d => d[xField]))
  const yDomain = yDomainCustom || d3.extent(dataParsed.map(d => d[yField]))

  const xScale = d3.scaleLinear().domain(xDomain).range([0, coreChartWidth])
  const yScale = d3.scaleLinear().range([coreChartHeight, 0]).domain(yDomain)
  // .nice()

  const colorDomain = _.uniq(_.map(dataParsed, colorField))
  const colorScale = d3.scaleOrdinal(
    colorDomain,
    d3[inbuiltScheme][numberOfColors],
  )

  const dataAt = loc => {
    return data.filter(d => d[timeField] === loc)
  }
  const timeDomain = _.uniq(_.map(data, timeField)).sort()
  const timeDomainLength = timeDomain.length

  const rangeSliderValue = d3.select('#range-slider-value')

  rangeSliderValue.text(timeDomain[0])
  const circles = chartCore
    .append('g')
    .attr('class', 'group-circles')
    .selectAll('circle')
    .data(dataAt(timeDomain[0]), d => d[nameField])
    .join('circle')
    .sort((a, b) => d3.descending(a[sizeField], b[sizeField]))
    .attr('class', d => `iv-circle iv-circle-${toClassText(d[nameField])}`)
    .attr('cx', d => xScale(d[xField]))
    .attr('cy', d => yScale(d[yField]))
    .attr('r', d => sizeScale(d[sizeField]))
    .attr('fill', d => colorScale(d[colorField]))
    .attr('stroke', d => d3.rgb(colorScale(d[colorField])).darker(0.5))
    .on('mouseover', (e, d) => {
      // TODO: what will you do if a field is missing
      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv.html(`${d[nameField]} (${d[timeField]})
      <br/>
      <span class="capitalize"> ${xField}: ${d[xField]}</span>
      <br/>
      <span class="capitalize">${yField}: ${d[yField]}</span>
      <br/>
      <span class="capitalize">${sizeField}: ${d[sizeField]}</span>
      `)
      d3.select(e.target).attr('stroke-width', 2)
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target).attr('stroke-width', 1)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  const updateCircles = newData => {
    circles
      .data(newData, d => d[nameField])
      .sort((a, b) => d3.descending(a[sizeField], b[sizeField]))
      .transition()
      .duration(motionDelay)
      .attr('cx', d => xScale(d[xField]))
      .attr('cy', d => yScale(d[yField]))
      .attr('r', d => sizeScale(d[sizeField]))
  }
}
