export function circleSizeLegend({
  sizeLegendValues,
  sizeScale,
  containerSelection,
  sizeLegendGapInCircles = 5,
  valueFormatter = a => a,
  sizeLegendTitle,
  moveSizeObjectDownBy = 5,
}) {
  const sizeValues = sizeLegendValues.map(a => sizeScale(a))

  let cumulativeSize = 0
  const cumulativeSizes = []
  sizeValues.forEach((sz, i) => {
    if (i === 0) {
      cumulativeSize += sz
    } else {
      cumulativeSize += sizeValues[i - 1] + sizeValues[i]
    }

    cumulativeSizes.push(cumulativeSize)
  })

  const sizeLegendContainerGroup = containerSelection.append('g')

  sizeLegendContainerGroup
    .append('g')
    .attr('class', 'g-size-container')
    .attr('transform', `translate(0, ${moveSizeObjectDownBy})`)
    .selectAll('.g-size-circle')
    .data(sizeValues)
    .enter()
    .append('g')
    .attr('class', 'g-size-circle')
    .append('circle')
    .attr('r', d => d)
    .style('fill', '#bebebe')
    .style('stroke-width', 1)
    .style('stroke', 'gray')
    .attr('cx', (d, i) => cumulativeSizes[i] + i * sizeLegendGapInCircles + 1)
    .attr('cy', sizeValues[sizeValues.length - 1] + 1)

  sizeLegendContainerGroup
    .selectAll('.g-size-circle')
    .append('text')
    .attr('alignment-baseline', 'middle')
    .attr('dy', sizeValues[sizeValues.length - 1] + 2)
    .attr(
      'dx',
      (d, i) => d + cumulativeSizes[i] + (i + 0.1) * sizeLegendGapInCircles,
    )
    .style('font-size', 8)
    .text((d, i) => valueFormatter(sizeLegendValues[i]))

  sizeLegendContainerGroup
    .append('text')
    .attr('alignment-baseline', 'hanging')
    .style('font-size', 10)
    .style('font-weight', 600)
    .text(sizeLegendTitle)

  const legendBoundingBox = sizeLegendContainerGroup.node().getBBox()
  containerSelection
    .attr('height', legendBoundingBox.height)
    .attr('width', legendBoundingBox.width)
}
