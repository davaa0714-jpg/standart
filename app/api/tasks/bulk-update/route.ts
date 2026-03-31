import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { updates } = body
    
    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    
    // Update each task
    const results = await Promise.all(
      updates.map(async (update: { id: string; progress: number; submitted_note?: string; status?: string }) => {
        const { data, error } = await (supabase as any)
          .from('tasks')
          .update({
            progress: update.progress,
            submitted_note: update.submitted_note,
            status: update.status,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id)
          .select()
          .single()
        
        if (error) {
          console.error('Error updating task:', update.id, error)
          return { id: update.id, success: false, error: error.message }
        }
        
        // Add to task history
        await (supabase as any).from('task_history').insert({
          task_id: update.id,
          profile_id: user.id,
          action: 'Биелэлт илгээсэн',
          note: update.submitted_note,
          created_at: new Date().toISOString()
        })
        
        return { id: update.id, success: true }
      })
    )
    
    const failed = results.filter(r => !r.success)
    if (failed.length > 0) {
      return NextResponse.json({ 
        error: 'Some updates failed', 
        failed,
        results 
      }, { status: 207 })
    }
    
    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Bulk update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
