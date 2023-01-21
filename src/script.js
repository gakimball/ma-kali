const labelNames = ['Visited', 'Driven through', 'To visit']
const labelColors = {
  [labelNames[0]]: '#4790CA',
  [labelNames[1]]: '#A6CAE6',
  [labelNames[2]]: '#F0BB5D',
}

const isPlainObject = value => (
  typeof value === 'object'
  && value !== null
  && !Array.isArray(value)
)
const isValidCountyData = value => (
  isPlainObject(value)
  && (value.label === null || labelNames.includes(value.label))
  && typeof value.notes === 'string'
)

//   b 0 1 2 3
// a /--------
// 0 | 0 1 2 3
// 1 | 4 5 6 7
// 2 | 8 9 a b
// 3 | c d e f

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

    return [
      Math.floor(decimal / 4),
      decimal % 4,
    ]
  })
}

document.addEventListener('alpine:init', () => {
  Alpine.store('ui', {
    /** Name of county being hovered over. */
    hoverCounty: null,
    /** Name of county currently selected. */
    county: null,
    /** User's label and notes for each county. */
    userData: {},
    /** Modal containing share URL is visible. */
    shareDialogVisible: false,
    /** Notes field is expanded. */
    notesVisible: false,
    /** User's name input into share modal. */
    shareName: '',
    /** Displaying a static share view. */
    shareModeOn: false,
    async init() {
      await this.initMap()

      try {
        const [name, numbers] = window.location.search.slice(1).split(',')

        this.displayShareView({
          name: decodeURIComponent(name) || 'A ghost',
          numbers: decompress(numbers),
        })
      } catch {
        this.initLocalStorageSync()
      }
    },
    async initMap() {
      const map = document.querySelector('.map')
      const res = await fetch('./map.svg')
      const contents = await res.text()

      map.innerHTML = contents

      map.querySelectorAll('[data-county]').forEach(node => {
        if (!(node instanceof SVGElement)) {
          return
        }

        const countyName = node.getAttribute('data-county')

        this.updateUserData(countyName, {
          label: null,
          notes: '',
        })

        node.classList.add('county')
        node.setAttribute('x-data', `{ county: '${countyName}' }`)
        node.setAttribute('x-bind', 'County')
      })
    },
    initLocalStorageSync() {
      const localStorageKey = 'userData'

      try {
        const savedUserData = JSON.parse(window.localStorage.getItem(localStorageKey) ?? 'null')

        this.importUserData(savedUserData)
      } catch (err) {
        console.log('import error', err)
      }

      Alpine.effect(() => {
        try {
          window.localStorage.setItem(localStorageKey, JSON.stringify(this.userData))
        } catch (err) {
          console.log('export error', err)
        }
      })
    },
    displayShareView(shareURLData) {
      const countyNames = Object.keys(this.userData).sort()

      countyNames.forEach((countyName, index) => {
        this.updateUserData(countyName, {
          label: labelNames[shareURLData.numbers[index] - 1] ?? null,
          notes: '',
        })
      })

      this.shareModeOn = true
      this.shareName = shareURLData.name
    },
    get countiesCount() {
      return Object.keys(this.userData).length
    },
    get visitedCount() {
      return Object.values(this.userData).filter(county => county.label === 'Visited').length
    },
    get shareURL() {
      const countyNames = Object.keys(this.userData).sort()
      const name = encodeURIComponent(this.shareName)
      const data = countyNames.map(countyName => labelNames.indexOf(this.userData[countyName].label) + 1)

      console.log(data.join(''))

      return `${window.location}?${name},${compress(data)}`
    },
    updateUserData(key, value) {
      if (isValidCountyData(value)) {
        this.userData[key] = value
      }
    },
    download() {
      const json = JSON.stringify(this.userData, null, 2)
      const anchor = document.querySelector('[data-download-link]')

      anchor.href = `data:text/json;charset=utf-8,${encodeURIComponent(json)}`
      anchor.click()
    },
    async importUserData(data) {
      try {
        if (isPlainObject(data)) {
          Object.entries(data).forEach(([key, value]) => {
            if (key in this.userData) {
              this.updateUserData(key, value)
            }
          })
        } else {
          return 'Wrong format for JSON'
        }
      } catch {
        return 'Could not parse JSON'
      }
    },
    async upload(event) {
      const data = JSON.parse(await event.target.files.item(0).text())
      const error = await this.importUserData(data)

      if (error) {
        window.alert(error)
      }
    },
    toggleShare() {
      this.shareDialogVisible = !this.shareDialogVisible
    },
    toggleNotes() {
      this.notesVisible = !this.notesVisible
    },
  })

  const ui = Alpine.store('ui')

  Alpine.bind('County', {
    '@click'() {
      ui.county = this.county
    },
    '@contextmenu'() {
      this.$event.preventDefault()

      ui.userData[this.county].label = labelNames[0]
    },
    '@mouseover'() {
      ui.hoverCounty = this.county
    },
    '@mouseout'() {
      ui.hoverCounty = null
    },
    ':class'() {
      if (ui.county === this.county) {
        return 'selected'
      }
    },
    ':style'() {
      const { label } = ui.userData[this.county]

      if (label !== null) {
        return { fill: labelColors[label] }
      }
    },
  })

  Alpine.bind('LabelButton', {
    'x-on:click'() {
      const countyData = ui.userData[ui.county]

      countyData.label = this.label === countyData.label
        ? null
        : this.label
    },
    'x-html'() {
      const colorLabel = '<span class="button-label"></span>'

      return `${colorLabel}${this.label}`
    },
    ':disabled'() {
      return ui.county === null
    },
    ':class'() {
      return {
        'button-active': ui.county !== null && ui.userData[ui.county].label === this.label
      }
    },
    ':style'() {
      return {
        '--button-label-color': labelColors[this.label],
      }
    }
  })

  Alpine.bind('CountyTitle', {
    'x-text'() {
      return ui.hoverCounty || ui.county
    },
    ':class'() {
      return {
        'county-name-hover': ui.hoverCounty !== null && ui.hoverCounty !== ui.county,
        'county-name-selected': ui.county !== null,
      }
    }
  })

  Alpine.bind('WikipediaViewer', {
    class: 'iframe',
    ':src'() {
      if (ui.county) {
        return `https://en.m.wikipedia.org/wiki/${ui.county} County, California`
      }

      return './placeholder.html'
    }
  })
})
