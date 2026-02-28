
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle, X, Plus } from 'lucide-react'

export default function InstanceForm({ initialData = null, onClose, onSuccess }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newPlayer, setNewPlayer] = useState('')
  const [whitelist, setWhitelist] = useState(initialData?.allowed_players || [])
  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    icon: initialData?.icon || '',
    logo: initialData?.logo || '',
    loader: initialData?.loader || 'forge',
    version: initialData?.version || '1.20.1',
    modpack_url: initialData?.modpack_url || initialData?.modpackUrl || '',
    discord: initialData?.discord || '',
    website: initialData?.website || '',
    description: initialData?.description || '',
    maintenance: initialData?.maintenance || false,
    maintenance_message: initialData?.maintenance_message || '',
    modpack_version: initialData?.modpackVersion || '',
    ignore_files: initialData?.ignoreFiles?.join('\n') || '',
    forge_version: initialData?.forgeVersion || '',
    server_ip: initialData?.serverIp || '',
    loader_version: initialData?.loaderVersion || '',
    announcement: initialData?.announcement || '',
    announcement_image: initialData?.announcementImage || '',
    background_image: initialData?.backgroundImage || ''
  })

  useEffect(() => {
    if (!initialData && !formData.id && formData.name) {
      setFormData(prev => ({
        ...prev,
        id: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }))
    }
  }, [formData.name, formData.id, initialData])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleAddPlayer = (e) => {
    e.preventDefault()
    if (newPlayer.trim() && !whitelist.includes(newPlayer.trim())) {
      setWhitelist([...whitelist, newPlayer.trim()])
      setNewPlayer('')
    }
  }

  const handleRemovePlayer = (player) => {
    setWhitelist(whitelist.filter(p => p !== player))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const url = initialData 
        ? `/api/instances/${initialData.id}`
        : '/api/instances'
      
      const method = initialData ? 'PUT' : 'POST'

      const payload = {
        ...formData,
        allowed_players: whitelist,
        ignore_files: formData.ignore_files.split('\n').map(f => f.trim()).filter(Boolean)
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save instance')
      }

      router.refresh()
      if (onSuccess) onSuccess()
      if (onClose) onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const InputField = ({ label, name, type = "text", placeholder, required = false, readOnly = false }) => (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        readOnly={readOnly}
        value={formData[name]}
        onChange={handleChange}
        className={`w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all ${readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:bg-black/30'}`}
        placeholder={placeholder}
      />
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-200 text-sm">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InputField label="Name" name="name" placeholder="e.g. Lumina Evernight" required />
        <InputField label="ID (Unique)" name="id" placeholder="lumina-evernight" required readOnly={!!initialData} />
        
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-300">Loader</label>
          <div className="relative">
            <select
              name="loader"
              value={formData.loader}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-black/30 cursor-pointer"
            >
              <option value="forge">Forge</option>
              <option value="fabric">Fabric</option>
              <option value="vanilla">Vanilla</option>
              <option value="neoforge">NeoForge</option>
              <option value="quilt">Quilt</option>
            </select>
            <div className="absolute right-4 top-3 pointer-events-none text-zinc-500">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
          </div>
        </div>

        <InputField label="Game Version" name="version" placeholder="1.20.1" />
        <InputField label="Loader Version" name="loader_version" placeholder="e.g. 47.1.0" />
        <InputField label="Forge Version" name="forge_version" placeholder="e.g. 47.1.0" />
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        <h3 className="text-lg font-semibold text-white">Files & Network</h3>
        <InputField label="Modpack URL (Direct Download)" name="modpack_url" type="url" placeholder="https://..." />
        <InputField label="Server IP" name="server_ip" placeholder="play.example.com" />
        
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Ignore Files (One per line)</label>
            <textarea
                name="ignore_files"
                rows={3}
                value={formData.ignore_files}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-black/30 resize-none font-mono text-sm"
                placeholder="options.txt&#10;servers.dat"
            />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        <h3 className="text-lg font-semibold text-white">Appearance & Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputField label="Icon URL" name="icon" type="url" placeholder="https://..." />
            <InputField label="Logo URL" name="logo" type="url" placeholder="https://..." />
            <InputField label="Background Image" name="background_image" type="url" placeholder="https://..." />
            <InputField label="Announcement Image" name="announcement_image" type="url" placeholder="https://..." />
            <InputField label="Discord Link" name="discord" type="url" placeholder="https://discord.gg/..." />
            <InputField label="Website Link" name="website" type="url" placeholder="https://..." />
        </div>
        
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Description</label>
            <textarea
            name="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-black/30 resize-none"
            placeholder="Brief description of the instance..."
            />
        </div>
        
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-zinc-300">Announcement Message</label>
            <textarea
            name="announcement"
            rows={2}
            value={formData.announcement}
            onChange={handleChange}
            className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-black/30 resize-none"
            placeholder="Important news for players..."
            />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Maintenance Mode</h3>
            <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" name="maintenance" checked={formData.maintenance} onChange={handleChange} className="sr-only peer" />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
        </div>
        {formData.maintenance && (
            <InputField label="Maintenance Message" name="maintenance_message" placeholder="Server is under maintenance..." />
        )}
      </div>

      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-zinc-300">
          Allowed Players (Whitelist)
          <span className="text-zinc-500 ml-2 font-normal text-xs">(One username per line, leave empty for public)</span>
        </label>
        
        <div className="flex gap-2">
            <input
                type="text"
                value={newPlayer}
                onChange={(e) => setNewPlayer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer(e)}
                placeholder="Enter player name"
                className="flex-1 px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-black/30"
            />
            <button
                type="button"
                onClick={handleAddPlayer}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
            >
                <Plus size={20} />
            </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-2 p-3 bg-black/20 border border-white/10 rounded-xl min-h-[100px] max-h-[200px] overflow-y-auto">
            {whitelist.length === 0 ? (
                <span className="text-zinc-500 text-sm">No players added (Public server)</span>
            ) : (
                whitelist.map((player, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg text-sm text-white group hover:bg-white/20 transition-colors">
                        <span>{player}</span>
                        <button
                            type="button"
                            onClick={() => handleRemovePlayer(player)}
                            className="text-zinc-400 hover:text-red-400 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))
            )}
        </div>
      </div>

      <div className="flex justify-end pt-4 gap-3 border-t border-white/5">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              {initialData ? 'Save Changes' : 'Create Instance'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}
