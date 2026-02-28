
'use client'

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Settings, LogOut, Search, Trash2, Edit, ExternalLink } from "lucide-react"
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
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
      <div className="animate-pulse text-blue-600 font-semibold">Loading Dashboard...</div>
    </div>
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-1.5 rounded-md">
                <Settings size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">StarHub Manager</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full">
                {session.user.image && (
                  <img src={session.user.image} alt="User" className="w-6 h-6 rounded-full" />
                )}
                <span className="text-sm font-medium">{session.user.name}</span>
              </div>
              <button 
                onClick={() => signOut()}
                className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold">Instances</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Manage your launcher instances and configurations
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors shadow-none"
          >
            <Plus size={18} />
            New Instance
          </button>
        </div>

        {/* Search & Filter */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search instances..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-md leading-5 bg-white dark:bg-zinc-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-shadow"
            />
          </div>
        </div>

        {/* Instance List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstances.map((instance) => (
            <div 
              key={instance.id} 
              className="group bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors rounded-none p-5 relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  {instance.icon ? (
                    <img src={instance.icon} alt="" className="w-10 h-10 object-contain rounded-md bg-gray-50 dark:bg-zinc-900" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-700 rounded-md flex items-center justify-center text-gray-400">
                      ?
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg leading-tight">{instance.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="bg-gray-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                        {instance.loader}
                      </span>
                      <span>{instance.version}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(instance)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => {
                      setDeletingId(instance.id)
                      setIsDeleteModalOpen(true)
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 min-h-[2.5rem]">
                {instance.description || "No description provided."}
              </p>

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-700 flex gap-4 text-xs font-medium text-gray-500">
                {instance.discord && (
                  <a href={instance.discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-[#5865F2] transition-colors">
                    <ExternalLink size={12} /> Discord
                  </a>
                )}
                {instance.website && (
                  <a href={instance.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                    <ExternalLink size={12} /> Website
                  </a>
                )}
              </div>
            </div>
          ))}

          {filteredInstances.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400 border-2 border-dashed border-gray-200 dark:border-zinc-800 rounded-lg">
              <p>No instances found.</p>
              <button onClick={openCreateModal} className="mt-2 text-blue-600 hover:underline">
                Create your first instance
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
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this instance? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              Delete Instance
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
