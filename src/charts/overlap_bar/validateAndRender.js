import * as d3 from 'd3'

import { renderChart } from './render'

export function validateAndRender({
  dataPath,
  options,
  dimensions,

  chartContainerSelector,
}) {
  d3.csv(dataPath).then(data => {
    renderChart({ data, options, dimensions, chartContainerSelector })
  })
}
