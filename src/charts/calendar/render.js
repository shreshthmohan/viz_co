/* eslint-disable no-import-assign */
/* global window */
import * as d3 from 'd3'
import _ from 'lodash-es'
import { preventOverflow } from '../../utils/helpers/general'
import { swatches } from '../../utils/helpers/colorLegend'

function setupChartArea({
  chartContainerSelector,
  coreChartWidth,
  aspectRatio,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  bgColor,
}) {
  const coreChartHeight = coreChartWidth / aspectRatio

  const viewBoxHeight = coreChartHeight + marginTop + marginBottom
  const viewBoxWidth = coreChartWidth + marginLeft + marginRight

  const chartParent = d3.select(chartContainerSelector)

  const widgets = chartParent
    .append('div')
    .attr(
      'style',
      'display: flex; justify-content: space-between; padding-bottom: 0.5rem;',
    )
  const widgetsLeft = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: end; column-gap: 5px;')
  const widgetsRight = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: center; column-gap: 10px;')

  const svg = chartParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  return {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsLeft,
    widgetsRight,
    viewBoxWidth,
  }
}

function initializeTooltip() {
  return d3
    .select('body')
    .append('div')
    .attr('class', 'dom-tooltip')
    .attr(
      'style',
      'opacity: 0; position: absolute; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
    )
}

function parseData({ data, yFields, nameField, xGridField, yGridField }) {
  let maxSum = 0

  data.forEach(el => {
    let elBucketSum = 0
    yFields.forEach(b => {
      elBucketSum += Number.parseFloat(el[b])
    })

    if (elBucketSum > maxSum) {
      maxSum = elBucketSum
    }
  })
  const maxY = maxSum

  const dataByCell = {}
  data.forEach(sd => {
    const cell = sd[nameField]
    if (dataByCell[cell]) {
      dataByCell[cell].push(sd)
    } else {
      dataByCell[cell] = [sd]
    }
  })

  const stackedDataByYear = {}
  Object.keys(dataByCell).forEach(cl => {
    stackedDataByYear[cl] = d3.stack().keys(yFields)(dataByCell[cl])
  })

  const names = _.uniqBy(
    data.map(d => ({
      [nameField]: d[nameField],
      [xGridField]: d[xGridField],
      [yGridField]: d[yGridField],
    })),
    nameField,
  )

  return { maxY, stackedDataByYear, names }
}

function setupScales({
  data,
  maxY,
  xGridField,
  xGridGap,
  yGridField,
  descending,
  stackHeight,
  xField,
  colorScheme,
  yFields,
  yFieldLabels,
  coreChartWidth,
  coreChartHeight,
}) {
  const yDomain = [0, maxY]

  const xGridDomain = _.uniq(data.map(d => d[xGridField])).sort()

  const xGridScale = d3
    .scaleBand()
    .domain(xGridDomain)
    .range([0, coreChartWidth])
    .paddingInner(xGridGap)

  const xDomain = _.uniq(data.map(d => d[xField])).sort()

  const xScale = d3
    .scaleBand()
    .domain(xDomain)
    .range([0, xGridScale.bandwidth()])

  const yGridDomain = _.uniq(data.map(d => d[yGridField]))
  const yGridRange = [0, coreChartHeight]

  const yGridScale = d3
    .scaleBand()
    .domain(yGridDomain)
    .range(descending ? yGridRange.reverse() : yGridRange)
    .paddingInner(1 - stackHeight)

  const yScale = d3
    .scaleLinear()
    .domain(yDomain)
    .range([yGridScale.bandwidth(), 0])

  const colorScale = d3.scaleOrdinal(colorScheme).domain(yFields)
  const colorScaleForLegend = d3.scaleOrdinal(colorScheme).domain(yFieldLabels)

  return {
    yScale,
    xScale,
    colorScale,
    colorScaleForLegend,
    xGridScale,
    yGridScale,
  }
}

function renderLegends({ widgetsRight, colorScaleForLegend }) {
  widgetsRight.html(
    swatches({
      color: colorScaleForLegend,
      uid: 'rs',
      customClass: '',
    }),
  )
}

function renderCalendar({
  chartCore,
  names,
  xField,
  xGridScale,
  yGridScale,
  xGridField,
  yGridField,
  tooltipDiv,
  stackedDataByYear,
  nameField,
  colorScale,
  xScale,
  yScale,
  uniqueFieldTimeFormatter,
  uniqueFieldTimeParser,
  uniqueColumnField,
  yFields,
  yFieldLabels,
}) {
  chartCore
    .selectAll('g.cell')
    .data(names)
    .join('g')
    .attr(
      'transform',
      d =>
        `translate(
          ${xGridScale(d[xGridField])},
          ${yGridScale(d[yGridField])}
        )`,
    )

    .each(function (d) {
      d3.select(this)
        .selectAll('g')
        .data(stackedDataByYear[d[nameField]])
        .enter()
        .append('g')
        .attr('fill', dd => colorScale(dd.key)) // not to be confused with uniqueColumnField
        .selectAll('rect')
        .data(dd => dd)
        .join('rect')
        .attr('x', dd => xScale(dd.data[xField]))
        .attr('y', dd => yScale(dd[1]))
        .attr('height', dd => yScale(dd[0]) - yScale(dd[1]))
        .attr('width', xScale.bandwidth())
        .on('mouseover', function (e, dd) {
          d3.select(this.parentNode).raise()
          d3.select(this).classed('rect-hovered', true).raise()

          tooltipDiv.transition().duration(200).style('opacity', 1)

          const monthYear =
            d3.timeFormat(uniqueFieldTimeFormatter)(
              d3.timeParse(uniqueFieldTimeParser)(dd.data[uniqueColumnField]),
            ) || dd.data[uniqueColumnField]
          const values = yFields
            .map(
              (yf, i) =>
                `<div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${colorScale(
                  yf,
                )}"></div> ${yFieldLabels[i]}: ${d3.format('.1%')(
                  dd.data[yf],
                )}`,
            )
            .reverse()
          tooltipDiv.html(`<b>${monthYear}</b> <br/> ${values.join('<br/>')}`)
          tooltipDiv
            .style('left', `${e.clientX}px`)
            .style('top', `${e.clientY + 20 + window.scrollY}px`)
        })
        .on('mouseout', function () {
          d3.select(this).classed('rect-hovered', false)

          tooltipDiv
            .style('left', '-300px')
            .transition()
            .duration(500)
            .style('opacity', 0)
        })
    })
    .append('text')
    .text(d => d[nameField])
    .attr('transform', 'translate(0, -5)')
    .attr('font-size', 14)
}

export function renderChart({
  data,
  options: {
    aspectRatio = 0.8,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = '#fafafa',

    colorScheme = d3.schemeRdYlGn[yFields.length],

    descending = true,
    yFieldLabels = yFields,

    // Only used in tooltip, not for caclulating scales
    uniqueFieldTimeParser = '%Y%m',
    uniqueFieldTimeFormatter = '%b %Y',

    xGridGap = 0.02,
    stackHeight = 0.5,
  },
  dimensions: {
    xGridField,
    yGridField,
    xField,
    nameField,
    yFields,
    uniqueColumnField,
  },
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

  const tooltipDiv = initializeTooltip()

  const { maxY, stackedDataByYear, names } = parseData({
    data,
    yFields,
    nameField,
    xGridField,
    yGridField,
  })

  const {
    yScale,
    xScale,
    colorScale,
    colorScaleForLegend,
    xGridScale,
    yGridScale,
  } = setupScales({
    data,
    maxY,
    xGridField,
    xGridGap,
    yGridField,
    descending,
    stackHeight,
    xField,
    colorScheme,
    yFields,
    yFieldLabels,
    coreChartWidth,
    coreChartHeight,
  })

  renderCalendar({
    chartCore,
    names,
    xField,
    xGridScale,
    yGridScale,
    xGridField,
    yGridField,
    tooltipDiv,
    stackedDataByYear,
    nameField,
    colorScale,
    xScale,
    yScale,
    uniqueFieldTimeFormatter,
    uniqueFieldTimeParser,
    uniqueColumnField,
    yFields,
    yFieldLabels,
  })

  renderLegends({ widgetsRight, colorScaleForLegend })

  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
