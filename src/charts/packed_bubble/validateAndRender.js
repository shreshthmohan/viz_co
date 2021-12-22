import * as d3 from 'd3'
import { renderChart } from './render'
import { fileExtension } from '../../utils/helpers/general'
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
  checkColorArray,
  checkOneOf,
  optionValidation,
} from '../../utils/validation/optionValidations'

import { d3ColorSchemeOptions } from '../../utils/constants'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'

const dimensionTypes = {
  sizeField: [shouldBeNumber],
  yField: [shouldBeNumber],
  nameField: [shouldNotBeBlank],
}

const optionTypes = {
  aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  sizeRange: checkNumericArray(2),

  customColorScheme: checkColorArray,
  inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
  numberOfColors: checkNumberBetween(3, 9),

  collisionDistance: checkNumber,

  circleDiameter: checkNumberBetween(0.1, Number.MAX_SAFE_INTEGER),

  // colorLegendTitle = yField,

  // sizeValueFormat = '',
  // sizeValuePrefix = '',
  // sizeValuePostfix = '',
  sizeLegendGapInCircles: checkNumber,
  // sizeLegendTitle = sizeField,
  sizeLegendValues: checkNumericArray(),

  // yValueFormat = '',
  // yValuePrefix = '',
  // yValuePostfix = '',

  // searchInputClassNames = '',
}

export function validateAndRender({
  dataPath,
  dimensions,
  options,
  chartContainerSelector,
}) {
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
