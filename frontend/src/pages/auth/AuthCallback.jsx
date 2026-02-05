// src/pages/auth/AuthCallback.jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuthService } from '../../utils/auth'

export default function AuthCallback() {
    const navigate = useNavigate()

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                // Wait a moment for Supabase to process the OAuth callback
                await new Promise(resolve => setTimeout(resolve, 1000))

                const { session } = await AuthService.getSession()

                if (session) {
                    // Verify with backend (auto-provision user)
                    await AuthService.verifyWithBackend()

                    // Redirect to dashboard
                    navigate('/dashboard', { replace: true })
                } else {
                    // No session, redirect to login with error
                    navigate('/login?error=oauth_failed', { replace: true })
                }
            } catch (error) {
                console.error('OAuth callback error:', error)
                navigate('/login?error=oauth_failed', { replace: true })
            }
        }

        handleOAuthCallback()
    }, [navigate])

    return (
        <div className="min-h-screen bg-black flex flex-col justify-center items-center">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-[400px] w-[400px] rounded-full bg-primary/10 blur-[128px]" />
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative text-center"
            >
                <div className="mb-8">
                    <div className="relative">
                        <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg" />
                        <div className="relative flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light shadow-lg mx-auto">
                            <svg
                                className="h-8 w-8 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                <h2 className="text-2xl font-semibold text-white mb-4">
                    Completing sign in...
                </h2>

                <div className="flex items-center justify-center">
                    <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </motion.div>
        </div>
    )
}