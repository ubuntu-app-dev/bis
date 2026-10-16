import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export type UserRole = 'admin' | 'municipal' | 'secretary'

export interface AuthUser {
  username: string
  name: string
  role: UserRole
}

interface Session {
  token: string
  user: AuthUser
}

const STORAGE_KEY = 'bis_session'
const ROLES: UserRole[] = ['admin', 'municipal', 'secretary']

/**
 * Where each role lands after signing in.
 * Change these paths when you build the Admin and Municipal sections.
 */
export const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: '/admin',
  municipal: '/municipal',
  secretary: '/secretary',
}

/**
 * DEVELOPMENT ONLY: fixed accounts so you can test each user level.
 * These live in the browser bundle, so anyone can read them. Do not deploy
 * with real data behind this. When your backend exists, replace the body of
 * login() with an API call; the rest of the app won't need to change.
 */
const DEMO_ACCOUNTS: (AuthUser & { password: string })[] = [
  { username: 'admin', password: 'admin123', name: 'System Administrator', role: 'admin' },
  { username: 'municipal', password: 'municipal123', name: 'Municipal Officer', role: 'municipal' },
  {
    username: 'secretary',
    password: 'secretary123',
    name: 'Barangay Secretary',
    role: 'secretary',
  },
]

function readSession(): Session | null {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (!raw) continue
      const parsed = JSON.parse(raw) as Session
      if (parsed?.token && parsed.user && ROLES.includes(parsed.user.role)) return parsed
    } catch {
      // corrupt or unavailable storage: treat as signed out
    }
  }
  return null
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)
}

export const useAuthStore = defineStore('auth', () => {
  // Restore a previous session on page refresh
  const saved = readSession()
  const token = ref<string | null>(saved?.token ?? null)
  const user = ref<AuthUser | null>(saved?.user ?? null)

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const role = computed<UserRole | null>(() => user.value?.role ?? null)

  /**
   * "Keep me signed in" ticked  -> localStorage   (survives closing the browser)
   * "Keep me signed in" cleared -> sessionStorage (ends when the tab closes)
   */
  async function login(credentials: {
    username: string
    password: string
    remember: boolean
  }): Promise<AuthUser> {
    await new Promise((resolve) => setTimeout(resolve, 400)) // pretend network delay

    const username = credentials.username.trim().toLowerCase()
    const account = DEMO_ACCOUNTS.find(
      (a) => a.username === username && a.password === credentials.password,
    )
    if (!account) throw new Error('Wrong username or password. Check both and try again.')

    const profile: AuthUser = { username: account.username, name: account.name, role: account.role }
    const session: Session = { token: `demo-token-${account.role}`, user: profile }

    clearSession()
    const storage = credentials.remember ? localStorage : sessionStorage
    storage.setItem(STORAGE_KEY, JSON.stringify(session))

    token.value = session.token
    user.value = profile
    return profile
  }

  function logout() {
    clearSession()
    token.value = null
    user.value = null
  }

  return { token, user, isLoggedIn, role, login, logout }
})
