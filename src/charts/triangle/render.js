/* global window */

import * as d3 from 'd3'
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
    aspectRatio = 2 / Math.sqrt(3),

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
    searchInputClassNames = '',
  },
  dimensions: { startField, endField, nameField },

  chartContainerSelector,
}) {
  const valueFormatter = val =>
    `${valuePrefix}${formatNumber(val, valueFormat)}${valuePostfix}`

  d3.select('body').append('style').html(`
  .tmaces.searching .tmace.tmace-matched {
    stroke: #333;
    stroke-width: 1;
  }
  .tmace:hover {
    stroke: #333;
    stroke-width: 1;
  }
  `)

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

    elParsed[startField[0]] = Number.parseFloat(el[startField[0]])
    elParsed[startField[1]] = Number.parseFloat(el[startField[1]])
    elParsed[startField[2]] = Number.parseFloat(el[startField[2]])
    elParsed[endField[0]] = Number.parseFloat(el[endField[0]])
    elParsed[endField[1]] = Number.parseFloat(el[endField[1]])
    elParsed[endField[2]] = Number.parseFloat(el[endField[2]])

    return elParsed
  })

  // TODO: add note about hardcoded domain
  const triangleSide = (coreChartHeight * 2) / Math.sqrt(3)
  const xScale = d3.scaleLinear().range([0, triangleSide]).domain([0, 100])

  const deToxy = ({ d, e }) => {
    return [xScale(d + e / 2), ((xScale(100) - xScale(e)) * Math.sqrt(3)) / 2]
  }

  const centroid = { d: 100 / 3, e: 100 / 3, f: 100 / 3 }
  const bottomCenter = { d: 50, e: 0, f: 50 }
  const leftCenter = { d: 0, e: 50, f: 50 }
  const rightCenter = { d: 50, e: 50, f: 0 }

  const bottomRight = { d: 100, e: 0, f: 0 }
  const top = { d: 0, e: 100, f: 0 }
  const bottomLeft = { d: 0, e: 0, f: 100 }

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
    .selectAll('path')
    .data(dataParsed)
    .join('path')
    .attr('class', d => `tmace tmace-${toClassText(d[nameField])}`)
    .attr('d', d => {
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
    .on('mouseover', (e, d) => {
      // d3.select(this).classed('hovered', true)
      tooltipDiv.transition().duration(200).style('opacity', 1)

      tooltipDiv.html(`${d[nameField]}
      <br/> ${fieldLabels[0]}: ${valueFormatter(
        d[startField[0]],
      )} → ${valueFormatter(d[endField[0]])}
      <br/> ${fieldLabels[1]}: ${valueFormatter(
        d[startField[1]],
      )} → ${valueFormatter(d[endField[1]])}
      <br/> ${fieldLabels[2]}: ${valueFormatter(
        d[startField[2]],
      )} → ${valueFormatter(d[endField[2]])}
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

  // .attr('opacity', 0.8)
  const nameValues = dataParsed.map(d => d[nameField])

  const searchEventHandler = qstr => {
    if (qstr) {
      const lqstr = qstr.toLowerCase()
      nameValues.forEach(val => {
        const tmaceName = toClassText(val)
        if (val.toLowerCase().includes(lqstr)) {
          d3.select(`.tmace-${tmaceName}`).classed('tmace-matched', true)
        } else {
          d3.select(`.tmace-${tmaceName}`).classed('tmace-matched', false)
        }
        d3.select('.tmaces').classed('searching', true)
      })
    } else {
      nameValues.forEach(val => {
        const tmaceName = toClassText(val)
        d3.select(`.tmace-${tmaceName}`).classed('tmace-matched', false)
      })
      d3.select('.tmaces').classed('searching', false)
    }
  }

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  // TODO: refactor hidden, won't be needed if we add this node
  search.attr('placeholder', `Find by ${nameField}`)
  search.on('keyup', e => {
    const qstr = e.target.value
    searchEventHandler(qstr)
  })
  const axes = chartCore.append('g').attr('class', 'axes')

  axes
    .append('g')
    .attr('transform', `translate(0, ${coreChartHeight})`)
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

  axes
    .append('g')
    .attr(
      'transform',
      `translate(${triangleSide}, ${coreChartHeight}) rotate(-120)`,
    )
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

  axes
    .append('g')
    .attr('transform', `translate(${triangleSide / 2}, ${0}) rotate(30)`)
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

  renderDirectionLegend({
    selection: widgetsRight.append('svg'),
    circleRadius,
    stickLength,
    stickWidth,
    gapForText: directionLegendGapForText,
    directionStartLabel,
    directionEndLabel,
  })

  renderMaceColorLegend({
    selection: widgetsRight.append('svg'),
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
