const assert = require('node:assert')

/** @type number[] */
const input = process.argv[2].split('').map(val => Number.parseInt(val, 10))

/** @param {number[]} value */
const compress = value => {
  let numbers = value
  let output = ''

  while (numbers.length > 0) {
    const [first, second] = numbers.slice(0, 2)
    numbers = numbers.slice(2)

    output += ((first * 4) + second).toString(16)
  }

  return output
}

/** @param {string} value */
const decompress = value => {
  const numbers = value.split('')

  return numbers.flatMap(hex => {
    const decimal = Number.parseInt(hex, 16)

    console.log(`hex ${hex} is dec ${decimal}`)

    return [
      Math.floor(decimal / 4),
      decimal % 4,
    ]
  })
}

const compressed = compress(input)
const decompressed = decompress(compressed)

console.log(`Input: ${input}`)
console.log(`Compressed: ${compressed}`)
console.log(`Decompressed: ${decompressed}`)

assert(input.join('') === decompressed.join(''), 'Equals')
