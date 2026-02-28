
'use client'

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Settings, LogOut, Search, Trash2, Edit, ExternalLink, Box } from "lucide-react"
import Modal from "@/components/Modal"
import InstanceForm from "@/components/InstanceForm"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (status === 'authenticated') {
      fetchInstances()
    }
  }, [status, router])

  const fetchInstances = async () => {
    try {
      const res = await fetch('/api/instances')
      if (res.ok) {
        const data = await res.json()
        setInstances(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Failed to fetch instances", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return
    const t = setInterval(() => {
      fetchInstances()
    }, 3000)
    return () => clearInterval(t)
  }, [status])

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/instances/${deletingId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setInstances(instances.filter(i => i.id !== deletingId))
        setIsDeleteModalOpen(false)
        setDeletingId(null)
      }
    } catch (error) {
      console.error("Failed to delete", error)
    }
  }

  const openEditModal = (instance) => {
    setEditingInstance(instance)
    setIsModalOpen(true)
  }

  const openCreateModal = () => {
    setEditingInstance(null)
    setIsModalOpen(true)
  }

  const filteredInstances = instances.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    inst.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="animate-pulse text-blue-400 font-medium tracking-wide">Loading StarHub...</p>
      </div>
    </div>
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-tr from-blue-600 to-purple-600 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                <Box size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">StarHub</h1>
                <p className="text-xs text-zinc-400 font-medium">Manager Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 pl-4 pr-2 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors cursor-default">
                {session.user.image ? (
                  <img src={session.user.image} alt="User" className="w-8 h-8 rounded-full ring-2 ring-zinc-800" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                    {session.user.name?.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium text-zinc-200 pr-2">{session.user.name}</span>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2.5 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all duration-200"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
          <div>
            <h2 className="text-4xl font-bold text-white mb-2">Instances</h2>
            <p className="text-zinc-400 text-base max-w-lg">
              Manage your game instances, configure settings, and deploy updates to your launcher users in real-time.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="group flex items-center gap-2 bg-white text-black px-5 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)] active:scale-95"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            Create Instance
          </button>
        </div>

        {/* Search & Filter */}
        <div className="mb-8">
          <div className="relative max-w-md group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-zinc-500 group-focus-within:text-blue-400 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search instances by name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl leading-5 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-white/10 transition-all"
            />
          </div>
        </div>

        {/* Instance List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstances.map((instance) => (
            <div 
              key={instance.id} 
              className="group relative bg-zinc-900/50 border border-white/5 hover:border-blue-500/30 rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1 overflow-hidden"
            >
              {/* Background Gradient Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative z-10 flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {instance.icon ? (
                      <img src={instance.icon} alt="" className="w-14 h-14 object-contain rounded-xl bg-black/40 border border-white/10 p-1" />
                    ) : (
                      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-zinc-600">
                        <Box size={24} />
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-900 ${instance.loader === 'fabric' ? 'bg-orange-400' : 'bg-blue-500'}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white leading-tight mb-1 group-hover:text-blue-400 transition-colors">{instance.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{instance.loader}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span className="text-xs text-zinc-400 font-mono bg-white/5 px-1.5 py-0.5 rounded">{instance.version}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-1">
                  <button 
                    onClick={() => openEditModal(instance)}
                    className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => {
                      setDeletingId(instance.id)
                      setIsDeleteModalOpen(true)
                    }}
                    className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <p className="relative z-10 text-sm text-zinc-400 line-clamp-2 mb-6 min-h-[2.5rem] leading-relaxed">
                {instance.description || "No description provided."}
              </p>

              <div className="relative z-10 pt-4 border-t border-white/5 flex gap-4 text-xs font-medium text-zinc-500">
                {instance.discord && (
                  <a href={instance.discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#5865F2] transition-colors">
                    <ExternalLink size={14} /> Discord
                  </a>
                )}
                {instance.website && (
                  <a href={instance.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-blue-400 transition-colors">
                    <ExternalLink size={14} /> Website
                  </a>
                )}
              </div>
            </div>
          ))}

          {filteredInstances.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-white/10 rounded-2xl bg-white/5">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 text-zinc-600">
                <Search size={32} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No instances found</h3>
              <p className="text-zinc-500 max-w-sm mb-6">
                We could not find any instances matching your search. Try adjusting your filters or create a new one.
              </p>
              <button 
                onClick={openCreateModal} 
                className="text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline underline-offset-4"
              >
                Create new instance
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingInstance ? `Edit ${editingInstance.name}` : "New Instance"}
      >
        <InstanceForm
          initialData={editingInstance}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchInstances}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-zinc-300">
            Are you sure you want to delete this instance? This action cannot be undone and will remove it from the launcher immediately.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-zinc-300 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-lg shadow-red-900/20"
            >
              Delete Instance
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
