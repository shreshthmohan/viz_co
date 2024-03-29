/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'
import { formatNumber } from '../../utils/helpers/formatters'

import { preventOverflow, toClassText } from '../../utils/helpers/general'
import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'

export function renderChart({
  data,
  dimensions: { xFieldStart, xFieldEnd, yField, connectionField },
  options: {
    aspectRatio = 2,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    connectionColor = 'steelblue',
    hoverConnectionColor = 'orange',
    connectionCircleRadius = 5,
    connectionLineWidth = 2,

    yAxisValueFormatter = '.2s',
    xAxisValueFormatter = '.2s',

    defaultState = [],

    xAxisPosition = 'bottom',
    xAxisLabelOffset = 40,
    xAxisLabelFontSize = 12,
    xAxisColor = '#333',
    xAxisLabel = xFieldStart,

    yAxisPosition = 'right',
    yAxisLabelOffset = 50,
    yAXisLabelFontSize = 12,
    yAxisColor = '#333',
    yAxisLabel = yField,

    inactiveOpacity = 0.2,
    searchOpacity = 0.8,
    activeOpacity = 1,

    searchInputClassNames = '',
    showAllButtonClassNames = '',
    clearAllButtonClassNames = '',
    goToInitialStateButtonClassNames = '',
  },
  chartContainerSelector,
}) {
  applyInteractionStyles({
    activeOpacity,
    inactiveOpacity,
    connectionColor,
    hoverConnectionColor,
    searchOpacity,
  })

  const tooltipDiv = initializeTooltip()

  const coreChartWidth = 1200
  const { svg, widgetsLeft, coreChartHeight, allComponents, chartCore } =
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

  const { dataParsed, connectionValues, defaultStateAll } = parseData({
    data,
    xFieldStart,
    xFieldEnd,
    yField,
    connectionField,
    defaultState,
  })

  const { yScale, xScale } = setupScales({
    dataParsed,
    coreChartHeight,
    coreChartWidth,
    yField,
    xFieldStart,
    xFieldEnd,
  })

  renderXAxis({
    chartCore,
    coreChartHeight,
    coreChartWidth,
    xScale,
    xAxisValueFormatter,
    xAxisPosition,
    xAxisLabelOffset,
    xAxisLabelFontSize,
    xAxisColor,
    xAxisLabel,
  })

  renderYAxis({
    chartCore,
    coreChartHeight,
    coreChartWidth,
    yScale,
    yAxisValueFormatter,
    yAxisPosition,
    yAxisLabelOffset,
    yAXisLabelFontSize,
    yAxisColor,
    yAxisLabel,
  })

  renderConnections({
    chartCore,
    dataParsed,
    defaultStateAll,
    xFieldStart,
    xFieldEnd,
    xScale,
    yScale,
    yField,
    tooltipDiv,
    connectionField,
    connectionLineWidth,
    connectionCircleRadius,
    xAxisValueFormatter,
  })

  const handleSearch = searchEventHandler(connectionValues)
  const search = setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    connectionField,
    svg,
  })

  setupInitialStateButton({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
    svg,
  })

  setupClearAllButton({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
    svg,
  })

  setupShowAllButton({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
    svg,
  })

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles({
  activeOpacity,
  inactiveOpacity,
  connectionColor,
}) {
  d3.select('body').append('style').html(`
  g.connections g.connection{
    cursor: pointer;
  }
  g.connections g.connection{
    fill-opacity: ${inactiveOpacity};
    stroke-opacity: ${inactiveOpacity};
    stroke: ${connectionColor};
    fill: ${connectionColor};
    stroke-width: 3;
  }
  g.connections g.connection.connection-active {
    fill-opacity: ${activeOpacity};
    stroke-opacity: ${activeOpacity};
    stroke: ${connectionColor};
    fill: ${connectionColor};
    stroke-width: 3;
  }
  g.connections.searching g.connection.connection-matched{
    stroke: #333;
    stroke-width: 3;
    stroke-opacity: ${activeOpacity};
  }
  g.connections g.connection.connection-hovered {
    stroke: #333;
    stroke-width: 3;
    stroke-opacity: ${activeOpacity};
  }
  `)
}

function parseData({
  data,
  xFieldStart,
  xFieldEnd,
  yField,
  connectionField,
  defaultState,
}) {
  const dataParsed = _.map(data, el => {
    const elParsed = { ...el }
    elParsed[xFieldStart] = Number.parseFloat(el[xFieldStart])
    elParsed[xFieldEnd] = Number.parseFloat(el[xFieldEnd])
    elParsed[yField] = Number.parseFloat(el[yField])
    return elParsed
  })

  const connectionValues = _(data).map(connectionField).uniq().value()
  const defaultStateAll =
    defaultState === 'All' ? connectionValues : defaultState

  return { dataParsed, connectionValues, defaultStateAll }
}

function setupScales({
  dataParsed,
  coreChartHeight,
  coreChartWidth,
  yField,
  xFieldStart,
  xFieldEnd,
}) {
  const xDomainStart = _.map(dataParsed, xFieldStart)
  const xDomainEnd = _.map(dataParsed, xFieldEnd)
  const xDomain = d3.extent([0, ...xDomainStart, ...xDomainEnd])
  const xScale = d3
    .scaleLinear()
    .domain(xDomain)
    .range([0, coreChartWidth])
    .nice()

  const yDomain = d3.extent([0, ..._.map(dataParsed, yField)])
  const yScale = d3
    .scaleLinear()
    .domain(yDomain)
    .range([coreChartHeight, 0])
    .nice()

  return { yScale, xScale }
}

function renderXAxis({
  chartCore,
  coreChartHeight,
  xScale,
  xAxisValueFormatter,
  xAxisPosition,
  xAxisLabelOffset,
  xAxisLabelFontSize,
  xAxisColor,
  coreChartWidth,
  xAxisLabel,
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

  xAxis.tickFormat(val => formatNumber(val, xAxisValueFormatter))

  const xAxisGroup = chartCore
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${axisOffset})`)
    .call(xAxis)

  xAxisGroup
    .append('text')
    // .attr('text-anchor', 'middle')
    // .attr('dominant-baseline', 'middle')
    .style('font-size', `${xAxisLabelFontSize}px`)
    .attr('fill', xAxisColor)
    .attr('transform', `translate(${coreChartWidth / 2}, ${labelOffset})`)
    .text(xAxisLabel)
}

function renderYAxis({
  chartCore,
  coreChartWidth,
  yScale,
  yAxisValueFormatter,
  yAxisPosition,
  yAxisLabelOffset,
  yAXisLabelFontSize,
  yAxisColor,
  coreChartHeight,
  yAxisLabel,
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

  yAxis.tickFormat(val => formatNumber(val, yAxisValueFormatter))

  const yAxisGroup = chartCore
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(${axisOffset},0)`)
    .call(yAxis)

  yAxisGroup
    .append('text')
    // .attr('text-anchor', 'middle')
    // .attr('dominant-baseline', 'middle')
    .style('font-size', `${yAXisLabelFontSize}px`)
    .attr('fill', yAxisColor)
    .attr(
      'transform',
      `translate(${labelOffset}, ${coreChartHeight / 2}) rotate(-90)`,
    )
    .text(yAxisLabel)
}

function renderConnections({
  chartCore,
  dataParsed,
  defaultStateAll,
  xFieldStart,
  xFieldEnd,
  xScale,
  yScale,
  yField,
  tooltipDiv,
  connectionField,
  connectionLineWidth,
  connectionCircleRadius,
  xAxisValueFormatter,
}) {
  const cGroup = chartCore
    .append('g')
    .attr('class', `connections ${_.isEmpty(defaultStateAll) ? '' : 'default'}`)
    .selectAll('g')
    .data(dataParsed)
    .join('g')
    .attr(
      'class',
      d =>
        `connection 
      connection-${toClassText(d[connectionField])}
      ${
        defaultStateAll.includes(d[connectionField]) ? 'connection-active' : ''
      }`,
    )
    .on('mouseover', (e, d) => {
      d3.select(e.target.parentNode).classed('connection-hovered', true)

      tooltipDiv.transition().duration(200).style('opacity', 1)

      tooltipDiv.html(
        `${d[connectionField]}: ${formatNumber(
          d[xFieldStart],
          xAxisValueFormatter,
        )} → ${formatNumber(d[xFieldEnd], xAxisValueFormatter)}
        `,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target.parentNode).classed('connection-hovered', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })
    .on('click', e => {
      const parentConnection = d3.select(e.target.parentNode)
      const clickedState = parentConnection.classed('connection-active')
      parentConnection.classed('connection-active', !clickedState)
    })

  cGroup
    .append('path')
    .attr('d', d =>
      d3.line()([
        [xScale(d[xFieldStart]), yScale(0)],
        [xScale(d[xFieldEnd]), yScale(d[yField])],
      ]),
    )
    .attr('stroke-width', connectionLineWidth)

  cGroup
    .append('circle')
    .attr('cx', d => xScale(d[xFieldStart]))
    .attr('cy', yScale(0))
    .attr('r', connectionCircleRadius)
    .attr('fill', 'white')

  cGroup
    .append('circle')
    .attr('cx', d => xScale(d[xFieldEnd]))
    .attr('cy', d => yScale(d[yField]))
    .attr('r', connectionCircleRadius)
}

const searchEventHandler = referenceList => (qstr, svg) => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      // d3.selectAll('.mace').classed('mace-active', false)
      const connectionName = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        svg
          .select(`.connection-${connectionName}`)
          .classed('connection-matched', true)
      } else {
        svg
          .select(`.connection-${connectionName}`)
          .classed('connection-matched', false)
      }
      svg.select('g.connections').classed('searching', true)
    })
  } else {
    referenceList.forEach(val => {
      const connectionName = toClassText(val)
      svg
        .select(`.connection-${connectionName}`)
        .classed('connection-matched', false)
    })
    svg.select('.connection').classed('searching', false)
  }
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  connectionField,
  svg,
}) {
  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  // TODO: refactor hidden, won't be needed if we add this node
  search.attr('placeholder', `Find by ${connectionField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr, svg)
  })
  return search
}

function setupClearAllButton({
  widgetsLeft,
  clearAllButtonClassNames,
  search,
  handleSearch,
  svg,
}) {
  const clearAll = widgetsLeft
    .append('button')
    .text('Clear All')
    .attr('class', clearAllButtonClassNames)
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    d3.selectAll('.connection').classed('connection-active', false)
    search.node().value = ''
    handleSearch('', svg)
  })
}

function setupShowAllButton({
  widgetsLeft,
  showAllButtonClassNames,
  search,
  handleSearch,
  svg,
}) {
  const showAll = widgetsLeft
    .append('button')
    .text('Show All')
    .attr('class', showAllButtonClassNames)
  showAll.classed('hidden', false)
  showAll.on('click', () => {
    d3.selectAll('.connection').classed('connection-active', true)
    search.node().value = ''
    handleSearch('', svg)
  })
}

function setupInitialStateButton({
  widgetsLeft,
  goToInitialStateButtonClassNames,
  defaultStateAll,
  search,
  handleSearch,
  svg,
}) {
  const goToInitialState = widgetsLeft
    .append('button')
    .text('Go to Initial State')
    .attr('class', goToInitialStateButtonClassNames)
  goToInitialState.classed('hidden', false)
  goToInitialState.on('click', () => {
    d3.selectAll('.connection').classed('connection-active', false)
    _.forEach(defaultStateAll, val => {
      d3.select(`.connection-${toClassText(val)}`).classed(
        'connection-active',
        true,
      )
    })
    search.node().value = ''
    handleSearch('', svg)
  })
}
