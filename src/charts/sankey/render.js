/* eslint-disable no-import-assign */
/* global window */
import * as d3_ from 'd3'
import {
  sankey,
  sankeyCenter,
  sankeyLeft,
  sankeyJustify,
  sankeyRight,
} from 'd3-sankey'
import { preventOverflow } from '../../utils/helpers/general'

// Done this so as to keep the ESM and UMD global interoperable
// Mimics behaviour of d3 UMD (sankey can be used as d3.sankey, so it should be usable here as d3.sankey too)
// TODO: test this when doing an ESM with bundler demo
// d3_ to prevent rollup error: "Illegal reassignment to import 'd3'"

const d3 = d3_

d3.sankey = sankey
d3.sankeyCenter = sankeyCenter
d3.sankeyLeft = sankeyLeft
d3.sankeyJustify = sankeyJustify
d3.sankeyRight = sankeyRight

const alignOptions = {
  justify: 'sankeyJustify',
  left: 'sankeyLeft',
  right: 'sankeyRight',
  center: 'sankeyCenter',
}

export function renderChart({
  data,
  options: {
    aspectRatio = 2,

    marginTop = 10,
    marginRight = 0,
    marginBottom = 10,
    marginLeft = 50,

    bgColor = 'transparent',

    align = 'justify',

    verticalGapInNodes = 10,
    nodeWidth = 20,

    units = '',
    format = '',

    searchInputClassNames = '',
  },
  dimensions: { sourceField, targetField, valueField },

  chartContainerSelector,
}) {
  const linkColorBy = {
    input: 'input',
    output: 'output',
    inputOutput: 'inputOutput',
    none: 'none',
  }

  const formatLinkThicknessValue = (val, unit) => {
    const formatter = d3.format(format)
    return unit ? `${formatter(val)} ${unit}` : formatter(val)
  }

  const chosenAlign = alignOptions[align]

  // NOTE: Currently only 'inputOutput' is supported
  // Don't expose unless done
  const chosenLinkColor = linkColorBy.inputOutput

  // apply interaction styles
  d3.select('body').append('style').html(`
    .sankey-nodes.hovering g:not(.active) * {
      opacity: 0.1;
    }
    .sankey-links.hovering g:not(.active) {
      opacity: 0.1;
    }
    
    .sankey-nodes.searching:not(.hovering) g:not(.node-matched) {
      opacity: 0.1;
    }
    .sankey-links.searching:not(.hovering) g:not(.node-matched) > path {
      opacity: 0.1;
    }`)

  const coreChartWidth = 1000

  const coreChartHeight = coreChartWidth / aspectRatio

  const viewBoxHeight = coreChartHeight + marginTop + marginBottom
  const viewBoxWidth = coreChartWidth + marginLeft + marginRight

  const chartParent = d3.select(chartContainerSelector)

  const widgets = chartParent
    .append('div')
    .attr(
      'style',
      'display: flex; justify-content: space-between; padding-bottom: 0.5rem;',
    )
  const widgetsLeft = widgets
    .append('div')
    .attr('style', 'display: flex; align-items: end; column-gap: 5px;')

  const svg = chartParent
    .append('svg')
    .attr('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`)
    .style('background', bgColor)

  const allComponents = svg.append('g').attr('class', 'all-components')

  const chartCore = allComponents
    .append('g')
    .attr('transform', `translate(${marginLeft}, ${marginTop})`)

  const tooltipDiv = d3
    .select('body')
    .append('div')
    .attr('class', 'dom-tooltip')
    .attr(
      'style',
      'opacity: 0; position: absolute; text-align: center; background-color: white; border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; border-width: 1px;',
    )

  const colorScheme = d3.scaleOrdinal(d3.schemeCategory10)

  // Sankey data is a list of links (source, target and thickness value of each link)
  const links = data.map(d => ({
    source: d[sourceField],
    target: d[targetField],
    value: d[valueField],
  }))

  // Extract all unique nodes (sources and targets) from list of links
  const nodes = [...new Set(links.flatMap(l => [l.source, l.target]))].map(
    name => ({
      name,
      category: name.replace(/ .*/, ''),
    }),
  )

  const sankeyGenerator = d3
    .sankey()
    .nodeId(d => d.name)
    .nodeAlign(d3[chosenAlign])
    .nodeWidth(nodeWidth)
    .nodePadding(verticalGapInNodes)
    // space taken up by sankey diagram
    .extent([
      [0, 0],
      [coreChartWidth, coreChartHeight],
    ])

  const sankeyfied = sankeyGenerator({
    nodes,
    links,
    units,
  })

  const colorScale = d =>
    colorScheme(d.category === undefined ? d.name : d.category)

  function getConnections(o, direction) {
    return o.source && o.target
      ? getConnectionsLink(o, direction)
      : getConnectionsNode(o, direction)
  }

  function getConnectionsLink(o, direction = 'both') {
    let connections = [o]

    if (direction === 'source' || direction === 'both') {
      connections = [...connections, ...getConnectionsNode(o.source, 'source')]
    }
    if (direction === 'target' || direction === 'both') {
      connections = [...connections, ...getConnectionsNode(o.target, 'target')]
    }

    return connections
  }

  function getConnectionsNode(o, direction = 'both') {
    let connections = [o]

    if (direction === 'source' || direction === 'both') {
      o.targetLinks.forEach(function (p) {
        connections = [...connections, ...getConnectionsLink(p, direction)]
      })
    }
    if (direction === 'target' || direction === 'both') {
      o.sourceLinks.forEach(function (p) {
        connections = [...connections, ...getConnectionsLink(p, direction)]
      })
    }

    return connections
  }

  const link = chartCore
    .append('g')
    .attr('class', 'sankey-links')
    .attr('fill', 'none')
    .attr('stroke-opacity', 0.5)
    .selectAll('g')
    .data(sankeyfied.links)
    .join('g')
    .attr('class', 'sankey-link')
    .attr('id', d => `iv-link-${d.index}`)
    .style('mix-blend-mode', 'multiply')
    .on('mouseover', (e, thisNode) => {
      const sel = [thisNode]
      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          sel.push(p)
        })
      })

      d3.select('.sankey-nodes').classed('hovering', true)
      d3.select('.sankey-links').classed('hovering', true)

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          d3.select(`#iv-link-${item.index}`).classed('active', true)
        } else {
          // else item is a node
          d3.select(`#iv-node-${item.index}`).classed('active', true)
        }
      })

      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv.html(
        `${thisNode.source.name} → ${
          thisNode.target.name
        }<br />${formatLinkThicknessValue(thisNode.value, units)} `,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', (e, thisNode) => {
      const sel = [thisNode]
      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          sel.push(p)
        })
      })

      d3.select('.sankey-nodes').classed('hovering', false)
      d3.select('.sankey-links').classed('hovering', false)

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          d3.select(`#iv-link-${item.index}`).classed('active', false)
        } else {
          // else item is a node
          d3.select(`#iv-node-${item.index}`).classed('active', false)
        }
      })
      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  if (chosenLinkColor === linkColorBy.inputOutput) {
    const gradient = link
      .append('linearGradient')
      .attr('id', d => `iv-link-gradient-${d.index}`)

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', d => colorScale(d.source))

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', d => colorScale(d.target))
  }

  link
    .append('path')
    .attr('d', d3.sankeyLinkHorizontal())
    .attr('stroke', d => {
      return `url(#iv-link-gradient-${d.index})`
    })
    .attr('stroke-width', d => Math.max(1, d.width))
    .attr('stroke-opacity', 0.5)

  const node = chartCore
    .append('g')
    // .attr("stroke", "#0004")
    .attr('class', 'sankey-nodes')
    .selectAll('g')
    .data(sankeyfied.nodes)
    .join('g')
    .attr('class', 'sankey-node')
    .attr('id', d => `iv-node-${d.index}`)

  node
    .append('rect')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('height', d => d.y1 - d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('fill', d => colorScale(d))
    .on('mouseover', (e, thisNode) => {
      const sel = [thisNode]
      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          sel.push(p)
        })
      })

      d3.select('.sankey-nodes').classed('hovering', true)
      d3.select('.sankey-links').classed('hovering', true)

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          d3.select(`#iv-link-${item.index}`).classed('active', true)
        } else {
          // else item is a node
          d3.select(`#iv-node-${item.index}`).classed('active', true)
        }
      })

      tooltipDiv.transition().duration(200).style('opacity', 1)
      tooltipDiv.html(
        `${thisNode.name}<br />${formatLinkThicknessValue(
          thisNode.value,
          units,
        )}`,
      )
      tooltipDiv
        .style('left', `${e.clientX}px`)
        .style('top', `${e.clientY + 20 + window.scrollY}px`)
    })
    .on('mouseout', (e, thisNode) => {
      const sel = [thisNode]
      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          sel.push(p)
        })
      })

      d3.select('.sankey-nodes').classed('hovering', false)
      d3.select('.sankey-links').classed('hovering', false)

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          d3.select(`#iv-link-${item.index}`).classed('active', false)
        } else {
          // else item is a node
          d3.select(`#iv-node-${item.index}`).classed('active', false)
        }
      })

      tooltipDiv
        .style('left', '-300px')
        .transition()
        .duration(500)
        .style('opacity', 0)
    })

  node
    .append('text')
    .text(d => d.name)
    .attr('font-family', 'sans-serif')
    .attr('font-size', 10)
    .attr('x', d => (d.x0 < coreChartWidth / 2 ? d.x1 + 6 : d.x0 - 6))
    .attr('y', d => (d.y1 + d.y0) / 2)
    .attr('dy', '0.35em')
    .attr('text-anchor', d => (d.x0 < coreChartWidth / 2 ? 'start' : 'end'))

  const search = widgetsLeft
    .append('input')
    .attr('type', 'text')
    .attr('class', searchInputClassNames)
  search.attr('placeholder', `Find by node`)

  search.on('keyup', e => {
    const qstr = e.target.value

    if (qstr) {
      // reset matched state for all links and nodes because
      // it we don't want matched states to accumulate as we type
      // the matched elements should only correspond to the current qstr
      d3.selectAll('.sankey-link').classed('node-matched', false)
      d3.selectAll('.sankey-node').classed('node-matched', false)

      const lqstr = qstr.toLowerCase()
      const sel = []
      sankeyfied.nodes.forEach(thisNode => {
        const { name } = thisNode
        if (name.toLowerCase().includes(lqstr)) {
          sel.push(thisNode)
        }
      })

      sel.forEach(function (o) {
        getConnections(o).forEach(function (p) {
          // Only push new elements if they don't already exist inside sel array
          if (
            !sel.find(el => {
              // check if link is already in sel array
              if (el.source && el.target && p.source && p.target) {
                return el.index === p.index
              }
              // check if node is already in sel array
              if (
                el.sourceLinks &&
                el.targetLinks &&
                p.sourceLinks &&
                p.targetLinks
              ) {
                return el.index === p.index
              }
              return false
            })
          ) {
            sel.push(p)
          }
        })
      })

      sel.forEach(item => {
        // if sel item is a link
        if (item.source && item.target) {
          d3.select(`#iv-link-${item.index}`).classed('node-matched', true)
        } else {
          // else item is a node
          d3.select(`#iv-node-${item.index}`).classed('node-matched', true)
        }
      })
      d3.select('.sankey-nodes').classed('searching', true)
      d3.select('.sankey-links').classed('searching', true)
    } else {
      sankeyfied.nodes.forEach(thisNode => {
        const { index } = thisNode
        d3.select(`#iv-node-${index}`).classed('node-matched', false)
      })
      d3.select('.sankey-nodes').classed('searching', false)
      d3.select('.sankey-links').classed('searching', false)
    }
  })
  preventOverflow({
    allComponents,
    svg,
    margins: { marginLeft, marginRight, marginTop, marginBottom },
  })
}
