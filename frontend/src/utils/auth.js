// src/utils/auth.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
)

export class AuthService {

    // EMAIL/PASSWORD REGISTRATION
    static async register(email, password, userData = {}) {
        try {
            const { data, error } = await supabase.auth.signUp({
                email: email.toLowerCase().trim(),
                password,
                options: {
                    data: {
                        name: userData.name,
                    }
                }
            })

            if (error) throw error

            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    // EMAIL/PASSWORD LOGIN
    static async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email.toLowerCase().trim(),
                password
            })

            if (error) throw error

            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    // GOOGLE OAUTH LOGIN
    static async loginWithGoogle() {
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            })

            if (error) throw error

            return { data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    // LOGOUT
    static async logout() {
        try {
            const { error } = await supabase.auth.signOut()

            if (typeof window !== 'undefined') {
                localStorage.removeItem('user-preferences')
                sessionStorage.clear()
            }

            return { error }
        } catch (error) {
            return { error }
        }
    }

    // PASSWORD RESET
    static async resetPassword(email) {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(
                email.toLowerCase().trim(),
                {
                    redirectTo: `${window.location.origin}/reset-password`
                }
            )

            return { error }
        } catch (error) {
            return { error }
        }
    }

    // GET CURRENT SESSION
    static async getSession() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession()
            return { session, error }
        } catch (error) {
            return { session: null, error }
        }
    }

    // GET CURRENT USER
    static async getUser() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser()
            return { user, error }
        } catch (error) {
            return { user: null, error }
        }
    }

    // GET TOKEN FOR BACKEND REQUESTS
    static async getToken() {
        const { session } = await this.getSession()
        return session?.access_token
    }

    // VERIFY TOKEN WITH BACKEND (triggers auto-provisioning)
    static async verifyWithBackend() {
        try {
            const token = await this.getToken()
            if (!token) throw new Error('No authentication token')

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!response.ok) {
                throw new Error('Backend verification failed')
            }

            const data = await response.json()
            return { data: data.data, error: null }
        } catch (error) {
            return { data: null, error }
        }
    }

    // LISTEN FOR AUTH STATE CHANGES
    static onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email)

            if (session?.user) {
                const { error } = await this.verifyWithBackend()
                if (error) {
                    console.error('Backend verification failed:', error)
                }
            }

            callback(event, session)
        })
    }
}

// API CLIENT FOR BACKEND REQUESTS
export class ApiClient {
    static async request(endpoint, options = {}) {
        const token = await AuthService.getToken()

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, config)

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/login'
                return
            }
            throw new Error(`API Error: ${response.status}`)
        }

        return response.json()
    }

    static async get(endpoint) {
        return this.request(endpoint, { method: 'GET' })
    }

    static async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    }
}