// export function that
// accepts data path, dimensions and options, target node(s)
// validates data, dimensions and options
// call render function

import * as d3 from 'd3'

import {
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'

import {
  checkOneOf,
  checkNumber,
  checkNumberBetween,
  checkColor,
  checkBoolean,
  checkDefaultState,
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
  valueField: [shouldBeNumber, shouldNotBeBlank], // Numeric, shouldBePositive?
}

const optionTypes = {
  aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  defaultState: checkDefaultState,

  chordType: checkOneOf(['directed', 'undirected']), // directed or undirected

  activeOpacity: checkNumberBetween([0, 1]),
  inactiveOpacity: checkNumberBetween([0, 1]),
  clickInteraction: checkBoolean,
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
