import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const VALID_ROLES = new Set(['admin', 'manager', 'staff'])

type RegisterBody = {
  full_name?: unknown
  email?: unknown
  password?: unknown
  position?: unknown
  department?: unknown
  phone?: unknown
  role?: unknown
}

function normalizeRequiredText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalText(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function isDuplicateEmailError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('already been registered') || normalized.includes('duplicate')
}

export async function POST(req: NextRequest) {
  let createdUserId: string | null = null

  try {
    const body = (await req.json()) as RegisterBody
    const fullName = normalizeRequiredText(body.full_name)
    const email = normalizeRequiredText(body.email).toLowerCase()
    const password = normalizeRequiredText(body.password)
    const role = normalizeRequiredText(body.role)

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Full name, email, and password are required.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: 'Invalid role selected.' }, { status: 400 })
    }

    const supabase = createServiceClient() as any
    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        full_name: fullName,
      },
    })

    if (createUserError || !createdUser.user) {
      const message = createUserError?.message ?? 'Unable to create auth user.'
      console.error('Auth user creation error:', createUserError)
      const status = isDuplicateEmailError(message) ? 400 : 500
      const error =
        status === 400
          ? 'This email is already registered. Please log in or use a different email.'
          : message

      return NextResponse.json({ error }, { status })
    }

    const userId = createdUser.user.id
    createdUserId = userId

    const profile = {
      id: userId,
      org_id: ORG_ID,
      full_name: fullName,
      position: normalizeOptionalText(body.position),
      department: normalizeOptionalText(body.department),
      phone: normalizeOptionalText(body.phone),
      role,
      is_active: true,
      avatar_url: null,
    }

    const { error: profileError } = await supabase.from('profiles').insert([profile])

    if (profileError) {
      console.error('Profile insert error details:', profileError)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    // Keep auth metadata and profiles.role in sync for routing/middleware checks.
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        role,
        full_name: fullName,
      },
    })

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    if (createdUserId) {
      try {
        const supabase = createServiceClient()
        await supabase.auth.admin.deleteUser(createdUserId)
      } catch {
        // Best-effort rollback if profile creation fails after auth user creation.
      }
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error.' },
      { status: 500 }
    )
  }
}
