'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AudioFile as DatabaseAudioFile } from '@/types/database'

// Types
interface AudioFile {
  id: string
  name: string
  url: string
  blob: Blob
  duration: number
  size: number
  type: string
  createdAt: Date
  isSaved?: boolean
  dbId?: string
  file_path?: string
}

// Format seconds to MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export default function AdminRecorderPage() {
  // State
  const [error, setError] = useState<string | null>(null)
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Refs
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  // Load existing audio files from database
  useEffect(() => {
    const loadAudioFiles = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          const { data: files } = await supabase
            .from('audio_files')
            .select('*')
            .order('created_at', { ascending: false })

          if (files) {
            const audioFilesWithUrls: AudioFile[] = files.map(file => ({
              id: file.id,
              name: file.name,
              url: '', // Will be set when needed for playback
              blob: new Blob(), // Empty blob for view-only
              duration: file.duration || 0,
              size: file.file_size || 0,
              type: file.file_type || 'audio/webm',
              createdAt: new Date(file.created_at),
              isSaved: true,
              dbId: file.id,
              file_path: file.file_path
            }))
            setAudioFiles(audioFilesWithUrls)
          }
        }
      } catch (err) {
        console.error('Failed to load audio files:', err)
        setError('Аудио файлуудыг ачааллахад алдаа гарлаа')
      }
    }

    loadAudioFiles()
  }, [])

  // Toggle file selection
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }, [])

  // Select all files
  const selectAll = useCallback(() => {
    if (selectedFiles.size === audioFiles.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(audioFiles.map(f => f.id)))
    }
  }, [audioFiles, selectedFiles])

  // Play/pause audio
  const togglePlayPause = useCallback((fileId: string) => {
    const audio = audioRefs.current[fileId]
    if (!audio) return

    if (currentPlayingId === fileId) {
      if (audio.paused) {
        audio.play()
      } else {
        audio.pause()
      }
    } else {
      // Stop current playing audio
      if (currentPlayingId && audioRefs.current[currentPlayingId]) {
        audioRefs.current[currentPlayingId].pause()
      }
      audio.play()
      setCurrentPlayingId(fileId)
    }
  }, [currentPlayingId])

  // Get audio URL for playback
  const getAudioUrl = useCallback(async (filePath: string) => {
    try {
      const supabase = createClient()
      const { data } = await supabase.storage
        .from('audio-files')
        .createSignedUrl(filePath, 3600) // 1 hour expiry
      
      return data?.signedUrl || ''
    } catch (err) {
      console.error('Failed to get audio URL:', err)
      return ''
    }
  }, [])

  // Download file
  const downloadFile = useCallback(async (file: AudioFile) => {
    if (!file.file_path) return

    try {
      const url = await getAudioUrl(file.file_path)
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = `${file.name}.${file.type}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Failed to download file:', err)
      setError('Файл татаж авахад алдаа гарлаа')
    }
  }, [getAudioUrl])

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
          <span className="text-xl">👁️</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">Аудио Бичлэг (Админ)</h1>
          <p className="text-xs text-tx3">Бүх бичлэгүүдийг харах, татаж авах (Зөвхөн харах эрх)</p>
        </div>
      </div>

      {/* Admin Notice */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
        <span className="text-xl">👁️</span>
        <div className="flex-1">
          <p className="text-sm text-amber-400 font-medium">Админ хэрэглэгчид зөвхөн харах эрхтэй</p>
          <p className="text-xs text-amber-400/70 mt-1">
            Та бичлэг хийх, импорт хийх эрхгүй. Зөвхөн байгаа бичлэгүүдийг харж, татаж авах боломжтой.
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm text-danger-light">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="text-xs text-danger-light/70 hover:text-danger-light mt-1 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* File List Section */}
      {audioFiles.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">Аудио Файлууд ({audioFiles.length})</h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-accent-light hover:underline"
              >
                {selectedFiles.size === audioFiles.length ? 'Бүгдийг цуцлах' : 'Бүгдийг сонгох'}
              </button>
            </div>
          </div>

          {selectedFiles.size > 0 && (
            <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <p className="text-sm text-accent-light">
                {selectedFiles.size} файл сонгогдсон
              </p>
            </div>
          )}

          <div className="space-y-3">
            {audioFiles.map((file) => (
              <div
                key={file.id}
                className={`p-4 rounded-xl border transition-all ${
                  selectedFiles.has(file.id)
                    ? 'bg-accent/10 border-accent/30'
                    : 'bg-surface2 border-border hover:bg-surface3'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="w-4 h-4 rounded border-border bg-surface2 text-accent focus:ring-accent/50"
                  />

                  {/* File Info */}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{file.name}</div>
                    <div className="text-xs text-tx2">
                      {formatFileSize(file.size)} • {formatTime(file.duration)} • {file.type}
                    </div>
                    <div className="text-xs text-tx3 mt-1">
                      {file.createdAt.toLocaleString('mn-MN')}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {/* Play/Pause Button */}
                    <button
                      onClick={() => togglePlayPause(file.id)}
                      className="w-8 h-8 rounded-lg bg-surface3 hover:bg-surface4 flex items-center justify-center transition-colors"
                    >
                      <span className="text-sm">
                        {currentPlayingId === file.id ? '⏸️' : '▶️'}
                      </span>
                    </button>

                    {/* Download Button */}
                    <button
                      onClick={() => downloadFile(file)}
                      className="w-8 h-8 rounded-lg bg-surface3 hover:bg-surface4 flex items-center justify-center transition-colors"
                    >
                      <span className="text-sm">📥</span>
                    </button>
                  </div>
                </div>

                {/* Hidden Audio Element */}
                <audio
                  ref={(el) => {
                    if (el) audioRefs.current[file.id] = el
                  }}
                  onEnded={() => setCurrentPlayingId(null)}
                  preload="none"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {audioFiles.length === 0 && (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-lg font-bold mb-2">Аудио бичлэг байхгүй</h3>
          <p className="text-sm text-tx2">
            Одоогоор ямар ч аудио бичлэг байхгүй байна.
          </p>
        </div>
      )}
    </div>
  )
}
