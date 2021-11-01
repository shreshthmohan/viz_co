import _ from 'lodash-es'

export const optionValidation = ({ optionTypes, options }) => {
  const optionValidations = []
  _.each(optionTypes, (fn, key) => {
    const result = fn(options[key])
    // Ignore options key if undefined,
    // because all options have a default value inside the chart
    if (!result.valid && typeof options[key] !== 'undefined') {
      optionValidations.push({
        keyValue: `${key}: ${options[key]}`,
        message: result.message,
      })
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

export const checkBoolean = val => {
  const valid = typeof val === 'boolean'
  if (valid) {
    return { valid: true }
  }
  return { valid: false, message: 'Should be true or false' }
}

const checkNumberBetween = refArr => val => {
  const min = Math.min(...refArr)
  const max = Math.max(...refArr)
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

const checkColor = val => {
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

// TODO: add length feature as in checkColorArray
export const checkNumericArray = val => {
  const valid =
    _.isArray(val) &&
    _.reduce(
      val,
      (isNumber, val_) => {
        return isNumber && !Number.isNaN(Number(val_))
      },
      true,
    )
  if (valid) {
    return { valid: true }
  }
  return { valid: false, message: 'Should be a valid array of numbers' }
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
