export default {
  // Get a value between two values
  clamp: function (value, min, max) {
    if (value < min) {
      return min
    }
    else if (value > max) {
      return max
    }

    return value
  },

  // Get the linear interpolation between two value
  lerp: function (value1, value2, amount) {
    amount = amount < 0 ? 0 : amount
    amount = amount > 1 ? 1 : amount
    return value1 + (value2 - value1) * amount
  }
}