import * as d3 from 'd3'
import { setupChartArea } from '../../utils/helpers/commonChartHelpers'

export function renderChart({
  data,
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
    collisionDistance = 0.5,

    circleDiameter = 400,
  },
  dimensions: { sizeField, yField, nameField },
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
  // console.log(yScale.range())

  const bubbles = chartCore.append('g').attr('class', 'bubbles')

  const yColorScale = d3
    .scaleQuantize()
    .domain(yDomain)
    .range(customColorScheme || d3[inbuiltScheme][numberOfColors])
    .nice()

  function ticked() {
    const u = bubbles.selectAll('circle').data(parsedData)
    u.enter()
      .append('circle')
      .attr('r', d => sizeScale(d[sizeField]))
      .style('fill', function (d) {
        return yColorScale(d[yField])
      })
      .attr('stroke', 'gray')
      // .attr('stroke', function (d) {
      //   return d3.rgb(yColorScale(d[yField])).darker(0.5)
      // })
      .merge(u)
      .attr('cx', function (d) {
        return d.x
      })
      .attr('cy', function (d) {
        return d.y
      })

    u.exit().remove()
  }

  d3.forceSimulation(parsedData)
    .force('y', d3.forceY(d => yScale(d[yField])).strength(0.2))

    .force(
      'collision',
      d3
        .forceCollide(function (d) {
          return sizeScale(d[sizeField]) + collisionDistance
        })
        .strength(0.8),
    )
    .force('center', d3.forceCenter(coreChartWidth / 2, coreChartHeight / 2))
    .force(
      'radial',
      d3
        .forceRadial(70, coreChartWidth / 2, coreChartHeight / 2)
        .strength(0.15),
    )

    .force('manyBody', d3.forceManyBody().distanceMax(100).strength(-12))
    // .alphaDecay(0.01)
    .on('tick', ticked)
}
