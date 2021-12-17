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
  sourceField: [shouldNotBeBlank],
  targetField: [shouldNotBeBlank],
  valueField: [shouldBeNumber],
}

const optionTypes = {
  aspectRatio: checkNumberBetween([0.01, Number.POSITIVE_INFINITY]),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  align: checkOneOf(['justify', 'left', 'right', 'center']),

  verticalGapInNodes: checkNumber,
  nodeWidth: checkNumber,
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
