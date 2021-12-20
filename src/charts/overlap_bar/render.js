/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'

import { swatches } from '../../utils/helpers/colorLegend'

import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'
import { formatNumber } from '../../utils/helpers/formatters'
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
    barThickness = 0.8,
    outerPadding = 0.2,

    colors = d3.schemeSpectral[9],

    showOnlyEveryNthValue = 1,
    // X-Axis
    xAxisPosition = 'bottom',
    xAxisOffset = 0,
    xAxisLabel = '',
    xAXisLabelFontSize = 12,
    xAxisLabelOffset = 30,
    xAxisCustomDomain,
    xAxisTickFontSize = 12,
    xAxisColor = 'black',
    xAxisTickValues = null,
    xAxisTickOffset = 0,
    xAxisLineThickness = 1,
    xAxisTickFormatter = '',
    xAxisTickRotation = 0,
    xAxisTickAnchor = 'middle',
    xAxisTickBaseline = 'middle',
    xAxisTickValueXOffset,
    xAxisTickValueYOffset,

    yAxisPosition = 'left',
    yAxisLabelOffset = 50,
    yAxisColor = 'black',
    yAxisLabel = '',
    yAxisTickRotation = 0,
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

  // debugger

  const xDomain = dataParsed.map(d => d[xField])
  const xScale = d3
    .scaleBand()
    .range([0, coreChartWidth])
    .domain(xDomain)
    .paddingInner(1 - barThickness)
    .paddingOuter(outerPadding)

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
      .attr('height', d => yScale(0) - yScale(Number.isNaN(d[yf]) ? 0 : d[yf]))
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

  // const xAxis = d3.axisTop(xScale).tickValues(
  //   xScale.domain().filter(function (d, i) {
  //     return !(i % showOnlyEveryNthValue)
  //   }),
  // )

  // chartCore.append('g').attr('transform', `translate(0, ${0})`).call(xAxis)

  renderXAxis({
    chartCore,
    xScale,
    coreChartHeight,
    coreChartWidth,
    xAxisLabelOffset,
    xAxisLabel,
    xAxisPosition,
    xAxisTickOffset,
    xAXisLabelFontSize,
    xAxisTickFontSize,
    xAxisColor,
    xAxisTickValues,
    xAxisOffset,
    xAxisLineThickness,
    xAxisTickFormatter,
    xAxisTickRotation,
    xAxisTickAnchor,
    xAxisTickBaseline,
    xAxisTickValueXOffset,
    xAxisTickValueYOffset,
    showOnlyEveryNthValue,
  })

  renderYAxis({
    yAxisPosition,
    yScale,
    showOnlyEveryNthValue,
    chartCore,
    coreChartWidth,
    yAxisLabelOffset,
    yAxisLabel,
    yAxisColor,
    coreChartHeight,
    yAxisTickRotation,
  })

  const yAxisGrid = d3.axisLeft(yScale).tickSize(-coreChartWidth)
  renderYGrid({ chartCore, yAxisGrid })

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

function renderYAxis({
  yAxisPosition,
  yScale,
  chartCore,
  coreChartWidth,
  coreChartHeight,
  yAxisLabelOffset,
  yAxisLabel,
  yAxisColor,
}) {
  let yAxis, axisOffset, labelOffset
  if (yAxisPosition === 'right') {
    yAxis = d3.axisRight(yScale)
    axisOffset = coreChartWidth
    labelOffset = yAxisLabelOffset
  } else {
    yAxis = d3.axisLeft(yScale)
    axisOffset = 0
    labelOffset = -yAxisLabelOffset
  }

  const yAxisGroup = chartCore
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(${axisOffset},0)`)
    .call(yAxis)

  yAxisGroup
    .append('text')
    // .attr('text-anchor', 'middle')
    // .attr('dominant-baseline', 'middle')
    // .style('font-size', `${xAXisLabelFontSize}px`)
    .attr('fill', yAxisColor)
    .attr(
      'transform',
      `translate(${labelOffset}, ${coreChartHeight / 2}) rotate(-90)`,
    )
    .text(yAxisLabel)
}

function renderYGrid({ chartCore, yAxisGrid }) {
  chartCore
    .append('g')
    .call(yAxisGrid)
    .call(g => {
      g.selectAll('.tick line').attr('opacity', 0.3)
      g.selectAll('.tick text').remove()
    })
    .call(g => g.select('.domain').remove())
    .lower()
}

function renderXAxis({
  xAxisPosition,
  xScale,
  coreChartHeight,
  showOnlyEveryNthValue,
  chartCore,
  coreChartWidth,
  xAxisLabelOffset,
  xAxisLabel,
  xAxisTickOffset,
  xAXisLabelFontSize,
  xAxisTickFontSize,
  xAxisColor,
  xAxisTickValues,
  xAxisOffset,
  xAxisLineThickness,
  xAxisTickFormatter,
  xAxisTickRotation,
  xAxisTickAnchor,
  xAxisTickBaseline,
  xAxisTickValueXOffset,
  xAxisTickValueYOffset,
}) {
  let xAxis, axisOffset, labelOffset
  if (xAxisPosition === 'top') {
    xAxis = d3.axisTop(xScale)
    axisOffset = 0
    labelOffset = -xAxisLabelOffset
  } else {
    xAxis = d3.axisBottom(xScale)
    axisOffset = coreChartHeight
    labelOffset = xAxisLabelOffset
  }

  xAxis.tickValues(
    xScale.domain().filter(function (d, i) {
      return !(i % showOnlyEveryNthValue)
    }),
  )

  const xAxisGroup = chartCore
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${axisOffset})`)
    .call(xAxis)
    .call(g => {
      const tickGroup = g.selectAll('.tick text')
      tickGroup
        .attr('y', 0)
        .attr('dy', '0em')
        .attr('transform', `rotate(${xAxisTickRotation})`)
        .attr('dx', '1em')
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
    })

  xAxisGroup
    .append('text')
    // .attr('text-anchor', 'middle')
    // .attr('dominant-baseline', 'middle')
    // .style('font-size', `${xAXisLabelFontSize}px`)
    .attr('fill', xAxisColor)
    .attr('transform', `translate(${coreChartWidth / 2}, ${labelOffset})`)
    .text(xAxisLabel)
  // let xAxis, axisOffset, labelOffset, tickOffset
  // if (xAxisPosition === 'top') {
  //   xAxis = d3.axisTop(xScale)
  //   axisOffset = -xAxisOffset
  //   labelOffset = xAxisLabelOffset
  //   tickOffset = -xAxisTickOffset
  // } else {
  //   xAxis = d3.axisBottom(xScale)
  //   axisOffset = coreChartHeight + xAxisOffset
  //   labelOffset = -xAxisLabelOffset
  //   tickOffset = xAxisTickOffset
  // }
  // const tickSize = -coreChartHeight - xAxisTickOffset - xAxisOffset

  // const xAxisGroup = chartCore
  //   .append('g')
  //   .attr('class', 'x-axis')
  //   .attr('transform', `translate(0, ${axisOffset})`)

  // const xDomain = xScale.domain()
  // const tickValues =
  //   xAxisTickValues === null
  //     ? null
  //     : _.filter(xAxisTickValues, val => {
  //         return val >= xDomain[0] && val <= xDomain[1]
  //       })

  // xAxisGroup
  //   .call(
  //     xAxis
  //       .tickSize(tickSize)
  //       .tickSizeOuter(10)
  //       .tickValues(tickValues)
  //       .tickFormat(val => formatNumber(val, xAxisTickFormatter)),
  //   )
  //   .call(g =>
  //     g
  //       .select('.domain')
  //       .attr('stroke', xAxisColor)
  //       .attr('stroke-width', xAxisLineThickness),
  //   )
  //   .call(g => {
  //     g.selectAll('.tick line')
  //       .attr('stroke-opacity', 0.2)
  //       .attr('transform', `translate(0, ${tickOffset / 2})`)

  //     const tickGroup = g.selectAll('.tick text')
  //     tickGroup
  //       .style('font-size', `${xAxisTickFontSize}px`)
  //       .attr('fill', xAxisColor)
  //       .attr('transform', function () {
  //         const { x, y, width, height } = this.getBBox()
  //         return `translate(0, ${tickOffset}), rotate(${xAxisTickRotation},${x + width / 2},${y + height / 2})`
  //       })
  //       .attr('text-anchor', xAxisTickAnchor)
  //       .attr('dominant-baseline', xAxisTickBaseline)

  //     if (xAxisTickValueXOffset)
  //       tickGroup.attr('dx', `${xAxisTickValueXOffset}em`)
  //     if (xAxisTickValueYOffset)
  //       tickGroup.attr('dy', `${xAxisTickValueYOffset}em`)
  //   })
}
