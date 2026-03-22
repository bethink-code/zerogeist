// =============================================================================
// ZEROGEIST / MZANSI — Tailwind Design Tokens
// Source: Aloe ferox · South African landscape
// Admin skin: Parchment light (Zed-inspired)
// =============================================================================

const zerogeistTokens = {
  colors: {

    // SURFACES — parchment light hierarchy
    surface: {
      card:      '#FFFFFF',
      input:     '#FAF7F0',
      page:      '#F5F1E8',
      sidebar:   '#EDE8D8',
      titlebar:  '#EEE8D8',
      border:    '#DDD5C0',
      hover:     '#E8E0CC',
    },

    // TYPE SCALE
    text: {
      heading:     '#2C2418',
      body:        '#3A3020',
      secondary:   '#5C5040',
      muted:       '#8A7860',
      placeholder: '#B0A090',
    },

    // ACCENT RAMPS
    fire: {
      50:  '#FDF0E8',
      100: '#F9CEAF',
      200: '#F0A06A',
      400: '#E07030',
      600: '#C85A1A',
      800: '#963D0E',
      900: '#5C2206',
    },

    succulent: {
      50:  '#EEF4EA',
      100: '#C4DDB6',
      200: '#9AC488',
      400: '#5C7A50',
      600: '#7A9E68',
      800: '#3D5C2E',
      900: '#1E3014',
    },

    canola: {
      50:  '#FDF6E0',
      100: '#F7E099',
      200: '#EDCA58',
      400: '#D4A827',
      600: '#A07A10',
      800: '#6E5208',
      900: '#3C2C02',
    },

    sky: {
      50:  '#E8F0F8',
      100: '#B0CCEA',
      200: '#78AAD8',
      400: '#3E7BBF',
      600: '#1F5C99',
      800: '#0D3D70',
      900: '#04204A',
    },

    dusk: {
      50:  '#F0EDF5',
      100: '#D0C4E0',
      200: '#A890C4',
      400: '#6A5278',
      600: '#4A3558',
      800: '#2E1E3C',
      900: '#180E22',
    },

    dust: {
      50:  '#F7F3E9',
      100: '#E8E0CC',
      200: '#CFC4A8',
      400: '#A89880',
      600: '#8A7860',
      800: '#5C5040',
      900: '#2C2418',
    },

    // EMOTION TOKENS
    emotion: {
      anger:    '#C85A1A',
      hope:     '#7A9E68',
      fear:     '#3E7BBF',
      joy:      '#D4A827',
      grief:    '#6A5278',
    },
  },

  borderRadius: {
    sm:   '4px',
    md:   '6px',
    lg:   '8px',
    xl:   '12px',
    pill: '999px',
  },

  fontFamily: {
    mono: ["'SF Mono'", "'Fira Code'", 'Consolas', 'monospace'],
    sans: ['system-ui', '-apple-system', 'sans-serif'],
  },
}

module.exports = zerogeistTokens
