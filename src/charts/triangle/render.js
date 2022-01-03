/* global window */

import * as d3 from 'd3'
import _ from 'lodash-es'
import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'
import { renderDirectionLegend } from '../../utils/helpers/directionLegend'
import { formatNumber } from '../../utils/helpers/formatters'
import { toClassText, preventOverflow } from '../../utils/helpers/general'
import { maceShape, pointsToRotationAngle } from '../mace/helpers'
import { renderMaceColorLegend } from './maceColorLegend'

export function renderChart({
  data,
  options: {
    directionStartLabel = 'start point',
    directionEndLabel = 'end point',

    circleRadius = 3,
    lineWidth = 1,

    stickLength = 30,
    stickWidth = 1,
    directionLegendGapForText = 3,

    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 0,

    valuePrefix = '',
    valuePostfix = '',
    valueFormat = '',

    bgColor = 'transparent',

    colorScheme = ['red', 'orange', 'blue'],
    fieldLabels,

    activeOpacity = 0.8,
    inactiveOpacity = 0.2,
    defaultState = [],

    searchInputClassNames = '',
    goToInitialStateButtonClassNames = '',
    clearAllButtonClassNames = '',
    showAllButtonClassNames = '',

    colorLegendClassNames = '',
    directionLegendClassNames = '',
  },
  dimensions: { startField, endField, nameField },

  chartContainerSelector,
}) {
  const aspectRatio = 2 / Math.sqrt(3)

  const valueFormatter = val =>
    `${valuePrefix}${formatNumber(val, valueFormat)}${valuePostfix}`

  applyInteractionStyles({ activeOpacity, inactiveOpacity })

  const coreChartWidth = 600
  const {
    svg,
    coreChartHeight,
    allComponents,
    chartCore,
    widgetsRight,
    widgetsLeft,
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

  const dataParsed = data.map(el => {
    const elParsed = { ...el }

    elParsed[`__orig${startField[0]}__`] = Number.parseFloat(el[startField[0]])
    elParsed[`__orig${startField[1]}__`] = Number.parseFloat(el[startField[1]])
    elParsed[`__orig${startField[2]}__`] = Number.parseFloat(el[startField[2]])
    elParsed[`__orig${endField[0]}__`] = Number.parseFloat(el[endField[0]])
    elParsed[`__orig${endField[1]}__`] = Number.parseFloat(el[endField[1]])
    elParsed[`__orig${endField[2]}__`] = Number.parseFloat(el[endField[2]])

    elParsed['__startFieldTotal__'] =
      elParsed[`__orig${startField[0]}__`] +
      elParsed[`__orig${startField[1]}__`] +
      elParsed[`__orig${startField[2]}__`]
    elParsed['__endFieldTotal__'] =
      elParsed[`__orig${endField[0]}__`] +
      elParsed[`__orig${endField[1]}__`] +
      elParsed[`__orig${endField[2]}__`]

    elParsed[startField[0]] =
      elParsed[startField[0]] / elParsed['__startFieldTotal__']
    elParsed[startField[1]] =
      elParsed[startField[1]] / elParsed['__startFieldTotal__']
    elParsed[startField[2]] =
      elParsed[startField[2]] / elParsed['__startFieldTotal__']
    elParsed[endField[0]] =
      elParsed[endField[0]] / elParsed['__endFieldTotal__']
    elParsed[endField[1]] =
      elParsed[endField[1]] / elParsed['__endFieldTotal__']
    elParsed[endField[2]] =
      elParsed[endField[2]] / elParsed['__endFieldTotal__']

    return elParsed
  })

  // TODO: add note about hardcoded domain
  const triangleSide = (coreChartHeight * 2) / Math.sqrt(3)
  const xScale = d3.scaleLinear().range([0, triangleSide]).domain([0, 1])

  const deToxy = ({ d, e }) => {
    return [xScale(d + e / 2), ((xScale(1) - xScale(e)) * Math.sqrt(3)) / 2]
  }

  const projectionsOnSides = ({ d, e, f }) => {
    const bottomPrejection = [xScale(d), (Math.sqrt(3) * xScale(1)) / 2]
    const rightPrejection = [
      xScale(1) - Math.cos(Math.PI / 3) * xScale(e),
      Math.sin(Math.PI / 3) * xScale(1 - e),
    ]
    const leftPrejection = [
      Math.cos(Math.PI / 3) * xScale(1 - f),
      Math.sin(Math.PI / 3) * xScale(f),
    ]
    return [bottomPrejection, rightPrejection, leftPrejection]
  }

  const centroid = { d: 1 / 3, e: 1 / 3, f: 1 / 3 }
  const bottomCenter = { d: 1 / 2, e: 0, f: 1 / 2 }
  const leftCenter = { d: 0, e: 1 / 2, f: 1 / 2 }
  const rightCenter = { d: 1 / 2, e: 1 / 2, f: 0 }

  const bottomRight = { d: 1, e: 0, f: 0 }
  const top = { d: 0, e: 1, f: 0 }
  const bottomLeft = { d: 0, e: 0, f: 1 }

  // There are three tridants in this coordinate system
  // like there are 4 quadrants in the cartesian coordinate system
  const topTridant = [
    deToxy(centroid),
    deToxy(leftCenter),
    deToxy(top),
    deToxy(rightCenter),
  ]
  const leftTridant = [
    deToxy(centroid),
    deToxy(leftCenter),
    deToxy(bottomLeft),
    deToxy(bottomCenter),
  ]
  const rightTridant = [
    deToxy(centroid),
    deToxy(rightCenter),
    deToxy(bottomRight),
    deToxy(bottomCenter),
  ]

  const defaultStateAll = defaultState === 'All' ? nameValues : defaultState

  const tridants = [rightTridant, topTridant, leftTridant]
  chartCore
    .append('g')
    .attr('class', 'tridants')
    .selectAll('path.tridant')
    .data(tridants)
    .join('path')
    .attr('class', 'tridant')
    .attr('d', d3.line())
    .attr('fill', (d, i) => colorScheme[i])
    .attr('opacity', 0.1)

  chartCore
    .append('g')
    .attr('class', 'tmaces')
    .selectAll('g')
    // .selectAll('path')
    .data(dataParsed)
    .join('g')
    .attr('class', d => `tmace-g-${toClassText(d[nameField])}`)
    // .join('path')
    .append('path')
    .attr(
      'class',
      d =>
        `tmace tmace-${toClassText(d[nameField])} ${
          defaultStateAll.includes(d[nameField]) ? 'tmace-active' : ''
        }`,
    )
    .attr('d', d => {
      // debugger
      const [x1, y1] = deToxy({ d: d[startField[0]], e: d[startField[1]] })
      const [x2, y2] = deToxy({ d: d[endField[0]], e: d[endField[1]] })
      const macePoints = maceShape({
        x1,
        y1,
        x2,
        y2,
        circleRadius,
        stickWidth: lineWidth,
      })
      return d3.lineRadial()(macePoints)
    })
    .attr('transform', d => {
      const [x1, y1] = deToxy({ d: d[startField[0]], e: d[startField[1]] })
      const [x2, y2] = deToxy({ d: d[endField[0]], e: d[endField[1]] })
      const rotationAngle = pointsToRotationAngle({ x1, y1, x2, y2 })
      return `translate(${x2}, ${y2}) rotate(${rotationAngle})`
    })
    .attr('fill', d => {
      const maxDim = greater({
        d: d[endField[0]],
        e: d[endField[1]],
        f: d[endField[2]],
      })

      switch (maxDim) {
        case 'd':
          return colorScheme[0]
        case 'e':
          return colorScheme[1]
        case 'f':
          return colorScheme[2]
        default:
          return 'gray'
      }
    })
    .each(function (d) {
      const hoverGroup = d3
        .select(this.parentNode)
        .append('g')
        .attr('class', 'hover-group')

      const [bp, rp, lp] = projectionsOnSides({
        d: d[endField[0]],
        e: d[endField[1]],
        f: d[endField[2]],
      })
      const startPoint = deToxy({ d: d[endField[0]], e: d[endField[1]] })

      hoverGroup
        .append('circle')
        .attr('class', 'hover-circle')
        .attr('cx', bp[0])
        .attr('cy', bp[1])
        .attr('r', 5)
        .attr('fill', colorScheme[0])

      hoverGroup
        .append('path')
        .attr('class', 'hover-line')
        .attr('d', () => {
          return d3
            .line()
            .x(d => d.x)
            .y(d => d.y)([
            { x: startPoint[0], y: startPoint[1] },
            { x: bp[0], y: bp[1] },
          ])
        })
        .attr('stroke', colorScheme[0])

      hoverGroup
        .append('circle')
        .attr('class', 'hover-circle')
        .attr('cx', rp[0])
        .attr('cy', rp[1])
        .attr('r', 5)
        .attr('fill', colorScheme[1])

      hoverGroup
        .append('path')
        .attr('class', 'hover-line')
        .attr('d', () => {
          return d3
            .line()
            .x(d => d.x)
            .y(d => d.y)([
            { x: startPoint[0], y: startPoint[1] },
            { x: rp[0], y: rp[1] },
          ])
        })
        .attr('stroke', colorScheme[1])

      hoverGroup
        .append('circle')
        .attr('class', 'hover-circle')
        .attr('cx', lp[0])
        .attr('cy', lp[1])
        .attr('r', 5)
        .attr('fill', colorScheme[2])

      hoverGroup
        .append('path')
        .attr('class', 'hover-line')
        .attr('d', () => {
          return d3
            .line()
            .x(d => d.x)
            .y(d => d.y)([
            { x: startPoint[0], y: startPoint[1] },
            { x: lp[0], y: lp[1] },
          ])
        })
        .attr('stroke', colorScheme[2])
    })
    .on('mouseover', (e, d) => {
      d3.select(this).classed('hovered', true)
      d3.select(e.target.nextSibling).classed('hover-group-active', true)

      tooltipDiv.transition().duration(200).style('opacity', 1)

      tooltipDiv.html(`${d[nameField]}
      <br/>
      <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${
        colorScheme[0]
      }"></div> ${fieldLabels[0]}: ${valueFormatter(
        d[startField[0]],
      )} → ${valueFormatter(d[endField[0]])}
      <br/> 
      <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${
        colorScheme[1]
      }"></div> ${fieldLabels[1]}: ${valueFormatter(
        d[startField[1]],
      )} → ${valueFormatter(d[endField[1]])}
      <br/>
      <div style="display: inline-block; height: 0.5rem; width: 0.5rem; background: ${
        colorScheme[2]
      }"></div> ${fieldLabels[2]}: ${valueFormatter(
        d[startField[2]],
      )} → ${valueFormatter(d[endField[2]])}
      `)
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', e => {
      d3.select(e.target.nextSibling).classed('hover-group-active', false)
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })
    .on('click', e => {
      const tMace = d3.select(e.target)
      const clickedState = tMace.classed('tmace-active')
      tMace.classed('tmace-active', !clickedState)
    })

  const nameValues = dataParsed.map(d => d[nameField])
  const handleSearch = searchEventHandler(nameValues)
  const search = setupSearch({
    handleSearch,
    widgetsLeft,
    searchInputClassNames,
    nameField,
    chartContainerSelector,
    nameValues,
  })

  const axes = chartCore.append('g').attr('class', 'axes')

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

  const bottomAxis = axes
    .append('g')
    .attr('transform', `translate(0, ${coreChartHeight})`)

  bottomAxis
    .call(d3.axisBottom(xScale).ticks(4).tickFormat(valueFormatter))
    .call(g => {
      g.selectAll('.tick text')
        .attr('transform', 'rotate(30)')
        .attr('fill', colorScheme[0])
        .classed('font-nunito', true)
      g.selectAll('.tick line')
        .attr('transform', 'rotate(30)')
        .attr('stroke', colorScheme[0])
      g.selectAll('.tick:first-of-type line').remove()
      g.selectAll('.tick:last-of-type line').remove()
      g.select('.domain').remove()
    })

  bottomAxis
    .append('text')
    .attr('transform', `translate(${deToxy(bottomCenter)[0]}, ${30})`)
    .text(fieldLabels[0])
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '12px')
    .attr('fill', colorScheme[0])

  const rightAxis = axes
    .append('g')
    .attr(
      'transform',
      `translate(${triangleSide}, ${coreChartHeight}) rotate(-120)`,
    )

  rightAxis
    .call(d3.axisBottom(xScale).ticks(4).tickFormat(valueFormatter))
    .call(g => {
      g.selectAll('.tick text')
        .attr('transform', 'translate(4, 18) rotate(120)')
        .attr('fill', colorScheme[1])
        .classed('font-nunito', true)
      g.selectAll('.tick line')
        .attr('transform', 'rotate(30)')
        .attr('stroke', colorScheme[1])
      g.select('.domain').remove()

      g.selectAll('.tick:first-of-type line').remove()
      g.selectAll('.tick:last-of-type line').remove()
    })

  rightAxis
    .append('text')
    .attr('transform', `translate(${triangleSide / 2}, ${50}) rotate(180)`)
    .text(fieldLabels[1])
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '12px')
    .attr('fill', colorScheme[1])

  const leftAxis = axes
    .append('g')
    .attr('transform', `translate(${triangleSide / 2}, ${0}) rotate(30)`)

  leftAxis
    .call(d3.axisLeft(xScale).ticks(4).tickFormat(valueFormatter))
    .call(g => {
      g.selectAll('.tick text')
        .attr('transform', 'rotate(30)')
        .attr('fill', colorScheme[2])
        .classed('font-nunito', true)
      g.selectAll('.tick line')
        .attr('transform', 'rotate(30)')
        .attr('stroke', colorScheme[2])
      g.select('.domain').remove()

      g.selectAll('.tick:first-of-type line').remove()
      g.selectAll('.tick:last-of-type line').remove()
    })

  leftAxis
    .append('text')
    .attr('transform', `translate(${-50},${triangleSide / 2}) rotate(-90)`)
    .text(fieldLabels[2])
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('font-size', '12px')
    .attr('fill', colorScheme[2])

  // leftAxis.attr('transform', `translate(${triangleSide / 2}, ${0}) rotate(30)`)

  renderDirectionLegend({
    selection: widgetsRight
      .append('svg')
      .attr('class', directionLegendClassNames),
    circleRadius,
    stickLength,
    stickWidth,
    gapForText: directionLegendGapForText,
    directionStartLabel,
    directionEndLabel,
  })

  renderMaceColorLegend({
    selection: widgetsRight.append('svg').attr('class', colorLegendClassNames),
    circleRadius,
    stickLength,
    stickWidth,
    gapForText: 5,
    // gapBetweenMaces: 5,
    colorScale: colorScheme.map((c, i) => ({
      color: c,
      label: fieldLabels[i],
    })),
  })

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}

function greater(t) {
  let maxDim = ''
  let maxVal = 0
  // TODO not handled case when two or more are equal
  Object.keys(t).forEach(dim => {
    if (t[dim] > maxVal) {
      maxVal = t[dim]
      maxDim = dim
    }
  })
  return maxDim
}

function applyInteractionStyles({ activeOpacity, inactiveOpacity }) {
  d3.select('body').append('style').html(`  
    .tmace {
      cursor: pointer;
    }
    .tmaces .tmace {
      fill-opacity: ${inactiveOpacity};
    }
    .tmaces .tmace.tmace-active {
      fill-opacity: ${activeOpacity};
    }
    g.tmaces.searching .tmace.tmace-matched {
      stroke: #333;
      stroke-width: 3;
    }
    .tmace:hover {
      stroke: #333;
      stroke-width: 1;
    }
    g.hover-group {
      opacity: 0
    }
    g.hover-group.hover-group-active {
      opacity: 0.5
    }
    .hover-line {
      stroke-dasharray: 5 5
    }
    .hover-circle {
      r: 3
    }
  `)
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
    d3.selectAll('.tmace').classed('tmace-active', false)
    _.forEach(defaultStateAll, val => {
      d3.select(`.tmace-${toClassText(val)}`).classed('tmace-active', true)
    })
    search.node().value = ''
    handleSearch('')
  })
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
    d3.selectAll('.tmace').classed('tmace-active', false)
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
    d3.selectAll('.tmace').classed('tmace-active', true)
    search.node().value = ''
    handleSearch('')
  })
}

const searchEventHandler = referenceList => qstr => {
  if (qstr) {
    const lqstr = qstr.toLowerCase()
    referenceList.forEach(val => {
      const tmaceName = toClassText(val)
      if (val.toLowerCase().includes(lqstr)) {
        d3.select(`.tmace-${tmaceName}`).classed('tmace-matched', true)
      } else {
        d3.select(`.tmace-${tmaceName}`).classed('tmace-matched', false)
      }
      d3.select('.tmaces').classed('searching', true)
    })
  } else {
    referenceList.forEach(val => {
      const tmaceName = toClassText(val)
      d3.select(`.tmace-${tmaceName}`).classed('tmace-matched', false)
    })
    d3.select('.tmaces').classed('searching', false)
  }
}

function setupSearch({
  handleSearch,
  widgetsLeft,
  searchInputClassNames,
  nameField,
  chartContainerSelector,
  nameValues,
}) {
  const enableSearchSuggestions = true

  enableSearchSuggestions &&
    widgetsLeft
      .append('datalist')
      .attr('role', 'datalist')
      // Assuming that chartContainerSelector will always start with #
      // i.e. it's always an id selector of the from #id-to-identify-search
      // TODO add validation
      .attr('id', `${chartContainerSelector.slice(1)}-search-list`)
      .html(
        _(nameValues)
          .uniq()
          .map(el => `<option>${el}</option>`)
          .join(''),
      )

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  // TODO: refactor hidden, won't be needed if we add this node
  enableSearchSuggestions &&
    search.attr('list', `${chartContainerSelector.slice(1)}-search-list`)
  search.attr('placeholder', `Find by ${nameField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    handleSearch(qstr)
  })
  return search
}
