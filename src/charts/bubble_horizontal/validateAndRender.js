import * as d3 from 'd3'
import {
  shouldBeNumber,
  shouldNotBeBlank,
  validateData,
} from '../../utils/validation/dataValidations'
import {
  checkColorArray,
  checkNumberBetween,
  checkOneOf,
  checkNumber,
  checkNumericArray,
  optionValidation,
  checkColor,
} from '../../utils/validation/optionValidations'
import { d3ColorSchemeOptions } from '../../utils/constants'
import { renderChart } from './render'
import {
  showErrors,
  validateColumnsWithDimensions,
} from '../../utils/validation/validations'
import { fileExtension } from '../../utils/helpers/general'

const dimensionTypes = {
  sizeField: [shouldBeNumber],
  xField: [shouldBeNumber],
  nameField: [shouldNotBeBlank], // also search field
  segmentField: [shouldNotBeBlank],
}

const optionTypes = {
  aspectRatioCombined: checkNumberBetween(0.01, Number.MAX_SAFE_INTEGER),
  aspectRatioSplit: checkNumberBetween(0.01, Number.MAX_SAFE_INTEGER),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  customColorScheme: checkColorArray,
  inbuiltScheme: checkOneOf(d3ColorSchemeOptions),
  numberOfColors: checkNumberBetween(3, 9),

  collisionDistance: checkNumberBetween(0, Number.MAX_SAFE_INTEGER),

  /* xField */
  xDomainCustom: checkNumericArray(2),
  // xAxisLabel = xField,
  // xValuePrefix = '',
  // xValueFormatter = '',
  // xValueSuffix = '',

  /* sizeField */
  sizeRange: checkNumericArray(2),
  // sizeValuePrefix = '',
  // sizeValueFormatter = '',
  // sizeValueSuffix = '',
  sizeLegendValues: checkNumericArray(),
  // sizeLegendTitle = sizeField,
  sizeLegendGapInCircles: checkNumber,

  // colorLegendTitle = xField,

  // combinedSegmentLabel = 'All',
  // segmentType = segmentField,
  // segmentTypeCombined = '',
  // segmentTypeSplit = '',

  // splitButtonClassNames = '',
  // combinedButtonClassNames = '',
  // searchInputClassNames = '',
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
