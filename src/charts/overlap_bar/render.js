/* global window */

import * as d3 from 'd3'

import { swatches } from '../../utils/helpers/colorLegend'

import { setupChartArea } from '../../utils/helpers/commonChartHelpers'
import { preventOverflow } from '../../utils/helpers/general'

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
  },
  dimensions: { xField, yFields },
  chartContainerSelector,
}) {
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

  const yScale = d3.scaleLinear().range([coreChartHeight, 0]).domain([0, yMax])
  yFields.forEach((yf, i) => {
    chartCore
      .append('g')
      .selectAll('rect')
      .data(dataParsed)
      .join('rect')
      .attr('x', d => xScale(d[xField]))
      .attr('y', d => yScale(d[yf]))
      .attr('height', d => yScale(0) - yScale(d[yf]))
      .attr('width', xScale.bandwidth())
      .attr('fill', colors[i])
      .attr('opacity', barOpacity)
  })
  const xAxis = d3
    .axisBottom(xScale)
    // TODO hardcoded see how to give user some control of this
    .tickValues(
      xScale.domain().filter(function (d, i) {
        return !(i % 10)
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

  const colorsRgba = colors.map(c => {
    const parsedColor = d3.rgb(c)
    parsedColor.opacity = barOpacity
    return parsedColor
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
