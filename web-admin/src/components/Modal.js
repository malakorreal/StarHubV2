
'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Modal({ isOpen, onClose, title, children }) {
  const [show, setShow] = useState(false)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    let timer;
    if (isOpen) {
      setShow(true)
      // Use requestAnimationFrame or a small timeout to ensure the DOM has updated
      timer = requestAnimationFrame(() => setAnimate(true))
      document.body.style.overflow = 'hidden'
    } else {
      setAnimate(false)
      timer = setTimeout(() => setShow(false), 300)
      document.body.style.overflow = 'unset'
    }
    return () => {
        clearTimeout(timer)
        cancelAnimationFrame(timer)
    }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
    }
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!show) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${animate ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'}`}>
      <div 
        className={`w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl transform transition-all duration-300 ${animate ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
      
      {/* Click outside to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  )
}
