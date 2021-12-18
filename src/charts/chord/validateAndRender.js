// export function that
// accepts data path, dimensions and options, target node(s)
// validates data, dimensions and options
// call render function

import * as d3 from 'd3'

import {
  shouldNotBeBlank,
  shouldBeZeroOrPositiveNumber,
  validateData,
} from '../../utils/validation/dataValidations'

import {
  checkOneOf,
  checkNumber,
  checkNumberBetween,
  checkColor,
  checkBoolean,
  checkFontSizeString,
  checkColorArray,
  optionValidation,
} from '../../utils/validation/optionValidations'

import {
  validateColumnsWithDimensions,
  showErrors,
} from '../../utils/validation/validations'

import { renderChart } from './render'

const dimensionTypes = {
  sourceField: [shouldNotBeBlank], // Categorical
  targetField: [shouldNotBeBlank], // Categorical
  valueField: [shouldBeZeroOrPositiveNumber, shouldNotBeBlank], // Numeric, shouldBePositive?
}

const optionTypes = {
  aspectRatio: checkNumberBetween(0, Number.POSITIVE_INFINITY),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  chordType: checkOneOf(['directed', 'undirected']),

  colorScheme: checkColorArray,
  arcLabelFontSize: checkFontSizeString,

  activeOpacity: checkNumberBetween(0, 1),
  inactiveOpacity: checkNumberBetween(0, 1),
  clickInteraction: checkBoolean,

  // searchInputClassNames: checkString,
  // clearAllButtonClassNames: checkString,
  // showAllButtonClassNames: checkString,

  startingState: checkOneOf(['showAll', 'clearAll']),
}

export const validateAndRender = ({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) => {
  const optionsValidationResult = optionValidation({ optionTypes, options })

  d3.csv(dataPath).then(data => {
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

    // eslint-disable-next-line no-console
    // console.log({ combinedValidation })
  })
}
