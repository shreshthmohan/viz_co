import * as d3 from 'd3'
import { renderChart } from './render'

export const validateAndRender = ({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) => {
  // const optionsValidationResult = optionValidation({ optionTypes, options })

  d3.csv(dataPath).then(data => {
    renderChart({ data, dimensions, options, chartContainerSelector })
  })
}
