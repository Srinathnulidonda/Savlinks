// src/utils/auth.js
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged
} from 'firebase/auth'
import { app } from '../config/firebase'
import axios from 'axios'

const auth = getAuth(app)
const googleProvider = new GoogleAuthProvider()

// Configure axios defaults
const API_BASE_URL = import.meta.env.VITE_API_URL
axios.defaults.baseURL = API_BASE_URL

// Auth state management
let currentUser = null
let authStateListeners = []

// Listen to auth state changes
onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
        try {
            // Get fresh ID token
            const token = await firebaseUser.getIdToken()
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

            // Get user data from backend
            const response = await axios.get('/auth/me')
            currentUser = {
                ...response.data.data,
                firebaseUser
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
            currentUser = null
        }
    } else {
        currentUser = null
        delete axios.defaults.headers.common['Authorization']
    }

    // Notify listeners
    authStateListeners.forEach(listener => listener(currentUser))
})

export const AuthService = {
    // Firebase Auth Methods
    async register({ email, password, name }) {
        try {
            // Create Firebase user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Update display name
            if (name) {
                await updateProfile(user, { displayName: name })
            }

            // Send email verification
            await sendEmailVerification(user)

            // Get ID token
            const token = await user.getIdToken()

            // The backend will auto-provision the user when we make the first authenticated request
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

            return {
                success: true,
                data: {
                    user: {
                        uid: user.uid,
                        email: user.email,
                        name: user.displayName,
                        email_verified: user.emailVerified
                    },
                    token
                }
            }
        } catch (error) {
            console.error('Registration error:', error)
            return {
                success: false,
                error: {
                    code: error.code,
                    message: this.getErrorMessage(error.code)
                }
            }
        }
    },

    async login({ email, password }) {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user

            // Get ID token
            const token = await user.getIdToken()
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

            // Get user data from backend (this will auto-provision if needed)
            const response = await axios.get('/auth/me')

            return {
                success: true,
                data: {
                    user: response.data.data,
                    token
                },
                message: 'Welcome back!'
            }
        } catch (error) {
            console.error('Login error:', error)
            return {
                success: false,
                error: {
                    code: error.code,
                    message: this.getErrorMessage(error.code)
                }
            }
        }
    },

    async loginWithGoogle() {
        try {
            const userCredential = await signInWithPopup(auth, googleProvider)
            const user = userCredential.user

            // Get ID token
            const token = await user.getIdToken()
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

            // Get user data from backend (this will auto-provision if needed)
            const response = await axios.get('/auth/me')

            return {
                success: true,
                data: {
                    user: response.data.data,
                    token
                },
                message: 'Welcome!'
            }
        } catch (error) {
            console.error('Google login error:', error)
            return {
                success: false,
                error: {
                    code: error.code,
                    message: this.getErrorMessage(error.code)
                }
            }
        }
    },

    async logout() {
        try {
            await signOut(auth)
            delete axios.defaults.headers.common['Authorization']
            currentUser = null
            return { success: true }
        } catch (error) {
            console.error('Logout error:', error)
            return {
                success: false,
                error: { message: 'Failed to sign out' }
            }
        }
    },

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email)
            return {
                success: true,
                message: 'Password reset email sent'
            }
        } catch (error) {
            return {
                success: false,
                error: {
                    code: error.code,
                    message: this.getErrorMessage(error.code)
                }
            }
        }
    },

    async resendVerificationEmail() {
        try {
            const user = auth.currentUser
            if (!user) {
                throw new Error('No user logged in')
            }

            await sendEmailVerification(user)
            return {
                success: true,
                message: 'Verification email sent'
            }
        } catch (error) {
            return {
                success: false,
                error: { message: 'Failed to send verification email' }
            }
        }
    },

    // Emergency Access Methods
    async requestEmergencyAccess(email) {
        try {
            const response = await axios.post('/auth/emergency/request', { email })
            return {
                success: true,
                message: response.data.message
            }
        } catch (error) {
            return {
                success: false,
                error: { message: 'Failed to request emergency access' }
            }
        }
    },

    async verifyEmergencyToken(email, token) {
        try {
            const response = await axios.post('/auth/emergency/verify', { email, token })

            if (response.data.data?.token) {
                // Store emergency token
                localStorage.setItem('emergency_token', response.data.data.token)
                axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`

                // Get user data
                const userResponse = await axios.get('/auth/me')
                currentUser = userResponse.data.data

                return {
                    success: true,
                    data: response.data.data
                }
            }

            return { success: false }
        } catch (error) {
            return {
                success: false,
                error: { message: 'Invalid or expired token' }
            }
        }
    },

    // Helper Methods
    isAuthenticated() {
        return !!auth.currentUser || !!localStorage.getItem('emergency_token')
    },

    getCurrentUser() {
        return currentUser
    },

    getFirebaseUser() {
        return auth.currentUser
    },

    async getIdToken() {
        try {
            if (auth.currentUser) {
                return await auth.currentUser.getIdToken()
            }
            return localStorage.getItem('emergency_token')
        } catch (error) {
            return null
        }
    },

    onAuthStateChange(callback) {
        authStateListeners.push(callback)
        // Return unsubscribe function
        return () => {
            authStateListeners = authStateListeners.filter(listener => listener !== callback)
        }
    },

    getErrorMessage(code) {
        const errorMessages = {
            'auth/email-already-in-use': 'This email is already registered',
            'auth/invalid-email': 'Invalid email address',
            'auth/operation-not-allowed': 'Operation not allowed',
            'auth/weak-password': 'Password is too weak',
            'auth/user-disabled': 'This account has been disabled',
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/invalid-credential': 'Invalid email or password',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Please check your connection',
            'auth/popup-closed-by-user': 'Sign-in was cancelled',
            'auth/cancelled-popup-request': 'Another sign-in is in progress',
            'auth/account-exists-with-different-credential': 'Account already exists with different sign-in method'
        }

        return errorMessages[code] || 'An error occurred. Please try again'
    }
}