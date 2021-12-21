import * as d3 from 'd3'
import {
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkNumber,
  checkOneOf,
  checkColor,
  checkNumberBetween,
  optionValidation,
} from '../../utils/validation/optionValidations'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'
import { renderChart } from './render'
import { fileExtension } from '../../utils/helpers/general'

const dimensionTypes = {
  xField: [shouldNotBeBlank],
  yField: [shouldNotBeBlank],
  colorField: [shouldBeNumber],
  dominoField: [shouldNotBeBlank],
}

const optionTypes = {
  aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  /* Dimensions */
  /* xField */
  xPaddingOuter: checkNumberBetween(0, 1),
  // xAxisLabel: checkString,

  /* yField */
  yPaddingInner: checkNumberBetween(0, 1),
  yPaddingOuter: checkNumberBetween(0, 1),
  ySortOrder: checkOneOf(['asc', 'desc']),

  /* colorField */
  colorStrategy: checkOneOf(['rank', 'value']),
  colorThreshold: checkNumber,
  colorDominoHighlighted: checkColor,
  colorDominoNormal: checkColor,

  /* dominoField */
  dominoSize: checkNumberBetween(0, 1),

  /* Legends */
  // normalLegendLabel: checkString,
  // highlightedLegendLabel: checkString,
}

export const validateAndRender = ({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) => {
  const optionsValidationResult = optionValidation({ optionTypes, options })

  d3[fileExtension(dataPath)](dataPath).then(data => {
    const { columns } = data

    const dimensionValidation = validateColumnsWithDimensions({
      columns,
      dimensions,
    })

    const dataValidations = validateData({ data, dimensionTypes, dimensions })

    // When new validations are added simply add the result to this array
    // When building a new validator the output should be of format:
    // {valid: boolean, message: string}
    const allValidations = [
      dimensionValidation,
      dataValidations,
      optionsValidationResult,
    ]

    const combinedValidation = { valid: true, messages: [] }

    allValidations.forEach(v => {
      combinedValidation.valid = combinedValidation.valid && v.valid
      if (!v.valid) {
        combinedValidation.messages.push(v.message)
      }
    })

    combinedValidation.valid
      ? renderChart({ data, dimensions, options, chartContainerSelector })
      : showErrors(chartContainerSelector, combinedValidation.messages)
  })
}
