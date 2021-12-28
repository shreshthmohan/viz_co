/* global window*/

import * as d3 from 'd3'
import _ from 'lodash-es'

import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'

import { preventOverflow, toClassText } from '../../utils/helpers/general'
import { swatches } from '../../utils/helpers/colorLegend'
import { formatNumber } from '../../utils/helpers/formatters'
import { dashedLegend } from '../overlap_area/dashedLegend'
import { lineBandLegend } from '../line_band_scatter/lineBandLegend'

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

    glyphSize = 5,

    connectorSize = 5,
    connectorColorStrategy = 'farFromReference',
    connectorColorCustom,
    connectorLegendLabelBefore = '',
    connectorLegendLabelAfter = '',

    referenceValue = 0,
    referenceLineColor = '#fff',
    referenceLineWidth = 2,
    referenceLineOpacity = 1,
    referenceLabel = '',

    beforeLegendLabel = beforeField,
    afterLegendLabel = afterField,

    topicLabelFontSize = 12,
    topicLabelTextColor = '#000',
    topicLabelYOffset = 0,

    defaultState = [],

    xScaleType = 'linear', // linear or log
    xScaleLogBase = 10, // applicable only if log scale
    xAxisPosition = 'top',
    xAxisOffset = 0,
    xAxisLabel = '',
    xAXisLabelFontSize = 12,
    xAxisLabelOffset = 30,
    xAxisCustomDomain,
    xAxisTickFontSize = 12,
    xAxisColor = 'black',
    xAxisTickValues,
    xAxisTickOffset = 0,
    xAxisLineThickness = 1,
    xAxisTickFormatter = '',
    xAxisTickRotation = 0,
    xAxisTickAnchor = 'middle',
    xAxisTickBaseline = 'middle',
    xAxisTickValueXOffset = 0,
    xAxisTickValueYOffset = 0,

    activeOpacity = 1,
    inactiveOpacity = 0.3,

    valuePrefix = '',
    valuePostfix = '',
    valueFormatter = '',

    topicLabelXOffset = 5,

    // Opinionated (currently cannot be changed from options)
    yPaddingInner = 0.6,
    yPaddingOuter = 1,

    goToInitialStateButtonClassNames = '',
    searchInputClassNames = '',
    clearAllButtonClassNames = '',
    showAllButtonClassNames = '',
  },
  dimensions: { beforeField, afterField, topicField },
  chartContainerSelector,
}) {
  const valFormatter = val =>
    `${valuePrefix}${formatNumber(val, valueFormatter)}${valuePostfix}`

  applyInteractionStyles({ inactiveOpacity, activeOpacity })

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
  const topicValues = _(data).map(topicField).uniq().value()
  const defaultStateAll = defaultState === 'All' ? topicValues : defaultState

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
    xScaleType,
    xScaleLogBase,
  })

  renderConnectorLegends({
    connectorColorStrategy,
    connectorLegendLabelBefore,
    connectorLegendLabelAfter,
    beforeFieldColor,
    afterFieldColor,
    widgetsRight,
  })

  renderRefLineLegend({
    referenceLabel,
    referenceLineColor,
    widgetsRight,
    referenceLineWidth,
    referenceLineOpacity,
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
    xAxisTickOffset,
    xAxisLineThickness,
    xAxisTickFormatter,
    xAxisTickRotation,
    xAxisTickAnchor,
    xAxisTickBaseline,
    xAxisTickValueXOffset,
    xAxisTickValueYOffset,
  })

  renderReferenceLine({
    chartCore,
    referenceValue,
    xScale,
    yScale,
    referenceLineColor,
    referenceLineWidth,
    referenceLineOpacity,
    xAxisOffset,
    xAxisTickOffset,
    line,
    xAxisPosition,
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
    topicLabelXOffset,
    line,
    defaultStateAll,
    topicLabelFontSize,
    topicLabelTextColor,
    topicLabelYOffset,
    connectorColorCustom,
    referenceValue,
    connectorColorStrategy,
    tooltipDiv,
    valFormatter,
  })

  const handleSearch = searchEventHandler(topicValues)
  const search = setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    topicField,
  })

  setupInitialStateButton({
    widgetsLeft,
    goToInitialStateButtonClassNames,
    defaultStateAll,
    search,
    handleSearch,
  })

  setupClearAllButton({
    widgetsLeft,
    clearAllButtonClassNames,
    search,
    handleSearch,
  })

  setupShowAllButton({
    widgetsLeft,
    showAllButtonClassNames,
    search,
    handleSearch,
  })

  // For responsiveness
  // adjust svg to prevent overflows
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function applyInteractionStyles({ inactiveOpacity, activeOpacity }) {
  d3.select('body')
    .append('style')
    .html(
      `
      g.topics g.topic{
        cursor: pointer;
      }
      g.topics g.topic{
        fill-opacity: ${inactiveOpacity};
        stroke-opacity: ${inactiveOpacity};
      }
      g.topics g.topic.topic-active {
        fill-opacity: ${activeOpacity};
        stroke-opacity: ${activeOpacity};
      }
      g.topics.searching g.topic.topic-matched circle{
        stroke: #333;
        stroke-width: 3;
        stroke-opacity: ${activeOpacity};
      }
      g.topics.searching g.topic.topic-matched text{
        fill-opacity: ${activeOpacity};
      }
      g.topics.searching g.topic.topic-matched path{
        stroke: #333;
        stroke-opacity: ${activeOpacity};
      }
      g.topics g.topic.topic-hovered circle{
        stroke: #333;
        stroke-width: 3;
        stroke-opacity: ${activeOpacity};
      }
      g.topics g.topic.topic-hovered text{
        fill-opacity: ${activeOpacity};
      }
      g.topics g.topic.topic-hovered path{
        stroke: #333;
        stroke-opacity: ${activeOpacity};
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
  xScaleType,
  xScaleLogBase,
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

  const xScale =
    xScaleType === 'log'
      ? d3.scaleLog().base(xScaleLogBase || 10)
      : d3.scaleLinear()

  xScale.domain(xDomain).range([0, coreChartWidth])

  if (!xAxisCustomDomain) xScale.nice()

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
  let xAxis, axisOffset, labelOffset, tickOffset
  if (xAxisPosition === 'top') {
    xAxis = d3.axisTop(xScale)
    axisOffset = -xAxisOffset
    labelOffset = xAxisLabelOffset
    tickOffset = -xAxisTickOffset
  } else {
    xAxis = d3.axisBottom(xScale)
    axisOffset = coreChartHeight + xAxisOffset
    labelOffset = -xAxisLabelOffset
    tickOffset = xAxisTickOffset
  }
  const tickSize = -coreChartHeight - xAxisTickOffset - xAxisOffset

  const xAxisGroup = chartCore
    .append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${axisOffset})`)

  const xDomain = xScale.domain()
  const tickValues =
    xAxisTickValues &&
    _.filter(xAxisTickValues, val => val >= xDomain[0] && val <= xDomain[1])

  xAxisGroup
    .call(
      xAxis
        .tickSize(tickSize)
        .tickSizeOuter(10)
        .tickValues(tickValues)
        .tickFormat(val => formatNumber(val, xAxisTickFormatter)),
    )
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
        .style('font-size', `${xAxisTickFontSize}px`)
        .attr('fill', xAxisColor)
        .attr('transform', function () {
          const { x, y, width, height } = this.getBBox()
          return `translate(0, ${tickOffset}), rotate(${xAxisTickRotation},${x + width / 2},${y + height / 2})`
        })
        .attr('text-anchor', xAxisTickAnchor)
        .attr('dominant-baseline', xAxisTickBaseline)
        .attr('dx', `${xAxisTickValueXOffset}em`)
        .attr('dy', `${xAxisTickValueYOffset}em`)
    })

  xAxisGroup
    .append('text')
    .attr('transform', `translate(${coreChartWidth / 2}, ${-labelOffset})`)
    .text(xAxisLabel)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', `${xAXisLabelFontSize}px`)
    .attr('fill', xAxisColor)
}

function renderReferenceLine({
  chartCore,
  referenceValue,
  xScale,
  yScale,
  referenceLineColor,
  referenceLineWidth,
  referenceLineOpacity,
  xAxisOffset,
  xAxisTickOffset,
  xAxisPosition,
}) {
  chartCore
    .append('path')
    .attr('class', 'reference')
    .attr('d', () => {
      const yDomain = yScale.domain()
      // const { x, y, width, height } = d3.select('.domain').node().getBBox()
      const x0 = xScale(Number(referenceValue))
      let y0, y1
      if (xAxisPosition === 'top') {
        y0 = yScale(yDomain[0]) - xAxisOffset - xAxisTickOffset
        y1 = yScale(yDomain[yDomain.length - 1]) + 2 * yScale.bandwidth()
      } else {
        y0 =
          yScale(yDomain[yDomain.length - 1]) +
          yScale.bandwidth() +
          xAxisOffset +
          xAxisTickOffset
        y1 = yScale(yDomain[0]) - 2 * yScale.bandwidth()
      }
      const d_ = [
        { x: x0, y: y0 },
        { x: x0, y: y1 },
      ]

      return d3
        .line()
        .x(d => d.x)
        .y(d => d.y)(d_)
    })
    .attr('stroke-width', referenceLineWidth)
    .attr('opacity', referenceLineOpacity)
    .attr('stroke', referenceLineColor)
    .attr('stroke-dasharray', '5,5')
}

function renderBullets({
  chartCore,
  data,
  topicField,
  beforeField,
  afterField,
  connectorSize,
  afterFieldColor,
  glyphSize,
  beforeFieldColor,
  xScale,
  yScale,
  topicLabelXOffset,
  line,
  defaultStateAll,
  topicLabelFontSize,
  topicLabelTextColor,
  topicLabelYOffset,
  connectorColorCustom,
  connectorColorStrategy,
  referenceValue,
  tooltipDiv,
  valFormatter,
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
    .attr(
      'class',
      d =>
        `topic 
        topic-${toClassText(d[topicField])}
        ${defaultStateAll.includes(d[topicField]) ? 'topic-active' : ''}`,
    )
    .attr('id', d => `${d[topicField]}`)
    .on('mouseover', (e, d) => {
      d3.select(e.target.parentNode).classed('topic-hovered', true)
      tooltipDiv.transition().duration(200).style('opacity', 1)

      tooltipDiv.html(
        `${d[topicField]}
        <br/>
        <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${beforeFieldColor}"></div> ${beforeField}: ${valFormatter(
          d[beforeField],
        )}
        <br />
        <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${afterFieldColor}"></div> ${afterField}: ${valFormatter(
          d[afterField],
        )}
        `,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target.parentNode).classed('topic-hovered', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })
    .on('click', e => {
      const parentTopic = d3.select(e.target.parentNode)
      const clickedState = parentTopic.classed('topic-active')
      parentTopic.classed('topic-active', !clickedState)
    })

  yGroupsEnter
    .append('path')
    .attr('class', 'connector')
    .attr('d', d => {
      const d_ = [
        { x: Number(d[beforeField]), y: d[topicField] },
        { x: Number(d[afterField]), y: d[topicField] },
      ]
      return line(d_)
    })
    .attr('stroke-width', connectorSize)
    .attr('stroke', d => {
      const afterDelta = Math.abs(referenceValue - d[afterField])
      const beforeDelta = Math.abs(referenceValue - d[beforeField])
      const beforeAfterDelta = beforeDelta - afterDelta
      let color
      if (connectorColorStrategy === 'farFromReference') {
        color = beforeAfterDelta < 0 ? afterFieldColor : beforeFieldColor
      } else if (connectorColorStrategy === 'closeToReference') {
        color = beforeAfterDelta < 0 ? beforeFieldColor : afterFieldColor
      } else {
        color = connectorColorCustom
      }
      return color
    })

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
    .attr('x', d => {
      return xScale(d[afterField]) >= xScale(d[beforeField])
        ? xScale(d[afterField]) + glyphSize + topicLabelXOffset
        : xScale(d[afterField]) - glyphSize - topicLabelXOffset
    })
    .attr(
      'y',
      d => yScale(d[topicField]) + topicLabelYOffset + yScale.bandwidth() / 2,
    )
    .attr('fill', topicLabelTextColor)
    .style('font-size', `${topicLabelFontSize}px`)
    .attr('text-anchor', d =>
      xScale(d[afterField]) >= xScale(d[beforeField]) ? 'start' : 'end',
    )
    .attr('dominant-baseline', 'middle')
}

const searchEventHandler = referenceList => qstr => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      // d3.selectAll('.mace').classed('mace-active', false)
      const topicName = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        d3.select(`.topic-${topicName}`).classed('topic-matched', true)
      } else {
        d3.select(`.topic-${topicName}`).classed('topic-matched', false)
      }
      d3.select('.topics').classed('searching', true)
    })
  } else {
    referenceList.forEach(val => {
      const topicName = toClassText(val)
      d3.select(`.topic-${topicName}`).classed('topic-matched', false)
    })
    d3.select('.topics').classed('searching', false)
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
  widgetsRight.append('div').html(
    swatches({
      color: colorScale,
      uid: 'rs',
      customClass: '',
      circle: true,
    }),
  )
}

function setupClearAllButton({
  widgetsLeft,
  clearAllButtonClassNames,
  search,
  handleSearch,
}) {
  const clearAll = widgetsLeft
    .append('button')
    .text('Clear All')
    .attr('class', clearAllButtonClassNames)
  clearAll.classed('hidden', false)
  clearAll.on('click', () => {
    d3.selectAll('.topic').classed('topic-active', false)
    search.node().value = ''
    handleSearch('')
  })
}

function setupShowAllButton({
  widgetsLeft,
  showAllButtonClassNames,
  search,
  handleSearch,
}) {
  const showAll = widgetsLeft
    .append('button')
    .text('Show All')
    .attr('class', showAllButtonClassNames)
  showAll.classed('hidden', false)
  showAll.on('click', () => {
    d3.selectAll('.topic').classed('topic-active', true)
    search.node().value = ''
    handleSearch('')
  })
}

function setupInitialStateButton({
  widgetsLeft,
  goToInitialStateButtonClassNames,
  defaultStateAll,
  search,
  handleSearch,
}) {
  const goToInitialState = widgetsLeft
    .append('button')
    .text('Go to Initial State')
    .attr('class', goToInitialStateButtonClassNames)
  goToInitialState.classed('hidden', false)
  goToInitialState.on('click', () => {
    d3.selectAll('.topic').classed('topic-active', false)
    _.forEach(defaultStateAll, val => {
      d3.select(`.topic-${toClassText(val)}`).classed('topic-active', true)
    })
    search.node().value = ''
    handleSearch('')
  })
}

function renderConnectorLegends({
  connectorColorStrategy,
  connectorLegendLabelBefore,
  connectorLegendLabelAfter,
  beforeFieldColor,
  afterFieldColor,
  widgetsRight,
}) {
  const connectorColorStrategies = ['farFromReference', 'closeToReference']
  if (connectorColorStrategies.includes(connectorColorStrategy)) {
    const lineBandsWithColors = [
      {
        type: 'line',
        line: { label: connectorLegendLabelBefore, color: beforeFieldColor },
      },
      {
        type: 'line',
        line: { label: connectorLegendLabelAfter, color: afterFieldColor },
      },
    ]
    widgetsRight
      .append('div')
      .html(lineBandLegend({ lineBandColorScale: lineBandsWithColors }))
  }
}

function renderRefLineLegend({
  referenceLabel,
  referenceLineColor,
  widgetsRight,
  referenceLineWidth,
  referenceLineOpacity,
}) {
  const verticalDashedLineLabels = [{ series: 'ref', label: referenceLabel }]
  const dashedLegendColor = d3
    .scaleOrdinal()
    .range([referenceLineColor])
    .domain(['ref'])

  widgetsRight.append('div').html(
    dashedLegend({
      labels: verticalDashedLineLabels,
      color: dashedLegendColor,
      swatchWidth: referenceLineWidth,
      lineOpacity: referenceLineOpacity,
    }),
  )
}
