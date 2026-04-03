import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/audio-files - Upload new audio file
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile for org_id (optional)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.log('Profile not found for user:', user.id, '- saving without org_id')
    }

    const org_id = profile?.org_id || null

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const duration = parseInt(formData.get('duration') as string) || 0

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'webm'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    console.log('Uploading file:', { fileName, filePath, fileType: file.type, fileSize: file.size })

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: `Failed to upload file: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('File uploaded successfully to storage')

    // Insert record into database
    const { data: audioFile, error: dbError } = await supabase
      .from('audio_files')
      .insert({
        org_id: org_id,
        uploaded_by: user.id,
        name: name || file.name.replace(/\.[^/.]+$/, ''),
        file_path: filePath,
        file_type: fileExt,
        file_size: file.size,
        duration: duration
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database insert error:', dbError)
      // Try to clean up the uploaded file
      try {
        await supabase.storage.from('audio-files').remove([filePath])
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError)
      }
      return NextResponse.json(
        { error: `Failed to save file metadata: ${dbError.message}` },
        { status: 500 }
      )
    }

    console.log('File metadata saved successfully:', audioFile)

    return NextResponse.json({
      success: true,
      data: audioFile
    })

  } catch (error) {
    console.error('Audio file upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/audio-files - List all audio files for user
export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get audio files
    const { data: files, error } = await supabase
      .from('audio_files')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch audio files' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: files
    })

  } catch (error) {
    console.error('Audio file fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
