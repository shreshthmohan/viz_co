import * as d3 from 'd3'
import {
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkColor,
  checkColorArray,
  checkDefaultState,
  checkNumber,
  checkNumberBetween,
  checkStringArray,
  optionValidation,
} from '../../utils/validation/optionValidations'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'

import { renderChart } from './render'

// { startField, endField, nameField }
const dimensionTypes = {
  nameField: [shouldNotBeBlank],
}

function buildDimensionAndTypes({
  dimensions,
  dimensionTypes,
  // optionTypes
}) {
  const valueFieldsDimensionTypes = {}
  const valueDimensions = {}
  const startFields = dimensions.startField
  const endFields = dimensions.endField

  startFields.forEach((sf, i) => {
    valueFieldsDimensionTypes[`__startField${i}__`] = [shouldBeNumber]
    valueDimensions[`__startField${i}__`] = sf
  })
  endFields.forEach((ef, i) => {
    valueFieldsDimensionTypes[`__endField${i}__`] = [shouldBeNumber]
    valueDimensions[`__endField${i}__`] = ef
  })

  // after spreading out yFields; needed since yFields is an array unlike other dimensions
  const flatDimensions = { ...dimensions, ...valueDimensions }

  const dimensionTypesWithValueFields = {
    ...dimensionTypes,
    ...valueFieldsDimensionTypes,
  }

  return {
    flatDimensions,
    dimensionTypesWithValueFields,
    // optionTypesWYFields
  }
}

const optionTypes = {
  // directionStartLabel: 'start point',
  // directionEndLabel: 'end point',

  circleRadius: checkNumber,
  lineWidth: checkNumber,

  stickLength: checkNumber,
  stickWidth: checkNumber,
  directionLegendGapForText: checkNumber,

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  // valuePrefix: '',
  // valuePostfix: '',
  // valueFormat: '',

  bgColor: checkColor,

  activeOpacity: checkNumberBetween(0, 1),
  inactiveOpacity: checkNumberBetween(0, 1),
  defaultState: checkDefaultState,

  colorScheme: checkColorArray(3),
  fieldLabels: checkStringArray(3),
  // searchInputClassNames: '',
}

export function validateAndRender({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) {
  const optionsValidationResult = optionValidation({ optionTypes, options })
  d3.csv(dataPath).then(data => {
    const { columns } = data
    const { flatDimensions, dimensionTypesWithValueFields } =
      buildDimensionAndTypes({ dimensions, dimensionTypes })
    const dimensionValidation = validateColumnsWithDimensions({
      columns,
      dimensions: flatDimensions,
    })

    const dataValidations = validateData({
      data,
      dimensionTypes: dimensionTypesWithValueFields,
      dimensions: flatDimensions,
    })

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
