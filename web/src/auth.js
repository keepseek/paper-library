import { reactive } from 'vue'
import { api, getToken, setToken } from './api.js'

export const auth = reactive({
  user: null,
  loaded: false
})

export async function loadAuth() {
  if (!getToken()) {
    auth.loaded = true
    return
  }
  try {
    const { user } = await api('/auth/me')
    auth.user = user
  } catch {
    setToken(null)
  }
  auth.loaded = true
}

export function logout() {
  setToken(null)
  auth.user = null
}
