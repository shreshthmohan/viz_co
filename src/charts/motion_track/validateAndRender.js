import * as d3 from 'd3'
import {
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkColor,
  checkNumber,
  checkNumberBetween,
  checkNumericArray,
  checkOneOf,
  optionValidation,
} from '../../utils/validation/optionValidations'
import { fileExtension } from '../../utils/helpers/general'

import { d3ColorSchemeOptions } from '../../utils/constants'

import { renderChart } from './render'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'

const dimensionTypes = {
  sizeField: [], // can be empty (if not provided first value in sizeRange will be picked)
  xField: [shouldNotBeBlank, shouldBeNumber],
  yField: [shouldNotBeBlank, shouldBeNumber],
  timeField: [shouldNotBeBlank],
  nameField: [shouldNotBeBlank],
  colorField: [], // can be empty (if not provided, first color from scheme will be picked)
}

const optionTypes = {
  aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  sizeRange: checkNumericArray(2),
  xDomainCustom: checkNumericArray(2),
  yDomainCustom: checkNumericArray(2),

  inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
  numberOfColors: checkNumberBetween(3, 9), // minumum: 3, maximum: 9

  // xAxisLabel: xField,
  // yAxisLabel: yField,

  // startButtonClassNames: '',
  // stopButtonClassNames: '',
  // searchButtonClassNames: '',
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
