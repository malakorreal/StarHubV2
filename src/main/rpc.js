import DiscordRPC from 'discord-rpc'
import { getStore } from './store'

const clientId = '1432203667829821450' 
let rpc
let currentLang = 'th' // Default

const translations = {
    en: {
        browsing: 'Browsing StarHub',
        inLauncher: 'In Launcher',
        playing: 'Playing',
        inGame: 'In Game'
    },
    th: {
        browsing: 'กำลังเลือก Instance',
        inLauncher: 'อยู่ในลันเชอร์',
        playing: 'กำลังเล่น',
        inGame: 'ในเกม'
    }
}

export function updateRPCLanguage(lang) {
    currentLang = lang
    // Force refresh with last known state
    if (rpc && lastDetails) {
        setActivity(lastDetails, lastState, lastTimestamp)
    }
}

let lastDetails = 'Browsing StarHub'
let lastState = 'In Launcher'
let lastTimestamp = null

export function setupRPC(mainWindow) {
  DiscordRPC.register(clientId)

  rpc = new DiscordRPC.Client({ transport: 'ipc' })

  rpc.on('ready', () => {
    console.log('Discord RPC Ready')
    setActivity('Browsing StarHub', 'In Launcher')
  })

  rpc.login({ clientId }).catch(console.error)
}

export function setActivity(details, state, startTimestamp) {
  // If details/state match keys, translate them. 
  // But usually they are dynamic (instance names).
  // So we expect the CALLER to provide raw strings, OR we handle specific keys.
  
  // Strategy: The caller (launcher.js) passes raw keys or names.
  // But launcher.js sends "Browsing StarHub".
  
  // Let's check if the input matches our dictionary values (reverse lookup? No, too complex).
  // Better: Allow setActivity to accept keys, OR just hardcode the check here.
  
  let displayDetails = details
  let displayState = state
  
  const t = translations[currentLang] || translations.en

  // Map known statuses
  if (details === 'Browsing StarHub') displayDetails = t.browsing
  if (state === 'In Launcher') displayState = t.inLauncher
  if (state === 'In Game') displayState = t.inGame
  
  // Handle "Playing X"
  if (details && details.startsWith('Playing ')) {
      const instanceName = details.replace('Playing ', '')
      displayDetails = `${t.playing} ${instanceName}`
  }

  // Store for refresh
  lastDetails = details
  lastState = state
  lastTimestamp = startTimestamp

  if (!rpc) return

  const store = getStore()
  const auth = store.get('auth')

  const activity = {
    details: displayDetails,
    state: displayState,
    startTimestamp,
    largeImageKey: 'shubnopeople',
    largeImageText: 'StarHub',
    instance: false,
    buttons: [
        { label: "Made by Malakor", url: "https://guns.lol/malakorkubb" }
    ]
  }

  if (auth && auth.name) {
    activity.smallImageKey = `https://minotar.net/avatar/${auth.name}`
    activity.smallImageText = auth.name
  }

  rpc.setActivity(activity)
}
