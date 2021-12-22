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
  options: {
    aspectRatio = 2,

    marginTop = 60,
    marginRight = 90,
    marginBottom = 20,
    marginLeft = 50,

    bgColor = 'transparent',

    connectionColor = 'steelblue',
    hoverConnectionColor = 'orange',
    connectionCircleRadius = 5,
    connectionLineWidth = 2,

    yAxisValueFormatter = '.2s',
    xAxisValueFormatter = '.2s',

    defaultState = [],

    inactiveOpacity = 0.2,
    searchOpacity = 0.8,
    activeOpacity = 1,

    searchInputClassNames = '',
  },
  dimensions: { xFieldStart, xFieldEnd, yFieldEnd, connectionField },
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
    yFieldEnd,
    connectionField,
    defaultState,
  })

  const { yScale, xScale } = setupScales({
    dataParsed,
    coreChartHeight,
    coreChartWidth,
    yFieldEnd,
    xFieldStart,
    xFieldEnd,
  })

  renderXAxis({
    chartCore,
    coreChartHeight,
    xScale,
    xAxisValueFormatter,
  })

  renderYAxis({
    chartCore,
    coreChartWidth,
    yScale,
    yAxisValueFormatter,
  })

  renderConnections({
    chartCore,
    dataParsed,
    defaultStateAll,
    xFieldStart,
    xFieldEnd,
    xScale,
    yScale,
    yFieldEnd,
    tooltipDiv,
    connectionField,
    connectionLineWidth,
    connectionCircleRadius,
  })

  const handleSearch = searchEventHandler(connectionValues)
  setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    connectionField,
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
  hoverConnectionColor,
  searchOpacity,
}) {
  d3.select('body').append('style').html(`
  .connection {
    stroke: ${connectionColor};
    fill: ${connectionColor};
    fill-opacity: ${activeOpacity};
    stroke-opacity: ${activeOpacity};
    stroke-width: 3;
  }
  g.connections.default .connection {
    fill-opacity: ${inactiveOpacity};
    stroke-opacity: ${inactiveOpacity};
  }
  g.connections.default .connection.connection-active {
    fill-opacity: ${activeOpacity};
    stroke-opacity: ${activeOpacity};
  }
  g.connections.searching .connection.connection-matched {
    stroke: ${hoverConnectionColor};
    fill: ${hoverConnectionColor};
    fill-opacity: ${searchOpacity};
    stroke-width: 4;
  }
  g.connections g.connection.connection-hovered {
    stroke: ${hoverConnectionColor};
    fill: ${hoverConnectionColor};
    stroke-opacity: ${activeOpacity};
    stroke-width: 4;
  }
  `)
}

function parseData({
  data,
  xFieldStart,
  xFieldEnd,
  yFieldEnd,
  connectionField,
  defaultState,
}) {
  const dataParsed = _.map(data, el => {
    const elParsed = { ...el }
    elParsed[xFieldStart] = Number.parseFloat(el[xFieldStart])
    elParsed[xFieldEnd] = Number.parseFloat(el[xFieldEnd])
    elParsed[yFieldEnd] = Number.parseFloat(el[yFieldEnd])
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
  yFieldEnd,
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

  const yDomain = d3.extent([0, ..._.map(dataParsed, yFieldEnd)])
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
}) {
  const xAxis = chartCore
    .append('g')
    .attr('class', 'text-xs x-axis-top')
    .attr('transform', `translate(0, ${coreChartHeight})`)
  xAxis
    .call(
      d3
        .axisBottom(xScale)
        .ticks(5)
        .tickFormat(val => formatNumber(val, xAxisValueFormatter)),
    )
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
  // .call(g => g.select('.domain').remove())
}

function renderYAxis({
  chartCore,
  coreChartWidth,
  yScale,
  yAxisValueFormatter,
}) {
  const yAxis = chartCore
    .append('g')
    .attr('class', 'text-xs y-axis-right')
    .attr('transform', `translate(${coreChartWidth}, 0)`)
  yAxis
    .call(
      d3
        .axisRight(yScale)
        .ticks(5)
        .tickFormat(val => formatNumber(val, yAxisValueFormatter)),
    )
    .call(g => g.selectAll('.tick line').attr('stroke-opacity', 0.2))
  // .call(g => g.select('.domain').remove())
}

function renderConnections({
  chartCore,
  dataParsed,
  defaultStateAll,
  xFieldStart,
  xFieldEnd,
  xScale,
  yScale,
  yFieldEnd,
  tooltipDiv,
  connectionField,
  connectionLineWidth,
  connectionCircleRadius,
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
        `${d[connectionField]}
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
        [xScale(d[xFieldEnd]), yScale(d[yFieldEnd])],
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
    .attr('cy', d => yScale(d[yFieldEnd]))
    .attr('r', connectionCircleRadius)
}

const searchEventHandler = referenceList => (qstr, svg) => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      // d3.selectAll('.mace').classed('mace-active', false)
      const maceName = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        svg.select(`.mace-${maceName}`).classed('mace-matched', true)
      } else {
        svg.select(`.mace-${maceName}`).classed('mace-matched', false)
      }
      svg.select('.maces').classed('searching', true)
    })
  } else {
    referenceList.forEach(val => {
      const maceName = toClassText(val)
      svg.select(`.mace-${maceName}`).classed('mace-matched', false)
    })
    svg.select('.maces').classed('searching', false)
  }
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  nameField,
  svg,
}) {
  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  // TODO: refactor hidden, won't be needed if we add this node
  search.attr('placeholder', `Find by ${nameField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr, svg)
  })
  return search
}
