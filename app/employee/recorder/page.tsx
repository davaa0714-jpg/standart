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

export default function EmployeeRecorderPage() {
  // State
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)
  const [exportFormat, setExportFormat] = useState<'webm' | 'mp3' | 'wav'>('webm')
  const [isConverting, setIsConverting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  
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
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      setIsSupported(false)
      setError('Your browser does not support audio recording. Please use a modern browser like Chrome, Firefox, or Edge.')
    }
  }, [])

  // Timer for recording
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

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) return

    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const audioUrl = URL.createObjectURL(audioBlob)
        
        const newFile: AudioFile = {
          id: generateId(),
          name: `Recording ${audioFiles.length + 1}`,
          url: audioUrl,
          blob: audioBlob,
          duration: recordingTime,
          size: audioBlob.size,
          type: 'audio/webm',
          createdAt: new Date()
        }

        setAudioFiles(prev => [...prev, newFile])
        setRecordingTime(0)
        setIsRecording(false)
        setIsPaused(false)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to start recording. Please check your microphone permissions.')
    }
  }, [isSupported, audioFiles.length, recordingTime])

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      
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
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload file')
      }
      
      const result = await response.json()
      
      // Update file with saved status
      setAudioFiles(prev => prev.map(f => 
        f.id === file.id 
          ? { ...f, isSaved: true, dbId: result.data.id, file_path: result.data.file_path }
          : f
      ))
      
    } catch (err) {
      console.error('Failed to upload file:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  // Save all files to database
  const saveAllToDatabase = async () => {
    const unsavedFiles = audioFiles.filter(f => !f.isSaved && f.blob.size > 0)
    
    if (unsavedFiles.length === 0) {
      setError('No files to save')
      return
    }
    
    for (const file of unsavedFiles) {
      await saveFileToDatabase(file)
    }
  }

  // Delete file
  const deleteFile = useCallback((fileId: string) => {
    setAudioFiles(prev => {
      const file = prev.find(f => f.id === fileId)
      if (file && file.url) {
        URL.revokeObjectURL(file.url)
      }
      return prev.filter(f => f.id !== fileId)
    })
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      newSet.delete(fileId)
      return newSet
    })
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

  // Start editing file name
  const startEditing = useCallback((fileId: string, currentName: string) => {
    setEditingFile(fileId)
    setEditName(currentName)
  }, [])

  // Save edited name
  const saveEditName = useCallback((fileId: string) => {
    if (editName.trim()) {
      setAudioFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, name: editName.trim() } : f
      ))
    }
    setEditingFile(null)
    setEditName('')
  }, [editName])

  // Cancel editing
  const cancelEdit = useCallback(() => {
    setEditingFile(null)
    setEditName('')
  }, [])

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
    <div className="max-w-[1000px] mx-auto space-y-6">
      {/* Page Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
          <span className="text-xl">🎙️</span>
        </div>
        <div>
          <h1 className="text-lg font-bold">Аудио Бичлэг (Ажилтан)</h1>
          <p className="text-xs text-tx3">Бичлэг хийх, импорт хийх, хадгалах боломжтой</p>
        </div>
      </div>

      {/* Employee Notice */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3">
        <span className="text-xl">👷</span>
        <div className="flex-1">
          <p className="text-sm text-blue-400 font-medium">Ажилтаны бичлэг</p>
          <p className="text-xs text-blue-400/70 mt-1">
            Та өөрийн бичлэгүүдийг хийж, хадгалах боломжтой. Бичлэгүүд нь системд хадгалагдана.
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

      {/* Recording Area */}
      <div className="bg-surface border border-border rounded-2xl p-8 mb-6">
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
            className={`
              relative w-32 h-32 rounded-full flex items-center justify-center
              transition-all duration-300 transform hover:scale-105 active:scale-95
              ${isRecording 
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
            disabled={isRecording}
            className="
              px-4 py-2 rounded-xl border border-border bg-surface2
              hover:bg-surface3 transition-colors disabled:opacity-50
              flex items-center gap-2 text-sm font-medium
            "
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
              {audioFiles.some(f => !f.isSaved) && (
                <button
                  onClick={saveAllToDatabase}
                  disabled={isUploading}
                  className="px-3 py-1 bg-accent hover:bg-accent-light text-white rounded-lg text-xs font-medium disabled:opacity-50"
                >
                  {isUploading ? 'Saving...' : 'Save All'}
                </button>
              )}
            </div>
          </div>

          {selectedFiles.size > 0 && (
            <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <p className="text-sm text-accent-light">
                {selectedFiles.size} file(s) selected
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
                    {editingFile === file.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditName(file.id)
                            if (e.key === 'Escape') cancelEdit()
                          }}
                          className="flex-1 px-2 py-1 bg-surface3 border border-border rounded text-sm"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEditName(file.id)}
                          className="text-green-500 hover:text-green-400"
                        >
                          ✓
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-red-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-tx2">
                          {formatFileSize(file.size)} • {formatTime(file.duration)} • {file.type}
                        </div>
                        <div className="text-xs text-tx3 mt-1">
                          {file.createdAt.toLocaleString('mn-MN')}
                          {file.isSaved && (
                            <span className="ml-2 text-green-500">✓ Saved</span>
                          )}
                        </div>
                      </>
                    )}
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

                    {/* Edit Button */}
                    {!file.isSaved && (
                      <button
                        onClick={() => startEditing(file.id, file.name)}
                        className="w-8 h-8 rounded-lg bg-surface3 hover:bg-surface4 flex items-center justify-center transition-colors"
                      >
                        <span className="text-sm">✏️</span>
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="w-8 h-8 rounded-lg bg-surface3 hover:bg-surface4 flex items-center justify-center transition-colors"
                    >
                      <span className="text-sm">🗑️</span>
                    </button>
                  </div>
                </div>

                {/* Hidden Audio Element */}
                <audio
                  ref={(el) => {
                    if (el) {
                      audioRefs.current[file.id] = el
                      el.src = file.url
                    }
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
          <div className="text-6xl mb-4">🎙️</div>
          <h3 className="text-lg font-bold mb-2">No Audio Files Yet</h3>
          <p className="text-sm text-tx2 mb-6">
            Start recording or import audio files to get started
          </p>
        </div>
      )}
    </div>
  )
}
