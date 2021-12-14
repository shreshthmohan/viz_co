/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'

import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'

import { preventOverflow, toClassText } from '../../utils/helpers/general'
import { swatches } from '../../utils/helpers/colorLegend'

export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    bgColor = 'transparent',

    beforeFieldColor = '#43CAD7',
    afterFieldColor = '#1570A6',
    linkColor = 'farFromReference',
    /* Legends */
    beforeLegendLabel = beforeField,
    afterLegendLabel = afterField,

    /* Axes */
    xAxisPosition = 'top',
    xAxisOffset = 0,
    xAxisLabel = '',
    xAXisLabelFontSize = '12px',
    xAxisLabelOffset = 30,
    xAxisCustomDomain = null,
    xAxisTickFontSize = '12px',
    xAxisColor = 'black',
    xAxisTickValues = null,
    xAxisTickSizeOffset = 0,
    xAxisLineThickness = 1,

    sizeLegendLabelCustom,

    sizeLegendValues = [1, 5, 10, 20],
    sizeLegendGapInSymbols = 25,
    sizeLegendMoveSymbolsDownBy = 15,

    xDomainCustom,

    glyphSize = 5,
    connectorSize = 5,
    activeOpacity = 1,
    inactiveOpacity = 0.3,

    // Labels
    xLabelOffset = 10,

    // Opinionated (currently cannot be changed from options)
    yPaddingInner = 0.6,
    yPaddingOuter = 1,

    searchInputClassNames = '',
  },
  dimensions: { beforeField, afterField, topicField },
  chartContainerSelector,
}) {
  applyInteractionStyles({ inactiveOpacity })

  const coreChartWidth = 1000
  const {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsLeft,
    widgetsRight,
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

  const { yScale, xScale, colorScale } = setupScales({
    coreChartHeight,
    coreChartWidth,
    yPaddingInner,
    yPaddingOuter,
    beforeLegendLabel,
    afterLegendLabel,
    beforeFieldColor,
    afterFieldColor,
    beforeField,
    afterField,
    topicField,
    data,
    xAxisCustomDomain,
  })

  renderLegends({ widgetsRight, colorScale })

  const line = d3
    .line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y))

  renderXAxis({
    chartCore,
    xScale,
    coreChartHeight,
    coreChartWidth,
    xAxisLabelOffset,
    xAxisLabel,
    xAxisPosition,
    xAXisLabelFontSize,
    xAxisTickFontSize,
    xAxisColor,
    xAxisTickValues,
    xAxisOffset,
    xAxisTickSizeOffset,
    xAxisLineThickness,
  })

  renderBullets({
    chartCore,
    data,
    topicField,
    activeOpacity,
    beforeField,
    afterField,
    connectorSize,
    afterFieldColor,
    glyphSize,
    beforeFieldColor,
    xScale,
    yScale,
    xLabelOffset,
    line,
  })

  const topicValues = _(data).map(topicField).uniq().value()

  const handleSearch = searchEventHandler(topicValues)
  setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    topicField,
  })

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles({ inactiveOpacity }) {
  d3.select('body')
    .append('style')
    .html(
      `.g-interaction .topic:not(.g-match, .g-hover) {
        opacity: ${inactiveOpacity};
      }
      `,
    )
}

function setupScales({
  coreChartHeight,
  coreChartWidth,
  yPaddingInner,
  yPaddingOuter,
  beforeLegendLabel,
  afterLegendLabel,
  beforeFieldColor,
  afterFieldColor,
  beforeField,
  afterField,
  topicField,
  data,
  xAxisCustomDomain,
}) {
  const yDomain = _.map(data, topicField)
  const xDomainDefault = d3.extent(
    _.concat(
      _.map(data, d => Number.parseFloat(d[beforeField])),
      _.map(data, d => Number.parseFloat(d[afterField])),
    ),
  )
  const xDomain = (xAxisCustomDomain || xDomainDefault).slice()

  const yScale = d3
    .scaleBand()
    .domain(yDomain)
    .range([0, coreChartHeight])
    .paddingInner(yPaddingInner)
    .paddingOuter(yPaddingOuter)

  const xScale = d3
    .scaleLinear()
    .domain(xDomain)
    .range([0, coreChartWidth])
    .nice()
  // debugger
  const colorScale = d3
    .scaleOrdinal()
    .domain([beforeLegendLabel, afterLegendLabel])
    .range([beforeFieldColor, afterFieldColor])

  return { yScale, xScale, colorScale }
}

function renderXAxis({
  chartCore,
  xScale,
  coreChartHeight,
  coreChartWidth,
  xAxisLabelOffset,
  xAxisLabel,
  xAxisPosition,
  xAxisTickSizeOffset,
  xAXisLabelFontSize,
  xAxisTickFontSize,
  xAxisColor,
  xAxisTickValues,
  xAxisOffset,
  xAxisLineThickness,
}) {
  let xAxis, tickSize, axisOffset, labelOffset, tickOffset
  if (xAxisPosition === 'top') {
    xAxis = d3.axisTop(xScale)
    tickSize = -coreChartHeight
    axisOffset = -xAxisOffset
    labelOffset = xAxisLabelOffset
    tickOffset = -xAxisTickSizeOffset
  } else {
    xAxis = d3.axisBottom(xScale)
    tickSize = coreChartHeight
    axisOffset = xAxisOffset
    labelOffset = -xAxisLabelOffset
    tickOffset = xAxisTickSizeOffset
  }

  const xAxisGroup = chartCore
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${axisOffset})`)

  const xDomain = xScale.domain()
  const tickValues =
    xAxisTickValues === null
      ? null
      : _.filter(xAxisTickValues, val => {
          return val >= xDomain[0] && val <= xDomain[1]
        })

  xAxisGroup
    .call(xAxis.tickSize(tickSize).tickSizeOuter(10).tickValues(tickValues))
    .call(g =>
      g
        .select('.domain')
        .attr('stroke', xAxisColor)
        .attr('stroke-width', xAxisLineThickness),
    )
    .call(g => {
      g.selectAll('.tick line')
        .attr('stroke-opacity', 0.2)
        .attr('transform', `translate(0, ${tickOffset / 2})`)
      g.selectAll('.tick text')
        .attr('transform', `translate(0, ${tickOffset})`)
        .attr('font-size', xAxisTickFontSize)
        .attr('fill', xAxisColor)
    })

  xAxisGroup
    .append('text')
    .attr('transform', `translate(${coreChartWidth / 2}, ${-labelOffset})`)
    .text(xAxisLabel)
    .attr('text-anchor', 'middle')
    .attr('font-size', xAXisLabelFontSize)
    .attr('fill', xAxisColor)

  // d3.select(ctx)
  //   .append('g')
  //   .attr('class', 'x-axis')
  //   .style('font-size', xAxisTicksFontSize)
  //   .attr('transform', `translate(0, ${xAxisOffset})`)
  //   .call(xAxis.tickSize(-yGridScale.bandwidth() - xAxisTickSizeOffset))
  //   .call(g => {
  //     g.selectAll('.domain').attr('stroke', '#333')
  //     g.selectAll('.tick line').attr('stroke', '#333')
  //     g.selectAll('.tick text').attr('fill', '#333')
  //     g.selectAll('.tick line').attr('stroke-opacity', '0.2')
  //     g.select('.domain').remove()
  //     if (i % 2 !== 0 && alternatingTickTextXAxis) {
  //       g.selectAll('.tick text').remove()
  //     }
  //   })
}

function renderBullets({
  chartCore,
  data,
  topicField,
  activeOpacity,
  beforeField,
  afterField,
  connectorSize,
  afterFieldColor,
  glyphSize,
  beforeFieldColor,
  xScale,
  yScale,
  xLabelOffset,
  line,
}) {
  const yGroups = chartCore
    .append('g')
    .attr('class', 'topics')
    .selectAll('g')
    .data(data)

  // enter selection
  const yGroupsEnter = yGroups
    .enter()
    .append('g')
    .attr('class', 'topic')
    .attr('id', d => `${d[topicField]}`)
    .attr('opacity', activeOpacity)
    .on('mouseover', (e, d) => {
      d3.select('.topics').classed('g-interaction', true)
      d3.select(e.target.parentNode).classed('g-hover', true)
    })
    .on('mouseout', (e, d) => {
      d3.select('.topics').classed('g-interaction', false)
      d3.select(e.target.parentNode).classed('g-hover', false)
    })

  yGroupsEnter
    .append('path')
    .attr('d', d => {
      const d_ = [
        { x: Number(d[beforeField]), y: d[topicField] },
        { x: Number(d[afterField]), y: d[topicField] },
      ]
      return line(d_)
    })
    .attr('fill', 'none')
    .attr('stroke-width', connectorSize)
    .attr('stroke', afterFieldColor)

  yGroupsEnter
    .append('circle')
    .attr('cx', d => xScale(d[beforeField]))
    .attr('cy', d => yScale(d[topicField]))
    .attr('r', glyphSize)
    .attr('fill', beforeFieldColor)

  yGroupsEnter
    .append('circle')
    .attr('cx', d => xScale(d[afterField]))
    .attr('cy', d => yScale(d[topicField]))
    .attr('r', glyphSize)
    .attr('fill', afterFieldColor)

  yGroupsEnter
    .append('text')
    .text(d => d[topicField])
    .attr('x', d => glyphSize + xLabelOffset + xScale(d[afterField]))
    .attr('y', d => yScale(d[topicField]))
    .attr('fill', afterFieldColor)
    .attr('dominant-baseline', 'middle')
}

const searchEventHandler = referenceList => qstr => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      // d3.selectAll('.mace').classed('mace-active', false)
      const maceName = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        d3.select(`.mace-${maceName}`).classed('mace-matched', true)
      } else {
        d3.select(`.mace-${maceName}`).classed('mace-matched', false)
      }
      d3.select('.maces').classed('searching', true)
    })
  } else {
    referenceList.forEach(val => {
      const maceName = toClassText(val)
      d3.select(`.mace-${maceName}`).classed('mace-matched', false)
    })
    d3.select('.maces').classed('searching', false)
  }
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  topicField,
}) {
  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  // TODO: refactor hidden, won't be needed if we add this node
  search.attr('placeholder', `Find by ${topicField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr)
  })
  return search
}

function renderLegends({ widgetsRight, colorScale }) {
  widgetsRight.html(
    swatches({
      color: colorScale,
      uid: 'rs',
      customClass: '',
    }),
  )
}
