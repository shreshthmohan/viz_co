import _ from 'lodash-es'
import * as d3 from 'd3'

export const optionValidation = ({ optionTypes, options }) => {
  const optionValidations = []
  _.each(optionTypes, (fn, key) => {
    // Ignore options key if undefined,
    // because all options have a default value inside the chart
    if (typeof options[key] !== 'undefined') {
      const result = fn(options[key])
      if (!result.valid) {
        optionValidations.push({
          keyValue: `${key}: ${options[key]}`,
          message: result.message,
        })
      }
    }
  })

  const combinedOptionValidations = { valid: true, message: '' }

  optionValidations.forEach(result => {
    if (!result.valid) {
      combinedOptionValidations.message += `&nbsp;&nbsp;&nbsp;${result.keyValue} - ${result.message}<br/>`
      combinedOptionValidations.valid = false
    }
  })
  combinedOptionValidations.message = `Config option validation errors: <br/> ${combinedOptionValidations.message}`
  return combinedOptionValidations
}

// To check options
export const checkOneOf = refArr => val => {
  const valid = refArr.includes(val)
  if (valid) {
    return { valid: true }
  }
  return { valid: false, message: `Should be one of: ${refArr.join(', ')}` }
}

export const checkNumber = val => {
  const valid = !Number.isNaN(Number(val))
  if (valid) {
    return { valid: true }
  }
  return { valid: false, message: 'Should be a valid number' }
}

export const checkPositiveInteger = val => {
  const valid = Number.isInteger(val) && val > 0
  if (valid) {
    return { valid: true }
  }
  return { valid: false, message: 'Should be a positive integer' }
}

export const checkBoolean = val => {
  const valid = typeof val === 'boolean'
  if (valid) {
    return { valid: true }
  }
  return { valid: false, message: 'Should be true or false' }
}

export const checkNumberBetween = (a, b) => val => {
  const min = Math.min(a, b)
  const max = Math.max(a, b)
  const message = `Should be a number between ${min} and ${max}`
  const checkNumberResult = checkNumber(val)
  if (!checkNumberResult.valid) {
    return { valid: false, message }
  }
  const parsedNumber = Number(val)
  if (parsedNumber >= min && parsedNumber <= max) {
    return { valid: true }
  }
  return { valid: false, message }
}

export const checkColor = val => {
  const result = { valid: true, message: '' }

  if (val === 'transparent') return result

  const parsedColor = d3.rgb(val)

  _.forEach(parsedColor, function (value) {
    result.valid = result.valid && !_.isNaN(value)
  })

  if (!result.valid) {
    result.message = `Invalid color: ${val}`
  }
  return result
}

export const checkColorArray = length => arr => {
  const checkColorsResult = arr.map(clr => checkColor(clr))
  const lengthValidationResult = { valid: true, message: '' }
  if (length && arr.length < length) {
    lengthValidationResult.valid = false
    lengthValidationResult.message = `Need atleast ${length} colors`
  }

  const checkAllResults = [...checkColorsResult, lengthValidationResult]

  const combinedResult = { valid: true, message: '' }

  checkAllResults.forEach(result => {
    if (!result.valid) {
      combinedResult.message += `<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${result.message}`
      combinedResult.valid = false
    }
  })

  return combinedResult
}

export const checkNumericArray = length => arr => {
  const numberValidationResult = arr.map(el => checkNumber(el))
  const lengthValidationResult = { valid: true, message: '' }
  if (_.isArray(arr)) {
    if (length && arr.length < length) {
      lengthValidationResult.valid = false
      lengthValidationResult.message = `Should be an array with at least ${length} numbers`
    }

    const checkAllResults = [...numberValidationResult, lengthValidationResult]
    const combinedResult = { valid: true, message: '' }

    checkAllResults.forEach(result => {
      if (!result.valid) {
        combinedResult.message += `<br/>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${result.message}`
        combinedResult.valid = false
      }
    })

    return combinedResult
  }

  return { valid: false, message: 'Should be an array of numbers' }
}

export const checkStringArray = length => arr => {
  if (_.isArray(arr)) {
    if (length && arr.length < length) {
      return {
        valid: false,
        message: `Should be an array with minimum length: ${length}`,
      }
    }
    return { valid: true }
  }
  return { valid: false, message: 'Should be a valid array' }
}

export const checkDefaultState = val => {
  if (_.isArray(val) || val === 'All') {
    return { valid: true }
  }
  return { valid: false, message: 'Should be a valid array or "All"' }
}

export const checkFontSizeString = val => {
  const valid = val.match(/^[0-9]*?px$/)
  if (valid) {
    return { valid: true }
  }
  return { valid: false, message: 'Should be a valid string like "14px"' }
}
