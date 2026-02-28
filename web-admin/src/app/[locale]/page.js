
'use client'

import { useSession, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Plus, Settings, LogOut, Search, Trash2, Edit, ExternalLink, Box } from "lucide-react"
import { useTranslations } from 'next-intl'
import Modal from "@/components/Modal"
import InstanceForm from "@/components/InstanceForm"
import Preloader from "@/components/Preloader"
import { ThemeToggle } from "@/components/ThemeToggle"
import { LanguageToggle } from "@/components/LanguageToggle"

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('HomePage')
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
    return <Preloader />
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30 transition-colors duration-300">
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-white/5 bg-white/80 dark:bg-black/20 backdrop-blur-md sticky top-0 z-20 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Box className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                  {t('title')}
                </h1>
                <p className="text-xs text-gray-500 dark:text-zinc-500 font-medium tracking-wide">{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <ThemeToggle />
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-medium text-gray-600 dark:text-zinc-300">
                  {session.user?.name || 'Admin'}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all duration-200"
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={openCreateModal}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
          >
            <Plus size={20} />
            <span>{t('newInstance')}</span>
          </button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInstances.map((instance) => (
            <div
              key={instance.id}
              className="group relative bg-white dark:bg-zinc-900/50 border border-gray-200 dark:border-white/5 rounded-3xl overflow-hidden hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col"
            >
              {/* Card Header with Background */}
              <div className="h-32 relative overflow-hidden bg-gray-100 dark:bg-zinc-800">
                {instance.backgroundImage ? (
                    <img 
                        src={instance.backgroundImage} 
                        alt="bg" 
                        className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-900 opacity-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-zinc-900 to-transparent" />
                
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                  <button
                    onClick={() => openEditModal(instance)}
                    className="p-2 bg-white/90 dark:bg-black/50 hover:bg-blue-500 text-gray-700 dark:text-white hover:text-white rounded-xl backdrop-blur-md transition-colors shadow-lg"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(instance.id)
                      setIsDeleteModalOpen(true)
                    }}
                    className="p-2 bg-white/90 dark:bg-black/50 hover:bg-red-500 text-gray-700 dark:text-white hover:text-white rounded-xl backdrop-blur-md transition-colors shadow-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-6 relative -mt-12 flex-1 flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 shadow-xl overflow-hidden shrink-0">
                    {instance.icon ? (
                      <img src={instance.icon} alt={instance.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-zinc-600">
                        <Box size={32} />
                      </div>
                    )}
                  </div>
                  <div className="pt-12">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight mb-1 group-hover:text-blue-500 transition-colors">
                        {instance.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
                            {instance.loader} {instance.version}
                        </span>
                        {instance.maintenance && (
                            <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
                                {t('maintenance')}
                            </span>
                        )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                            <span className="block text-xs text-gray-500 dark:text-zinc-500 mb-1">{t('modpackVer')}</span>
                            <span className="font-mono text-gray-700 dark:text-zinc-300">{instance.modpackVersion || '-'}</span>
                        </div>
                        <div className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                            <span className="block text-xs text-gray-500 dark:text-zinc-500 mb-1">{t('loaderVer')}</span>
                            <span className="font-mono text-gray-700 dark:text-zinc-300">{instance.loaderVersion || '-'}</span>
                        </div>
                    </div>

                    {instance.serverIp && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-100 dark:border-white/5 group/ip cursor-pointer hover:bg-blue-500/5 hover:border-blue-500/20 transition-colors">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <code className="text-sm text-gray-600 dark:text-zinc-400 font-mono flex-1 truncate">{instance.serverIp}</code>
                        </div>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredInstances.length === 0 && !loading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="text-gray-400 dark:text-zinc-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('noInstances')}</h3>
            <p className="text-gray-500 dark:text-zinc-500">{t('noInstancesDesc')}</p>
          </div>
        )}
      </main>

      {/* Modals */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingInstance ? "Edit Instance" : "New Instance"}
      >
        <InstanceForm
          initialData={editingInstance}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchInstances}
        />
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Instance"
      >
        <div className="space-y-6">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-4">
            <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
              <Trash2 className="text-red-400" size={20} />
            </div>
            <div>
              <h4 className="text-red-400 font-semibold mb-1">Are you sure?</h4>
              <p className="text-red-200/70 text-sm">
                This action cannot be undone. This will permanently delete the instance configuration.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
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
