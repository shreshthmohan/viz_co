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

import { d3ColorSchemeOptions } from '../../utils/constants'

import { renderChart } from './render'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'

const dimensionTypes = {
  sizeField: [], // TODO default size if missing
  xField: [shouldNotBeBlank, shouldBeNumber],
  yField: [shouldNotBeBlank, shouldBeNumber],
  timeField: [shouldNotBeBlank],
  nameField: [shouldNotBeBlank],
  colorField: [], // TODO default color if missing, or color by name?
}

const optionTypes = {
  aspectRatio: checkNumberBetween([0.01, Number.POSITIVE_INFINITY]),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  sizeRange: checkNumericArray,
  xDomainCustom: checkNumericArray,
  yDomainCustom: checkNumericArray,

  inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
  numberOfColors: checkNumberBetween([3, 9]), // minumum: 3, maximum: 9

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

  d3.csv(dataPath).then(data => {
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
