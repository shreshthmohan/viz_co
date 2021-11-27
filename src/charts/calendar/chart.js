/* global swatches, preventOverflow */
const svgParentNodeSelector = '#svg-container'

function renderChart({ data, options, dimensions }) {
  const {
    xGridField,
    yGridField,
    xField,
    nameField,
    yFields,
    uniqueColumnField,
  } = dimensions
  const {
    heading = '{{ heading }}',
    subheading = '{{ subheading }}',

    aspectRatio = 0.8,

    containerWidth = 'max-w-screen-xl',

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
  } = options

  d3.select('#main-container').classed(`${containerWidth}`, true)

  d3.select('#chart-heading').node().textContent = heading
  d3.select('#chart-subheading').node().textContent = subheading

  const tooltipDiv = d3
    .select('body')
    .append('div')
    .attr(
      'class',
      'dom-tooltip absolute bg-white rounded px-2 py-1 text-xs border',
    )
    .style('opacity', 0)

  const coreChartWidth = 1200
  const coreChartHeight = coreChartWidth / aspectRatio

  const viewBoxHeight = coreChartHeight + marginTop + marginBottom
  const viewBoxWidth = coreChartWidth + marginLeft + marginRight

  const svgParent = d3.select(svgParentNodeSelector)

  const svg = svgParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

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

  const colorScale = d3.scaleOrdinal(colorScheme).domain(yFields)
  const colorScaleForLegend = d3.scaleOrdinal(colorScheme).domain(yFieldLabels)

  const names = _.uniqBy(
    data.map(d => ({
      [nameField]: d[nameField],
      [xGridField]: d[xGridField],
      [yGridField]: d[yGridField],
    })),
    nameField,
  )

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
                `<div class="w-2 h-2 inline-block" style="background: ${colorScale(
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

  d3.select('#color-legend').html(
    swatches({
      color: colorScaleForLegend,
      uid: 'rs',
      customClass: 'font-nunito font-bold',
    }),
  )

  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
