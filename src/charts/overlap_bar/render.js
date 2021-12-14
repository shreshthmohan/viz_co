/* global window */

import * as d3 from 'd3'

import { swatches } from '../../utils/helpers/colorLegend'

import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'
import { preventOverflow, toClassText } from '../../utils/helpers/general'

export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    barOpacity = 0.5,

    colors = d3.schemeSpectral[9],

    showOnlyEveryNthValue = 1,
  },
  dimensions: { xField, yFields },
  chartContainerSelector,
}) {
  d3.select('body').append('style').html(`
  .hovered {
    stroke: #333;
  }
  `)

  const coreChartWidth = 1000
  const { svg, coreChartHeight, allComponents, chartCore, widgetsRight } =
    setupChartArea({
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

  const allYValues = []
  const dataParsed = data.map(el => {
    const elParsed = { ...el }
    yFields.forEach(yf => {
      elParsed[yf] = Number.parseFloat(el[yf])
      allYValues.push(Number.parseFloat(el[yf]))
    })
    return elParsed
  })

  const xDomain = dataParsed.map(d => d[xField])
  const xScale = d3
    .scaleBand()
    .range([0, coreChartWidth])
    .domain(xDomain)
    .paddingInner(0.2)

  const yMax = d3.max(allYValues)

  const colorsRgba = colors.map(c => {
    const parsedColor = d3.rgb(c)
    parsedColor.opacity = barOpacity
    return parsedColor
  })

  const yScale = d3.scaleLinear().range([coreChartHeight, 0]).domain([0, yMax])
  yFields.forEach((yf, i) => {
    chartCore
      .append('g')
      .selectAll('rect')
      .data(dataParsed)
      .join('rect')
      .attr('x', d => xScale(d[xField]))
      .attr('y', d => yScale(d[yf]))
      .attr('class', d => `rect-${toClassText(d[xField])}`)
      .attr('height', d => yScale(0) - yScale(d[yf]))
      .attr('width', xScale.bandwidth())
      .attr('fill', colorsRgba[i])
    // .attr('stroke', '#333')
  })

  chartCore
    .append('g')
    .selectAll('rect')
    .data(dataParsed)
    .join('rect')
    .attr('x', d => xScale(d[xField]))
    .attr('y', 0)
    .attr('height', coreChartHeight)
    .attr('width', xScale.bandwidth())
    .attr('opacity', 0)
    .on('mouseover', function (e, d) {
      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)

      tooltipDiv.html(`${xField}: ${d[xField]}
      <br/>
      ${yFields
        .map(
          (yff, i) =>
            `<div style="display: inline-block; width: 0.5rem; height: 0.5rem; background: ${colorsRgba[i]}"></div> ${yff}: ${d[yff]}`,
        )
        .join('<br/>')}
      `)

      d3.selectAll(`.rect-${toClassText(d[xField])}`).classed('hovered', true)
    })
    .on('mouseout', function (e, d) {
      d3.selectAll(`.rect-${toClassText(d[xField])}`).classed('hovered', false)

      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  const xAxis = d3.axisBottom(xScale).tickValues(
    xScale.domain().filter(function (d, i) {
      return !(i % showOnlyEveryNthValue)
    }),
  )

  chartCore
    .append('g')
    .attr('transform', `translate(0, ${coreChartHeight})`)
    .call(xAxis)

  const yAxis = d3.axisLeft(yScale)

  const yAxisGrid = d3.axisLeft(yScale).tickSize(-coreChartWidth)

  chartCore.append('g').call(yAxis).lower()

  chartCore
    .append('g')
    .call(yAxisGrid)
    .call(g => {
      g.selectAll('.tick line').attr('opacity', 0.3)
      g.selectAll('.tick text').remove()
    })
    .call(g => g.select('.domain').remove())
    .lower()

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })

  const colorScaleForLegend = d3.scaleOrdinal(colorsRgba).domain(yFields)
  widgetsRight.html(
    swatches({
      color: colorScaleForLegend,
      uid: 'rs',
      customClass: '',
    }),
  )
}
