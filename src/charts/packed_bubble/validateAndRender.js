import * as d3 from 'd3'
import { renderChart } from './render'
import { fileExtension } from '../../utils/helpers/general'

export function validateAndRender({
  dataPath,
  dimensions,
  options,
  chartContainerSelector,
}) {
  d3[fileExtension(dataPath)](dataPath).then(data => {
    renderChart({ data, dimensions, options, chartContainerSelector })
  })
}
