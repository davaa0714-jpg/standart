import type { Role } from '@/types/database'

const KNOWN_ROLES: Role[] = ['admin', 'director', 'manager', 'staff']

export function normalizeRole(role: unknown): Role | undefined {
  if (typeof role !== 'string') return undefined
  return KNOWN_ROLES.includes(role as Role) ? (role as Role) : undefined
}

export function resolveRole(profileRole?: Role | null, metadataRole?: unknown): Role | undefined {
  return profileRole ?? normalizeRole(metadataRole)
}

export function getRoleHomePath(role?: Role | null) {
  if (role === 'admin') return '/admin'
  if (role === 'director') return '/director'
  if (role === 'manager') return '/manager'
  if (role === 'staff') return '/employee'
  return '/employee'
}
