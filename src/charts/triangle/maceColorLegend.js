export function renderMaceColorLegend({
  selection,
  circleRadius = 5,
  stickLength = 30,
  stickWidth = 2,
  gapForText = 5,
  gapBetweenMaces = 6,
  colorScale,
}) {
  // Note: Do not remove
  // for reference structure of colorScale
  // const colorScale = [
  //   { label: 'first', color: 'red' },
  //   { label: 'second', color: 'blue' },
  //   { label: 'third', color: 'green' },
  // ]

  const singleMaceSectionHeight = 2 * circleRadius + gapBetweenMaces

  const colorLegend = selection
  const colorLegendMain = colorLegend
    .append('g')
    .attr('class', 'color-legend cursor-pointer')
    .attr('transform', `translate(0, ${singleMaceSectionHeight / 2})`)

  const legendMaces = colorLegendMain
    .selectAll('g.legend-mace')
    .data(colorScale)
    .join('g')
    .attr('class', 'legend-mace')

  // .attr('transform', (d, i) => `translate(0,${i + singleMaceSectionHeight})`)
  legendMaces
    .append('circle')
    .attr('cx', circleRadius + stickLength)
    .attr('cy', (d, i) => i * singleMaceSectionHeight)
    .attr('r', circleRadius)
    .attr('fill', d => d.color)

  legendMaces
    .append('rect')
    .attr('width', stickLength)
    .attr('height', stickWidth)
    // .attr('y')
    .attr('y', (d, i) => i * singleMaceSectionHeight - stickWidth / 2)
    .attr('fill', d => d.color)

  legendMaces
    .append('text')
    .attr('x', 2 * circleRadius + stickLength + gapForText)
    .attr('y', (d, i) => i * singleMaceSectionHeight)
    .text(d => d.label)
    .attr('dominant-baseline', 'middle')
    .style('font-size', 10)
    .attr('fill', d => d.color)

  // TODO translate?

  const colorLegendBoundingBox = colorLegendMain.node().getBBox()
  colorLegend
    .attr('height', colorLegendBoundingBox.height + 5)
    .attr('width', colorLegendBoundingBox.width)
}
