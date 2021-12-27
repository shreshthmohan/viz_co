/* global window */

import * as d3 from 'd3'
import {
  initializeTooltip,
  setupChartArea,
} from '../../utils/helpers/commonChartHelpers'
import { legend } from '../../utils/helpers/colorLegend'
import { circleSizeLegend } from '../../utils/helpers/circleSizeLegend'
import { formatNumber } from '../../utils/helpers/formatters'
// import { preventOverflowThrottled } from '../../utils/helpers/general'

export function renderChart({
  data,
  dimensions: { sizeField, yField, nameField },
  options: {
    aspectRatio = 1,

    marginBottom = 0,
    marginLeft = 0,
    marginRight = 0,
    marginTop = 0,

    bgColor = 'transparent',

    sizeRange = [2, 20],

    customColorScheme,
    inbuiltScheme = 'schemeOrRd',
    numberOfColors = 5,

    colorLegendTitle = yField,

    sizeValueFormat = '',
    sizeValuePrefix = '',
    sizeValuePostfix = '',
    sizeLegendGapInCircles = 10,
    sizeLegendTitle = sizeField,
    sizeLegendValues = [100, 20000, 50000],

    yValueFormat = '',
    yValuePrefix = '',
    yValuePostfix = '',

    searchInputClassNames = '',

    // force simulation options
    collisionDistance = 0.5,
    circleDiameter = 400, // controls yRange
    yForceStrength = 0.5,
    collisionForceStrength = 0.8,
    radialForceCircleDiameter = 140,
    radialForceStrength = 0.15,
    manyBodyForceStrength = -12, // positive means attraction

    // TODO: make circleDiameter and radialForceCircleDiameter as a ratio of coreChartHeight (or Width?)
  },
  chartContainerSelector,
}) {
  d3.select('body').append('style').html(`
    .g-searching circle.c-match {
      stroke-width: 2;
      stroke: #333;
    }
    circle.hovered {
      stroke-width: 2;
      stroke: #333;
    }
  `)

  const tooltipDiv = initializeTooltip()

  const sizeValueFormatter = val =>
    `${sizeValuePrefix}${formatNumber(val, sizeValueFormat)}${sizeValuePostfix}`

  const yValueFormatter = val =>
    `${yValuePrefix}${formatNumber(val, yValueFormat)}${yValuePostfix}`

  const coreChartWidth = 1000
  const {
    // svg,
    coreChartHeight,
    // allComponents,
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

  const parsedData = data.map(d => ({
    ...d,
    [sizeField]: Number.parseFloat(d[sizeField]),
    [yField]: Number.parseFloat(d[yField]),
  }))

  const maxSizeValue = Math.max(...parsedData.map(c => c[sizeField]))

  const yDomain = d3.extent(parsedData.map(d => d[yField]))

  const sizeScale = d3.scaleSqrt().range(sizeRange).domain([0, maxSizeValue])

  const yRange = circleDiameter

  const yScale = d3
    .scaleLinear()
    .domain(yDomain)
    .range([coreChartHeight / 2 - yRange / 2, coreChartHeight / 2 + yRange / 2])

  const bubbles = chartCore.append('g').attr('class', 'bubbles')

  const yColorScale = d3
    .scaleQuantize()
    .domain(yDomain)
    .range(customColorScheme || d3[inbuiltScheme][numberOfColors])
    .nice()

  let allBubbles
  function ticked() {
    const u = bubbles.selectAll('circle').data(parsedData)
    allBubbles = u
      .enter()
      .append('circle')
      .attr('r', d => sizeScale(d[sizeField]))
      .style('fill', function (d) {
        return yColorScale(d[yField])
      })
      .attr('stroke', function (d) {
        return d3.rgb(yColorScale(d[yField])).darker(0.7)
      })
      .merge(u)
      .attr('cx', function (d) {
        return d.x
      })
      .attr('cy', function (d) {
        return d.y
      })
      .on('mouseover', function (e, d) {
        tooltipDiv.transition().duration(200).style('opacity', 1)
        tooltipDiv.html(
          `<div>${d[nameField]}</div>
         <div style="display: flex">
           <div style="text-transform: capitalize">${yField}:</div>
           <div style="padding-left: 0.25rem; font-weight: bold">${yValueFormatter(
             d[yField],
           )}</div>
         </div>
         <div style="display: flex">
           <div style="text-transform: capitalize">${sizeField}:</div>
           <div style="padding-left: 0.25rem; font-weight: bold">${sizeValueFormatter(
             d[sizeField],
           )}</div>
         </div>`,
        )
        tooltipDiv
          .style('left', `${e.clientX}px`)
          .style('top', `${e.clientY + window.scrollY + 30}px`)
        d3.select(this).classed('hovered', true)
      })
      .on('mouseout', function () {
        tooltipDiv.transition().duration(500).style('opacity', 0)
        d3.select(this).classed('hovered', false)
      })

    u.exit().remove()
    // preventOverflowThrottled({
    //   allComponents,
    //   svg,
    //   margins: { marginLeft, marginRight, marginTop, marginBottom },
    // })
  }

  const raidalForceCircleRadius = radialForceCircleDiameter / 2

  d3.forceSimulation(parsedData)
    .force('y', d3.forceY(d => yScale(d[yField])).strength(yForceStrength))
    .force(
      'collision',
      d3
        .forceCollide(function (d) {
          return sizeScale(d[sizeField]) + collisionDistance
        })
        .strength(collisionForceStrength),
    )
    .force('center', d3.forceCenter(coreChartWidth / 2, coreChartHeight / 2))
    .force(
      'radial',
      d3
        .forceRadial(
          raidalForceCircleRadius,
          coreChartWidth / 2,
          coreChartHeight / 2,
        )
        .strength(radialForceStrength),
    )
    .force(
      'manyBody',
      d3.forceManyBody().distanceMax(100).strength(manyBodyForceStrength),
    )
    .on('tick', ticked)

  widgetsRight
    .append('svg')
    .attr('width', 260)
    .attr('height', 45)
    .append(() =>
      legend({
        color: yColorScale,
        title: colorLegendTitle,
        width: 260,
        tickFormat: yValueFormatter,
      }),
    )

  const sizeLegend = widgetsRight.append('svg')

  circleSizeLegend({
    sizeLegendValues,
    sizeScale,
    containerSelection: sizeLegend,
    moveSizeObjectDownBy: 10,
    sizeLegendGapInCircles,
    valueFormatter: sizeValueFormatter,
    sizeLegendTitle,
  })

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
    .attr('placeholder', `Find by ${nameField}`)

  function searchBy(term) {
    if (term) {
      d3.select('.bubbles').classed('g-searching', true)
      allBubbles.classed('c-match', d =>
        d[nameField].toLowerCase().includes(term.toLowerCase()),
      )
    } else {
      d3.select('.bubbles').classed('g-searching', false)
    }
  }

  search.on('keyup', e => {
    searchBy(e.target.value.trim())
  })

  // preventOverflow({
  //   allComponents,
  //   svg,
  //   margins: { marginLeft, marginRight, marginTop, marginBottom },
  // })
}
