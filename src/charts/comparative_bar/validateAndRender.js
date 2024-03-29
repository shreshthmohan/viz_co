import * as d3 from 'd3'

import { renderChart } from './render'

import {
  shouldBeNumber,
  shouldBeUnique,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkNumber,
  checkNumberBetween,
  checkColor,
  checkColorArray,
  optionValidation,
  checkDefaultState,
} from '../../utils/validation/optionValidations'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'
import { fileExtension } from '../../utils/helpers/general'

const dimensionTypes = {
  yField: [shouldBeUnique, shouldNotBeBlank], // Categorical

  // barLeftLabelField: 'Democratic Label', // Categorical
  barLeftValueField: [shouldBeNumber], // Numeric

  // barRightLabelField: 'Republican Label', // Categorical
  barRightValueField: [shouldBeNumber], // Numeric
}

const optionTypes = {
  aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  colorScheme: checkColorArray(2),

  barValueMidPoint: checkNumber,

  xAxisTickSize: checkNumber,
  // leftXAxisLabel: checkString,
  // rightXAxisLabel: checkString,
  // xAxisLabel: checkString,

  defaultState: checkDefaultState,

  inactiveOpacity: checkNumberBetween(0, 1),
  activeOpacity: checkNumberBetween(0, 1),

  // goToInitialStateButtonClassNames: checkStringArray,
  // searchInputClassNames: checkStringArray,
  // clearAllButtonClassNames: checkStringArray,
  // showAllButtonClassNames: checkStringArray,
}

export function validateAndRender({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) {
  const optionsValidationResult = optionValidation({ optionTypes, options })

  d3[fileExtension(dataPath)](dataPath).then(data => {
    // Run validations
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
