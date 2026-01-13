const fs = require('fs')
const path = require('path')

module.exports = async (context) => {
  const appOutDir = context.appOutDir
  const localesDir = path.join(appOutDir, 'locales')
  if (!fs.existsSync(localesDir)) return
  const keep = new Set(['en-US.pak', 'th.pak'])
  for (const file of fs.readdirSync(localesDir)) {
    if (!keep.has(file)) {
      const p = path.join(localesDir, file)
      try {
        fs.unlinkSync(p)
      } catch {}
    }
  }
  const optional = ['vk_swiftshader.dll', 'vk_swiftshader_icd.json', 'LICENSES.chromium.html']
  for (const f of optional) {
    const p = path.join(appOutDir, f)
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p)
      } catch {}
    }
  }
}
