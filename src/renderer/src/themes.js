// Helper functions to adjust colors
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

function lightenDarkenColor(hex, percent) {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const amount = Math.round(255 * (percent / 100))
  return rgbToHex(
    rgb.r + amount,
    rgb.g + amount,
    rgb.b + amount
  )
}

// Generate a complete theme from an accent color
export function generateCustomTheme(accentColor) {
  const accentHover = lightenDarkenColor(accentColor, -15)
  const isDarkAccent = isColorDark(accentColor)
  const textOnAccent = isDarkAccent ? '#ffffff' : '#000000'
  
  return {
    id: 'custom',
    name: 'Custom',
    colors: {
      '--sidebar-bg': '#1a1b1e',
      '--main-bg': '#121212',
      '--accent': accentColor,
      '--accent-hover': accentHover,
      '--text-primary': '#ffffff',
      '--text-secondary': '#aaaaaa',
      '--input-bg': '#25262b',
      '--border-color': '#373a40',
      '--modal-bg': '#1a1b1e',
      '--card-bg': '#25262b',
      '--danger': '#ff4d4d',
      '--success': '#4caf50'
    }
  }
}

// Check if a color is dark (for text contrast)
function isColorDark(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return true
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance < 0.5
}

export const themes = {
  gold: {
    id: 'gold',
    name: 'Classic (Recommend)',
    colors: {
      '--sidebar-bg': '#1a1b1e',
      '--main-bg': '#121212',
      '--accent': '#ffd700',
      '--accent-hover': '#e6c200',
      '--text-primary': '#ffffff',
      '--text-secondary': '#aaaaaa',
      '--input-bg': '#25262b',
      '--border-color': '#373a40',
      '--modal-bg': '#1a1b1e',
      '--card-bg': '#25262b',
      '--danger': '#ff4d4d',
      '--success': '#4caf50'
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Deep Ocean',
    colors: {
      '--sidebar-bg': '#0f172a',
      '--main-bg': '#020617',
      '--accent': '#38bdf8',
      '--accent-hover': '#0ea5e9',
      '--text-primary': '#f0f9ff',
      '--text-secondary': '#94a3b8',
      '--input-bg': '#1e293b',
      '--border-color': '#334155',
      '--modal-bg': '#0f172a',
      '--card-bg': '#1e293b',
      '--danger': '#ff4d4d',
      '--success': '#4caf50'
    }
  },
  forest: {
    id: 'forest',
    name: 'Emerald Forest',
    colors: {
      '--sidebar-bg': '#022c22',
      '--main-bg': '#010f0a',
      '--accent': '#10b981',
      '--accent-hover': '#059669',
      '--text-primary': '#ecfdf5',
      '--text-secondary': '#6ee7b7',
      '--input-bg': '#064e3b',
      '--border-color': '#065f46',
      '--modal-bg': '#022c22',
      '--card-bg': '#064e3b',
      '--danger': '#ff6b6b',
      '--success': '#10b981'
    }
  },
  purple: {
    id: 'purple',
    name: 'Amethyst Night',
    colors: {
      '--sidebar-bg': '#2e1065',
      '--main-bg': '#1a0536',
      '--accent': '#d8b4fe',
      '--accent-hover': '#c084fc',
      '--text-primary': '#faf5ff',
      '--text-secondary': '#a855f7',
      '--input-bg': '#4c1d95',
      '--border-color': '#5b21b6',
      '--modal-bg': '#2e1065',
      '--card-bg': '#4c1d95',
      '--danger': '#ef4444',
      '--success': '#4caf50'
    }
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Void',
    colors: {
      '--sidebar-bg': '#450a0a',
      '--main-bg': '#1a0303',
      '--accent': '#ff5252',
      '--accent-hover': '#ff1744',
      '--text-primary': '#fff1f2',
      '--text-secondary': '#fda4af',
      '--input-bg': '#7f1d1d',
      '--border-color': '#991b1b',
      '--modal-bg': '#450a0a',
      '--card-bg': '#7f1d1d',
      '--danger': '#ff1744',
      '--success': '#4caf50'
    }
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Neon Cyberpunk',
    colors: {
      '--sidebar-bg': '#120024',
      '--main-bg': '#05000a',
      '--accent': '#00ff9f',
      '--accent-hover': '#00cc7f',
      '--text-primary': '#e0e0e0',
      '--text-secondary': '#ff0055',
      '--input-bg': '#2a003b',
      '--border-color': '#ff0055',
      '--modal-bg': '#120024',
      '--card-bg': '#2a003b',
      '--danger': '#ff0055',
      '--success': '#00ff9f'
    }
  }
}
