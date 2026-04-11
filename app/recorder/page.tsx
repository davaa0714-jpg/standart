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
  isSaved?: boolean  // Whether saved to database
  dbId?: string      // Database record ID if saved
  file_path?: string // Storage path in Supabase
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

export default function VoiceRecorderPage() {
  // State
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp3' | 'wav'>('webm')
  const [isConverting, setIsConverting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'director' | null>(null)
  
  // Multiple files state
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [editingFile, setEditingFile] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Get user role on mount
  useEffect(() => {
    const getUserRole = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          setUserRole(profile?.role || null)
        }
      } catch (err) {
        console.error('Failed to get user role:', err)
      }
    }
    getUserRole()
  }, [])

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsSupported(false)
      setError('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.')
    }
  }, [])

  // Timer effect
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isRecording, isPaused])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      audioFiles.forEach(file => {
        URL.revokeObjectURL(file.url)
      })
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  // Load audio files from database on mount
  useEffect(() => {
    loadAudioFilesFromDB()
  }, [])

  // Load audio files from database
  const loadAudioFilesFromDB = async () => {
    try {
      const response = await fetch('/api/audio-files')
      const result = await response.json()
      
      if (result.success && result.data) {
        // Convert database files to local format with signed URLs
        const dbFiles: AudioFile[] = await Promise.all(
          result.data.map(async (dbFile: DatabaseAudioFile) => {
            // Get signed URL for playback
            const supabase = createClient()
            const { data: { publicUrl } } = supabase.storage
              .from('audio-files')
              .getPublicUrl(dbFile.file_path)
            
            return {
              id: dbFile.id,
              name: dbFile.name,
              url: publicUrl,
              blob: new Blob(), // Empty blob for DB files (loaded on demand)
              duration: dbFile.duration || 0,
              size: dbFile.file_size || 0,
              type: dbFile.file_type || 'audio/webm',
              createdAt: new Date(dbFile.created_at),
              isSaved: true,
              dbId: dbFile.id
            }
          })
        )
        
        setAudioFiles(prev => {
          // Merge: keep local files that aren't saved yet, add DB files
          const localUnsaved = prev.filter(f => !f.isSaved)
          return [...dbFiles, ...localUnsaved]
        })
      }
    } catch (err) {
      console.error('Failed to load audio files from database:', err)
    }
  }

  // Validate audio file is not corrupted
  const validateAudioFile = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const audio = new Audio()
      const url = URL.createObjectURL(file)
      
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(url)
        resolve(false) // File takes too long to load, likely corrupted
      }, 5000) // 5 second timeout
      
      audio.onloadedmetadata = () => {
        clearTimeout(timeout)
        URL.revokeObjectURL(url)
        resolve(true) // File loaded successfully
      }
      
      audio.onerror = () => {
        clearTimeout(timeout)
        URL.revokeObjectURL(url)
        resolve(false) // File is corrupted
      }
      
      audio.src = url
    })
  }

  // Upload file to database
  const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const newFiles: AudioFile[] = []
    const validAudioTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/aac']
    
    for (const file of Array.from(files)) {
      // Check if file is a valid audio type
      const isValidAudio = validAudioTypes.some(type => file.type === type || file.type.startsWith(type))
      
      if (!isValidAudio) {
        setError(`"${file.name}" is not a supported audio file. Supported formats: WebM, MP3, WAV, OGG, M4A, FLAC, AAC`)
        continue
      }

      // Validate file is not corrupted (only for files larger than 1KB)
      if (file.size > 1024) {
        const isValidFile = await validateAudioFile(file)
        if (!isValidFile) {
          setError(`"${file.name}" appears to be corrupted or invalid`)
          continue
        }
      }

      const url = URL.createObjectURL(file)
      
      newFiles.push({
        id: generateId(),
        name: file.name.replace(/\.[^/.]+$/, ''),
        url,
        blob: file,
        duration: 0,
        size: file.size,
        type: file.type,
        createdAt: new Date()
      })
    }

    if (newFiles.length > 0) {
      setAudioFiles(prev => [...prev, ...newFiles])
      setError(null)
    }
  }, [])

  // Save file to database
  const saveFileToDatabase = async (file: AudioFile) => {
    if (file.isSaved || file.blob.size === 0) return
    
    setIsUploading(true)
    try {
      // Create form data
      const formData = new FormData()
      
      // Get file extension from original file type or default to webm
      let fileExtension = 'webm'
      if (file.type) {
        const typeToExt: Record<string, string> = {
          'audio/webm': 'webm',
          'audio/mp3': 'mp3',
          'audio/mpeg': 'mp3',
          'audio/wav': 'wav',
          'audio/ogg': 'ogg',
          'audio/m4a': 'm4a',
          'audio/mp4': 'm4a',
          'audio/x-m4a': 'm4a',
          'audio/flac': 'flac',
          'audio/aac': 'aac'
        }
        fileExtension = typeToExt[file.type] || 'webm'
      }
      
      formData.append('file', file.blob, `${file.name}.${fileExtension}`)
      formData.append('name', file.name)
      formData.append('duration', String(file.duration))
      
      const response = await fetch('/api/audio-files', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success && result.data) {
        // Update file with DB info
        setAudioFiles(prev => prev.map(f => 
          f.id === file.id 
            ? { ...f, isSaved: true, dbId: result.data.id }
            : f
        ))
        setError(null)
      } else {
        setError(result.error || 'Failed to save file')
      }
    } catch (err) {
      console.error('Failed to upload file:', err)
      setError('Failed to save file to database')
    } finally {
      setIsUploading(false)
    }
  }

  // Save all unsaved files to database
  const saveAllToDatabase = async () => {
    const unsavedFiles = audioFiles.filter(f => !f.isSaved && f.blob.size > 0)
    if (unsavedFiles.length === 0) return
    
    setIsUploading(true)
    try {
      for (const file of unsavedFiles) {
        await saveFileToDatabase(file)
      }
    } finally {
      setIsUploading(false)
    }
  }

  // Delete file from database and local
  const deleteFile = useCallback(async (id: string) => {
    const file = audioFiles.find(f => f.id === id)
    
    // If file is saved in database, delete from DB first
    if (file?.dbId) {
      try {
        const supabase = createClient()
        // Delete from storage
        if (file.file_path) {
          await supabase.storage.from('audio-files').remove([file.file_path])
        }
        // Delete from database
        await supabase.from('audio_files').delete().eq('id', file.dbId)
      } catch (err) {
        console.error('Failed to delete from database:', err)
      }
    }
    
    setAudioFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.url)
      }
      return prev.filter(f => f.id !== id)
    })
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }, [audioFiles])

  // Delete selected files
  const deleteSelectedFiles = useCallback(() => {
    selectedFiles.forEach(id => {
      const file = audioFiles.find(f => f.id === id)
      if (file) {
        URL.revokeObjectURL(file.url)
      }
    })
    setAudioFiles(prev => prev.filter(f => !selectedFiles.has(f.id)))
    setSelectedFiles(new Set())
  }, [audioFiles, selectedFiles])

  // Rename file
  const startRename = useCallback((file: AudioFile) => {
    setEditingFile(file.id)
    setEditName(file.name)
  }, [])

  const saveRename = useCallback(() => {
    if (!editingFile || !editName.trim()) return
    
    setAudioFiles(prev => prev.map(f => 
      f.id === editingFile ? { ...f, name: editName.trim() } : f
    ))
    setEditingFile(null)
    setEditName('')
  }, [editingFile, editName])

  const cancelRename = useCallback(() => {
    setEditingFile(null)
    setEditName('')
  }, [])

  // Reorder files
  const moveFile = useCallback((index: number, direction: 'up' | 'down') => {
    setAudioFiles(prev => {
      const newFiles = [...prev]
      const newIndex = direction === 'up' ? index - 1 : index + 1
      
      if (newIndex < 0 || newIndex >= newFiles.length) return prev
      
      const temp = newFiles[index]
      newFiles[index] = newFiles[newIndex]
      newFiles[newIndex] = temp
      
      return newFiles
    })
  }, [])

  // Toggle file selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
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
  }, [audioFiles, selectedFiles.size])

  // Export single file
  const exportFile = useCallback(async (file: AudioFile) => {
    setIsConverting(true)
    try {
      let mimeType = 'audio/webm'
      let extension = 'webm'
      
      switch (exportFormat) {
        case 'mp3':
          mimeType = 'audio/mpeg'
          extension = 'mp3'
          break
        case 'wav':
          mimeType = 'audio/wav'
          extension = 'wav'
          break
        default:
          mimeType = 'audio/webm'
          extension = 'webm'
      }

      const exportBlob = new Blob([file.blob], { type: mimeType })
      const exportUrl = URL.createObjectURL(exportBlob)
      
      const link = document.createElement('a')
      link.href = exportUrl
      link.download = `${file.name}.${extension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(exportUrl)
    } catch (err) {
      setError(`Failed to export "${file.name}"`)
    } finally {
      setIsConverting(false)
    }
  }, [exportFormat])

  // Batch export selected files
  const exportSelectedFiles = useCallback(async () => {
    if (selectedFiles.size === 0) return

    setIsConverting(true)
    try {
      const filesToExport = audioFiles.filter(f => selectedFiles.has(f.id))
      
      for (const file of filesToExport) {
        let mimeType = 'audio/webm'
        let extension = 'webm'
        
        switch (exportFormat) {
          case 'mp3':
            mimeType = 'audio/mpeg'
            extension = 'mp3'
            break
          case 'wav':
            mimeType = 'audio/wav'
            extension = 'wav'
            break
          default:
            mimeType = 'audio/webm'
            extension = 'webm'
        }

        const exportBlob = new Blob([file.blob], { type: mimeType })
        const exportUrl = URL.createObjectURL(exportBlob)
        
        const link = document.createElement('a')
        link.href = exportUrl
        link.download = `${file.name}.${extension}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        URL.revokeObjectURL(exportUrl)
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (err) {
      setError('Failed to export files')
    } finally {
      setIsConverting(false)
    }
  }, [audioFiles, selectedFiles, exportFormat])

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      audioChunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      })
      
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : 'audio/ogg'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(audioBlob)
        
        const newFile: AudioFile = {
          id: generateId(),
          name: `Recording-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`,
          url,
          blob: audioBlob,
          duration: recordingTime,
          size: audioBlob.size,
          type: mimeType,
          createdAt: new Date()
        }
        
        setAudioFiles(prev => [...prev, newFile])
        stream.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
        setError('An error occurred during recording. Please try again.')
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setIsPaused(false)
      setRecordingTime(0)

    } catch (err) {
      console.error('Error starting recording:', err)
      
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone permission denied. Please allow access to your microphone and try again.')
        } else if (err.name === 'NotFoundError') {
          setError('No microphone found. Please connect a microphone and try again.')
        } else {
          setError(`Microphone error: ${err.message}`)
        }
      } else {
        setError('Failed to start recording. Please check your microphone and try again.')
      }
    }
  }, [])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
    }
  }, [isRecording])

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause()
      setIsPaused(true)
    }
  }, [isRecording, isPaused])

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume()
      setIsPaused(false)
    }
  }, [isRecording, isPaused])

  // Get status text
  const getStatusText = () => {
    if (isRecording && isPaused) return 'Paused'
    if (isRecording) return 'Recording...'
    if (audioFiles.length > 0) return `${audioFiles.length} file(s) ready`
    return 'Ready to record'
  }

  // Get status color
  const getStatusColor = () => {
    if (isRecording && isPaused) return 'text-yellow-500'
    if (isRecording) return 'text-red-500'
    if (audioFiles.length > 0) return 'text-green-500'
    return 'text-tx3'
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-2xl border border-border p-8 text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2">Browser Not Supported</h1>
          <p className="text-tx2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Page Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent-light/20 flex items-center justify-center">
          <span className="text-xl">🎙️</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">Voice Recorder</h1>
          <p className="text-xs text-tx3">Record, play, import and export multiple audio files</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-danger/10 border border-danger/30 rounded-xl flex items-start gap-3">
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

      {/* Recording Area */}
      <div className="bg-surface border border-border rounded-2xl p-8 mb-6">
        {/* Admin Warning */}
        {userRole === 'admin' && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
            <span className="text-xl">👁️</span>
            <div className="flex-1">
              <p className="text-sm text-amber-400 font-medium">Админ хэрэглэгчид зөвхөн харах эрхтэй</p>
              <p className="text-xs text-amber-400/70 mt-1">
                Та бичлэг хийх, импорт хийх эрхгүй. Зөвхөн байгаа бичлэгүүдийг харж, татаж авах боломжтой.
              </p>
            </div>
          </div>
        )}

        {/* Status & Timer */}
        <div className="text-center mb-8">
          <div className={`text-sm font-medium mb-2 ${getStatusColor()}`}>
            {getStatusText()}
          </div>
          <div className="text-5xl font-mono font-bold tracking-wider">
            {formatTime(recordingTime)}
          </div>
        </div>

        {/* Main Record Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={userRole === 'admin'}
            className={`
              relative w-32 h-32 rounded-full flex items-center justify-center
              transition-all duration-300 transform hover:scale-105 active:scale-95
              ${userRole === 'admin' 
                ? 'bg-gray-500 cursor-not-allowed opacity-50' 
                : isRecording 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30' 
                  : 'bg-gradient-to-br from-accent to-accent-light hover:shadow-xl hover:shadow-accent/30'
              }
            `}
          >
            {isRecording && !isPaused && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
                <span className="absolute -inset-4 rounded-full bg-red-500/10 animate-pulse" />
              </>
            )}
            
            <span className="text-4xl relative z-10">
              {isRecording ? '⏹️' : '🎙️'}
            </span>
          </button>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-3 flex-wrap">
          {isRecording && (
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="
                px-4 py-2 rounded-xl border border-border bg-surface2
                hover:bg-surface3 transition-colors
                flex items-center gap-2 text-sm font-medium
              "
            >
              <span>{isPaused ? '▶️' : '⏸️'}</span>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept="audio/*"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRecording || userRole === 'admin'}
            className={`
              px-4 py-2 rounded-xl border border-border bg-surface2
              hover:bg-surface3 transition-colors disabled:opacity-50
              flex items-center gap-2 text-sm font-medium
              ${userRole === 'admin' ? 'cursor-not-allowed' : ''}
            `}
          >
            <span>📁</span>
            Import Audio
          </button>
        </div>
      </div>

      {/* File List Section */}
      {audioFiles.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">Audio Files ({audioFiles.length})</h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-accent-light hover:underline"
              >
                {selectedFiles.size === audioFiles.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-accent/10 rounded-xl mb-4">
              <span className="text-sm font-medium">{selectedFiles.size} selected</span>
              <div className="flex items-center gap-2">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'webm' | 'mp3' | 'wav')}
                  className="text-xs px-2 py-1 rounded-lg border border-border bg-surface"
                >
                  <option value="webm">WebM</option>
                  <option value="mp3">MP3</option>
                  <option value="wav">WAV</option>
                </select>
                
                <button
                  onClick={exportSelectedFiles}
                  disabled={isConverting}
                  className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {isConverting ? '⏳' : '📤'} Export
                </button>
                
                <button
                  onClick={deleteSelectedFiles}
                  className="px-3 py-1.5 bg-danger/10 text-danger-light rounded-lg text-xs font-medium hover:bg-danger/20 transition-colors"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          )}

          {/* Save All to Database Button */}
          {audioFiles.some(f => !f.isSaved) && selectedFiles.size === 0 && (
            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl mb-4">
              <span className="text-sm font-medium text-green-600">
                {audioFiles.filter(f => !f.isSaved).length} unsaved file(s)
              </span>
              <button
                onClick={saveAllToDatabase}
                disabled={isUploading}
                className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {isUploading ? '⏳' : '💾'} Save All to Database
              </button>
            </div>
          )}

          {/* File List */}
          <div className="space-y-2">
            {audioFiles.map((file, index) => (
              <div
                key={file.id}
                className={`
                  flex items-center gap-3 p-3 rounded-xl border transition-colors
                  ${selectedFiles.has(file.id) 
                    ? 'bg-accent/10 border-accent/30' 
                    : 'bg-surface2 border-border hover:bg-surface3'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => toggleSelection(file.id)}
                  className="w-4 h-4 rounded border-border"
                />

                <button
                  onClick={() => setCurrentPlayingId(currentPlayingId === file.id ? null : file.id)}
                  className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center hover:bg-accent/30 transition-colors"
                >
                  <span className="text-sm">
                    {currentPlayingId === file.id ? '⏸️' : '▶️'}
                  </span>
                </button>

                <div className="flex-1 min-w-0">
                  {editingFile === file.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRename()
                          if (e.key === 'Escape') cancelRename()
                        }}
                        className="flex-1 px-2 py-1 text-sm bg-surface border border-border rounded focus:border-accent focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={saveRename}
                        className="text-green-500 hover:text-green-600"
                      >
                        ✓
                      </button>
                      <button
                        onClick={cancelRename}
                        className="text-tx3 hover:text-tx"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{file.name}</p>
                        {file.isSaved && (
                          <span className="text-green-500 text-xs" title="Saved to database">✓</span>
                        )}
                        {!file.isSaved && (
                          <span className="text-amber-500 text-xs" title="Not saved">●</span>
                        )}
                      </div>
                      <p className="text-xs text-tx3">
                        {formatFileSize(file.size)} • {file.createdAt.toLocaleTimeString()}
                      </p>
                    </>
                  )}
                </div>

                {currentPlayingId === file.id && (
                  <audio
                    src={file.url}
                    autoPlay
                    controls
                    className="w-32 h-8"
                    onEnded={() => setCurrentPlayingId(null)}
                  />
                )}

                <div className="flex items-center gap-1">
                  {!file.isSaved && (
                    <button
                      onClick={() => saveFileToDatabase(file)}
                      disabled={isUploading}
                      className="p-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      title="Save to Database"
                    >
                      <span className="text-xs">💾</span>
                    </button>
                  )}

                  <button
                    onClick={() => moveFile(index, 'up')}
                    disabled={index === 0}
                    className="p-1.5 rounded-lg hover:bg-surface3 transition-colors disabled:opacity-30"
                  >
                    <span className="text-xs">↑</span>
                  </button>
                  <button
                    onClick={() => moveFile(index, 'down')}
                    disabled={index === audioFiles.length - 1}
                    className="p-1.5 rounded-lg hover:bg-surface3 transition-colors disabled:opacity-30"
                  >
                    <span className="text-xs">↓</span>
                  </button>

                  <button
                    onClick={() => startRename(file)}
                    className="p-1.5 rounded-lg hover:bg-surface3 transition-colors"
                    title="Rename"
                  >
                    <span className="text-xs">✏️</span>
                  </button>

                  <button
                    onClick={() => exportFile(file)}
                    disabled={isConverting}
                    className="p-1.5 rounded-lg hover:bg-surface3 transition-colors disabled:opacity-50"
                    title="Export"
                  >
                    <span className="text-xs">�</span>
                  </button>

                  <button
                    onClick={() => deleteFile(file.id)}
                    className="p-1.5 rounded-lg hover:bg-danger/10 transition-colors text-danger-light"
                    title="Delete"
                  >
                    <span className="text-xs">🗑️</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isRecording && audioFiles.length === 0 && (
        <div className="text-center text-tx3 text-sm space-y-2 py-12">
          <p className="text-4xl mb-4">🎙️</p>
          <p>Click the microphone button to start recording</p>
          <p>Or import audio files</p>
          <p className="text-xs">Supported formats: WebM, MP3, WAV, OGG</p>
        </div>
      )}
    </>
  )
}
