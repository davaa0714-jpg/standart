import type { Role } from '@/types/database'

const KNOWN_ROLES: Role[] = ['admin', 'manager', 'employee']

export function normalizeRole(role: unknown): Role | undefined {
  if (typeof role !== 'string') return undefined
  return KNOWN_ROLES.includes(role as Role) ? (role as Role) : undefined
}

export function resolveRole(profileRole?: Role | null, metadataRole?: unknown): Role | undefined {
  return profileRole ?? normalizeRole(metadataRole)
}

export function getRoleHomePath(role?: Role | null) {
  if (role === 'admin') return '/admin'
  if (role === 'manager') return '/manager'
  if (role === 'employee') return '/employee'
  return '/employee'
}
