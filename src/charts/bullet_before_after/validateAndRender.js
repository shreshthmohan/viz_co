// export function that
// accepts data path, dimensions and options, target node(s)
// validates data, dimensions and options
// call render function

import * as d3 from 'd3'

import {
  shouldBeNumber,
  shouldNotBeBlank,
  shouldBeUnique,
  validateData,
} from '../../utils/validation/dataValidations'

import {
  checkNumber,
  checkNumberBetween,
  checkColor,
  checkNumericArray,
  optionValidation,
  checkOneOf,
  checkFontSizeString,
  checkDefaultState,
} from '../../utils/validation/optionValidations'

import {
  validateColumnsWithDimensions,
  showErrors,
} from '../../utils/validation/validations'

import { renderChart } from './render'

const dimensionTypes = {
  beforeField: [shouldBeNumber],
  afterField: [shouldBeNumber],
  topicField: [shouldNotBeBlank, shouldBeUnique],
}

const optionTypes = {
  aspectRatio: checkNumberBetween(0.1, Number.POSITIVE_INFINITY),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  /* Series Colors */
  beforeFieldColor: checkColor,
  afterFieldColor: checkColor,

  /* Glyphs */
  glyphSize: checkNumber,
  connectorSize: checkNumber,

  connectorColorStrategy: checkOneOf([
    'farFromReference',
    'closeToReference',
    'customColor',
  ]),
  connectorColorCustom: checkColor,

  referenceValue: checkNumber,
  referenceLineColor: checkColor,
  referenceLineWidth: checkNumber,
  referenceLineOpacity: checkNumberBetween(0, 1),

  /* Legends */
  // beforeLegendLabel: checkString,
  // afterLegendLabel: checkString,

  // valuePrefix: checkString,
  // valuePostfix: checkString,
  // valueFormatter: checkString,

  topicLabelFontSize: checkFontSizeString,
  topicLabelTextColor: checkColor,
  topicLabelYOffset: checkNumber,

  defaultState: checkDefaultState,

  /* Axes */
  // xAxisTitle: checkString,
  xScaleType: checkOneOf(['log', 'linear']), // linear or log
  xScaleLogBase: checkNumber, // applicable only if log scale
  xAxisPosition: checkOneOf(['top', 'bottom']),
  xAxisOffset: checkNumber,
  // xAxisLabel: checkString,
  xAXisLabelFontSize: checkNumber,
  xAxisLabelOffset: checkNumber,
  xAxisCustomDomain: checkNumericArray(),
  xAxisTickFontSize: checkNumber,
  xAxisColor: checkColor,
  xAxisTickValues: checkNumericArray(),
  xAxisTickOffset: checkNumber,
  xAxisLineThickness: checkNumber,
  // xAxisTickFormatter: checkString,
  xAxisTickRotation: checkNumber,
  // xAxisTickAnchor: checkString,
  // xAxisTickBaseline: checkString,
  xAxisTickValueXOffset: checkNumber,
  xAxisTickValueYOffset: checkNumber,

  // searchInputClassNames: checkString,
  // goToInitialStateButtonClassNames: checkString,
  // clearAllButtonClassNames: checkString,
  // showAllButtonClassNames: checkString,

  activeOpacity: checkNumberBetween(0, 1),
  inactiveOpacity: checkNumberBetween(0, 1),
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
