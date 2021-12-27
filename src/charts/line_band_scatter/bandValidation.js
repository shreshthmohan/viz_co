import _ from 'lodash-es'

export function validateBandFields({ bandDimensions }) {
  const result = { valid: true, message: '', invalidBands: [] }

  _.each(bandDimensions, (val, key) => {
    if (!(_.isArray(val) && val.length === 2)) {
      result.valid = false
      result.invalidBands.push(`{${key}: ${val}}`)
    }
  })

  if (!result.valid) {
    result.message = `These band dimensions should have exactly two values (lower bound and upper bound): ${result.invalidBands.join(
      ', ',
    )}`
  }

  return result
}
