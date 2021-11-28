/* global fileExtension, dataPath, dimensions, options, validateData,
  renderChart, showErrors, svgParentNodeSelector, validateColumnsWithDimensions
  optionValidation, shouldBeNumber, shouldNotBeBlank, shouldBeUnique, 
  checkNumber, checkOneOf, checkColor, checkNumberBetween,checkStringArray,
  checkBoolean
*/

const yFieldsDimensionTypes = {}
const yFieldDimensions = {}
dimensions.yFields.forEach((yf, i) => {
  yFieldsDimensionTypes[`__yField${i}__`] = [shouldBeNumber]
  yFieldDimensions[`__yField${i}__`] = yf
})

const dimensionTypes = {
  xGridField: [shouldNotBeBlank],
  yGridField: [shouldNotBeBlank],
  xField: [shouldNotBeBlank],
  nameField: [shouldNotBeBlank],
  uniqueColumnField: [shouldBeUnique], // identifies each column uniquely
  // order: bottom to top; first value's rectangle will be on the bottom
  // the last value's rectangle will be on the top
  // yFields: ['0', '1', '2', '3', '4', '5', '6'], // barFields? stackField
  ...yFieldsDimensionTypes,
}

// after spreading out yFields; needed since yFields is an array unlike other dimensions
const flatDimensions = { ...dimensions, ...yFieldDimensions }

const optionTypes = {
  /* Headers */
  // heading: checkString,
  // subheading: checkString,

  containerWidth: checkOneOf([
    'max-w-screen-sm',
    'max-w-screen-md',
    'max-w-screen-lg',
    'max-w-screen-xl',
    'max-w-screen-2xl',
    'max-w-full',
  ]),
  aspectRatio: checkNumberBetween([0, Number.POSITIVE_INFINITY]),

  marginTop: checkNumber,
  marginRight: checkNumber,
  marginBottom: checkNumber,
  marginLeft: checkNumber,

  bgColor: checkColor,

  descending: checkBoolean,
  // colorLegendTitle: 'Palmer Drought Severity Index',

  // Has to in the same order and length as yFields / stackFields
  // TODO: checkArrayOfLength
  yFieldLabels: checkStringArray(dimensions.yFields.length),
  // yFieldLabels: [
  //   'Extreme Drought',
  //   'Severe Drought',
  //   'Moderate Drought',
  //   'Average',
  //   'Moderately Moist',
  //   'Very Moist',
  //   'Extermely Moist',
  // ],
  stackHeight: checkNumberBetween([0, 1]),

  xGridGap: checkNumberBetween([0, 1]),

  // for formatting and parsing options see: https://github.com/d3/d3-time-format#locale_format
  // Only used in tooltip, not for caclulating scales
  // uniqueFieldTimeParser: '%Y%m',
  // uniqueFieldTimeFormatter: '%b %Y',
}
const optionsValidationResult = optionValidation({ optionTypes, options })

// TODO only allow csv, tsv and json
d3[fileExtension(dataPath)](dataPath).then(data => {
  const { columns } = data
  const dimensionValidation = validateColumnsWithDimensions({
    columns,
    dimensions: flatDimensions,
  })

  const dataValidations = validateData({
    data,
    dimensionTypes,
    dimensions: flatDimensions,
  })

  const allValidations = [dimensionValidation, optionsValidationResult]

  if (dimensionValidation.valid) allValidations.push(dataValidations)

  const combinedValidation = { valid: true, messages: [] }

  allValidations.forEach(v => {
    combinedValidation.valid = combinedValidation.valid && v.valid
    if (!v.valid) {
      combinedValidation.messages.push(v.message)
    }
  })

  combinedValidation.valid
    ? renderChart({ data, dimensions, options })
    : showErrors(svgParentNodeSelector, combinedValidation.messages)

  // eslint-disable-next-line no-console
  console.log({ combinedValidation })
})
