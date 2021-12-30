/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'
import { swatches } from '../../utils/helpers/colorLegend'
import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'
import { preventOverflow } from '../../utils/helpers/general'

export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    zoom = 1,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    // background-color
    bgColor = 'transparent',
    colorScheme = d3.schemeSpectral[9],

    yDomainCustom,

    yGridPaddingInner = 0.1,
    showYGridLabels = false,
    yGridLabelFontSize = 12,

    yAxisLocation = 'left',
    yAxisOffset = 10,

    yValueFormatter = '',
    yValuePrefix = '',
    yValueSuffix = '',

    xValueTimeParser = '',
    xValueTimeFormatter = '',
  },
  dimensions: { xGridField, yGridField, xField, yFields },

  chartContainerSelector,
  handleCellMouseover = a => a,
}) {
  const coreChartWidth = 1000 / zoom
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

  const uniqCellField = `${xGridField}-${yGridField}`
  const dataParsed = data.map(el => {
    const elParsed = { ...el }
    let yFieldSum = 0
    yFields.forEach(yf => {
      elParsed[yf] = Number.parseFloat(el[yf])
      yFieldSum += elParsed[yf]
    })
    elParsed.yFieldSum = yFieldSum
    elParsed[uniqCellField] = `${el[xGridField]}-${el[yGridField]}`
    return elParsed
  })

  const yMax = d3.max(dataParsed.map(d => d.yFieldSum))
  const yDomain = yDomainCustom || [0, yMax]
  // console.log({ yDomain })

  const yGridDomain = _.uniq(data.map(d => d[yGridField]))
  const yGridScale = d3
    .scaleBand()
    .domain(yGridDomain)
    .range([0, coreChartHeight])
    // .range(descending ? yGridRange.reverse() : yGridRange)
    .paddingInner(yGridPaddingInner)

  const yScale = d3
    .scaleLinear()
    .range([yGridScale.bandwidth(), 0])
    .domain(yDomain)
    .nice()

  const yTicks = yScale.ticks().length

  const xGridDomain = _.uniq(data.map(d => d[xGridField])).sort()

  const xGridScale = d3
    .scaleBand()
    .domain(xGridDomain)
    .range([0, coreChartWidth])
    .paddingInner(0.2)

  const cells = _.uniqBy(
    dataParsed.map(d => ({
      [xGridField]: d[xGridField],
      [yGridField]: d[yGridField],
      [uniqCellField]: `${d[xGridField]}-${d[yGridField]}`,
    })),
    uniqCellField,
  )

  const dataByCell = {}
  dataParsed.forEach(d => {
    const cell = d[uniqCellField]
    if (dataByCell[cell]) {
      dataByCell[cell].push(d)
    } else {
      dataByCell[cell] = [d]
    }
  })

  const stackedDataByCell = {}
  Object.keys(dataByCell).forEach(c => {
    stackedDataByCell[c] = d3.stack().keys(yFields)(dataByCell[c])
  })
  const colorScale = d3.scaleOrdinal(colorScheme).domain(yFields)

  const yFormatter = t =>
    `${yValuePrefix}${d3.format(yValueFormatter)(t)}${yValueSuffix}`

  chartCore
    .selectAll('g.cell')
    .data(cells)
    .join('g')
    .attr('class', 'cell')
    .attr(
      'transform',
      d =>
        `translate(
            ${xGridScale(d[xGridField])},
            ${yGridScale(d[yGridField])}
          )`,
    )
    .on('mouseover', handleCellMouseover)
    .each(function (d) {
      const xDomain = dataByCell[d[uniqCellField]].map(dc => dc[xField]).sort()

      // Evaluate xScale for each cell to tackle case when x values don't match across cells
      const xScale = d3
        .scaleBand()
        .domain(xDomain)
        .range([0, xGridScale.bandwidth()])

      // Use area with step to avoid jarring rect boundaries
      d3.select(this)
        .selectAll('path')
        .data(stackedDataByCell[d[uniqCellField]])
        .join('path')
        .attr('fill', dd => colorScale(dd.key))
        .attr(
          'd',
          d3
            .area()
            .curve(d3.curveStep)
            .x(function (dd) {
              return xScale(dd.data[xField])
            })
            .y0(function (dd) {
              return yScale(dd[0])
            })
            .y1(function (dd) {
              return yScale(dd[1])
            }),
        )

      // Use transparent rect to trigger tooltip for individual bar stacks
      d3.select(this)
        .selectAll('g')
        .data([stackedDataByCell[d[uniqCellField]][0]])
        .join('g')
        .attr('fill', 'transparent')
        .selectAll('rect')
        .data(dd => dd)
        .join('rect')
        .attr('x', dd => xScale(dd.data[xField]))
        .attr('y', yScale(yScale.domain()[1]))
        .attr('height', yGridScale.bandwidth())
        .attr('width', xScale.bandwidth())
        .on('mouseover', (e, dd) => {
          tooltipDiv.transition().duration(200).style('opacity', 1)

          const xValue = dd.data[xField]
          const xValueParsedFormatted =
            d3.timeFormat(xValueTimeFormatter)(
              d3.timeParse(xValueTimeParser)(xValue),
            ) || xValue
          tooltipDiv.html(`${dd.data[yGridField]}: ${xValueParsedFormatted}
          <br/>
          ${yFields
            .map(
              yf =>
                `<div class="w-2 h-2 inline-block"
                  style="background: ${colorScale(yf)};"></div>
                ${yf}: ${yFormatter(dd.data[yf])}`,
            )
            .join('<br/>')}
          `)

          tooltipDiv
            .style('left', `${e.clientX}px`)
            .style('top', `${e.clientY + 20 + window.scrollY}px`)
        })
        .on('mouseout', () => {
          tooltipDiv
            .style('left', '-300px')
            .transition()
            .duration(500)
            .style('opacity', 0)
        })
      d3.select(this)
        .append('text')
        .text(d[xGridField])
        .style('font-size', 10)
        .attr(
          'transform',
          `translate(${xGridScale.bandwidth() / 2}, ${
            yGridScale.bandwidth() + 5
          })`,
        )
        .attr('dominant-baseline', 'hanging')
        .attr('text-anchor', 'middle')
    })

  const yAxis =
    yAxisLocation === 'left' ? d3.axisLeft(yScale) : d3.axisRight(yScale)
  chartCore
    .append('g')
    .attr('class', 'y-axes')
    .selectAll('g')
    .data(yGridDomain)
    .join('g')
    .attr(
      'transform',
      d =>
        `translate(${
          yAxisLocation === 'left' ? -yAxisOffset : coreChartWidth + yAxisOffset
        }, ${yGridScale(d)})`,
    )
    .call(yAxis.ticks(Math.floor(yTicks / 4)).tickFormat(yFormatter))
    .call(g => {
      g.select('.domain').remove()
    })
  showYGridLabels &&
    chartCore
      .append('g')
      .attr('class', 'y-grid-scale')
      .attr('transform', `translate(0, ${yGridScale.bandwidth() / 2})`)
      .call(d3.axisLeft(yGridScale))
      .call(g => {
        g.select('.domain').remove()
        g.selectAll('.tick line').remove()
        g.selectAll('.tick text')
          .attr('font-weight', 'bold')
          .classed('capitalize', true)
          .attr('dominant-baseline', 'text-after-edge')
          .attr('font-size', yGridLabelFontSize)
      })

  widgetsRight
    .append('div')
    .html(swatches({ color: colorScale, uid: 'stacked-bar-color-legend' }))

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
