import * as d3 from 'd3'

import {
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'

import {
  checkBoolean,
  checkColorArray,
  checkNumber,
  checkNumberBetween,
  checkColor,
  optionValidation,
} from '../../utils/validation/optionValidations'

import {
  validateColumnsWithDimensions,
  showErrors,
} from '../../utils/validation/validations'

import { renderChart } from './render'

const dimensionTypes = {
  groupField: [],
  xField: [shouldNotBeBlank],
  yField: [shouldNotBeBlank, shouldBeNumber],
  seriesField: [shouldNotBeBlank],
}

const optionTypes = {
  aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  alternatingTickTextXAxis: checkBoolean,

  // xAxisLabel: xField,
  // yAxisLabel: yField,

  // verticalLines: [],
  // verticalDashedLineLabels: [],

  colorScheme: checkColorArray(),

  areaOpacity: checkNumberBetween([0, 1]),

  yAxisTickSizeOffset: checkNumber,
}

export const validateAndRender = ({
  dataPath,
  options,
  dimensions,
  chartContainerSelector,
}) => {
  // verticalLines = [{ x: '6', group: 'United Income', series: 'Pan' } ...]
  // x should exist, should be one of the values of xField column in data
  // group should exist, should be one of the values of groupField column in data
  // series should exist, should be one of the values of seriesField column in data

  // verticalDashedLineLabels = [ { series: 'Pan', label: 'Pan Avg' }]
  // can't have more than the number of unique series values than in the data
  // label can't be empty
  // each item should have a unique series value

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
