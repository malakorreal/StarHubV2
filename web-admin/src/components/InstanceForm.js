
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, AlertCircle } from 'lucide-react'

export default function InstanceForm({ initialData = null, onClose, onSuccess }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
    allowed_players: initialData?.allowed_players?.join('\n') || ''
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
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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
        allowed_players: formData.allowed_players.split('\n').map(p => p.trim()).filter(Boolean)
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

        <InputField label="Version" name="version" placeholder="1.20.1" />
      </div>

      <InputField label="Modpack URL (Direct Download)" name="modpack_url" type="url" placeholder="https://..." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InputField label="Icon URL" name="icon" type="url" placeholder="https://..." />
        <InputField label="Logo URL" name="logo" type="url" placeholder="https://..." />
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
        <label className="block text-sm font-medium text-zinc-300">
          Allowed Players (Whitelist)
          <span className="text-zinc-500 ml-2 font-normal text-xs">(One username per line, leave empty for public)</span>
        </label>
        <textarea
          name="allowed_players"
          rows={4}
          value={formData.allowed_players}
          onChange={handleChange}
          className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-black/30 resize-none font-mono text-sm"
          placeholder="Player1&#10;Player2&#10;Player3"
        />
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
