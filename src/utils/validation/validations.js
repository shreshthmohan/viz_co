import _ from 'lodash-es'
import * as d3 from 'd3'

export function validateColumnsWithDimensions({ columns, dimensions }) {
  // 1. dimensions is an empty object
  // Object.keys(dimensions).length
  if (_.isEmpty(dimensions)) {
    return { valid: false, message: 'No dimensions provided.' }
  }
  const parsedDimensions = {}
  _.each(dimensions, (val, key) => {
    if (_.isArray(val)) {
      val.forEach((v, i) => {
        parsedDimensions[`${key}[${i}]`] = v
      })
    } else {
      parsedDimensions[key] = val
    }
  })
  const result = { valid: true, missingFields: [], message: '' }
  _.each(parsedDimensions, (val, key) => {
    const exists = _.includes(columns, val)
    result.valid = result.valid && exists
    if (!exists) {
      result.missingFields.push(`{${key}: '${val}'}`)
    }
  })
  if (!result.valid) {
    result.message = `These dimensions/columns are missing in the data file: ${result.missingFields.join(
      ', ',
    )}`
  }
  return result
}

// TODO: adapt for removal of tailwind classes
export function showErrors(svgParentNodeSelector, errorMessages) {
  d3.select('.config-error-display').remove()
  if (_.isEmpty(errorMessages)) {
    return
  }
  d3.select(svgParentNodeSelector)
    .append('div')
    .attr('class', 'text-red-500 config-error-display')
    .html(
      `<p>Errors:</p>
      <ul class="list-disc"><li>${errorMessages.join('</li><li>')}</li></ul>`,
    )
}
