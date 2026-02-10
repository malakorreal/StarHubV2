import DiscordRPC from 'discord-rpc'
import { getStore } from './store'

const clientId = '1432203667829821450' 
let rpc
let currentLang = 'th'

const translations = {
    en: {
        using: 'Using StarHub',
        login: 'At Login Screen',
        selecting: 'Selecting Instance',
        playing: 'Playing',
        inLauncher: 'In Launcher'
    },
    th: {
        using: 'กําลังใช้ StarHub',
        login: 'อยู่หน้า Login',
        selecting: 'กำลังเลือก Instance',
        playing: 'กำลังเล่น',
        inLauncher: 'อยู่ในลันเชอร์'
    }
}

let lastStatus = 'selecting'
let lastInstanceName = null
let lastTimestamp = null

export function updateRPCLanguage(lang) {
    currentLang = lang
    if (rpc && lastStatus) {
        setActivity(lastStatus, lastInstanceName, lastTimestamp)
    }
}

export function setupRPC(mainWindow) {
  DiscordRPC.register(clientId)

  rpc = new DiscordRPC.Client({ transport: 'ipc' })

  rpc.on('ready', () => {
    console.log('Discord RPC Ready')
    setActivity('selecting')
  })

  rpc.login({ clientId }).catch(console.error)
}

export function setActivity(status, instanceName = null, startTimestamp = null) {
  const t = translations[currentLang] || translations.en

  let details = t.using
  let state = t.inLauncher

  if (status === 'login') {
      state = t.login
  } else if (status === 'selecting') {
      state = t.selecting
  } else if (status === 'playing') {
      if (instanceName) {
          state = `${t.playing} ${instanceName}`
      } else {
          state = t.playing
      }
  } else if (status === 'in_launcher') {
      state = t.inLauncher
  } else {
      if (status === 'Browsing StarHub') state = t.selecting
      else if (status === 'In Launcher') state = t.inLauncher
      else if (status && status.startsWith('Playing ')) {
          const name = status.replace('Playing ', '')
          state = `${t.playing} ${name}`
      } else {
          state = status || t.inLauncher
      }
  }

  lastStatus = status
  lastInstanceName = instanceName
  lastTimestamp = startTimestamp

  if (!rpc) return

  const store = getStore()
  const auth = store.get('auth')

  const activity = {
    details: details,
    state: state,
    startTimestamp: startTimestamp ? Math.floor(startTimestamp / 1000) : undefined,
    largeImageKey: 'shubnopeople',
    largeImageText: 'StarHub',
    instance: false,
    buttons: [
        { label: "Made by Malakor", url: "https://guns.lol/malakorkubb" },
        { label: "Starlight Discord", url: "https://discord.gg/JHsk2kGPVH" }
    ]
  }

  if (auth && auth.name) {
    activity.smallImageKey = `https://minotar.net/avatar/${auth.name}`
    activity.smallImageText = auth.name
  }

  rpc.setActivity(activity)
}

export function clearRPCActivity() {
    lastStatus = null
    lastInstanceName = null
    lastTimestamp = null
    if (!rpc) return
    try {
        rpc.clearActivity()
    } catch (e) {
        console.error('Failed to clear RPC activity', e)
    }
}

export function shutdownRPC() {
    clearRPCActivity()
    if (!rpc) return
    try {
        rpc.destroy()
    } catch (e) {
        console.error('Failed to destroy RPC client', e)
    }
    rpc = null
}
