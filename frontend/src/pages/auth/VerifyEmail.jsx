// src/pages/auth/VerifyEmail.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AuthService } from '../../utils/auth'
import toast from 'react-hot-toast'

export default function VerifyEmail() {
    const [loading, setLoading] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [verified, setVerified] = useState(false)
    const [error, setError] = useState('')
    const [email, setEmail] = useState('')

    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()
    const token = searchParams.get('token')

    useEffect(() => {
        // Get email from state or auth service
        if (location.state?.email) {
            setEmail(location.state.email)
        }
    }, [location])

    useEffect(() => {
        // Auto-verify if token is present in URL
        if (token && !verifying && !verified) {
            verifyEmailWithToken(token)
        }
    }, [token])

    const verifyEmailWithToken = async (verificationToken) => {
        setVerifying(true)
        setError('')

        try {
            const response = await AuthService.verifyEmail({
                token: verificationToken
            })

            if (!response.success) {
                throw new Error(response.error?.message || 'Verification failed')
            }

            setVerified(true)
            toast.success('Email verified successfully!')

            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
                navigate('/login', {
                    state: { message: 'Your email has been verified. Please login to continue.' }
                })
            }, 3000)
        } catch (err) {
            console.error('Verification error:', err)
            setError(err.message || 'Failed to verify email. The link may have expired.')
        } finally {
            setVerifying(false)
        }
    }

    const resendVerification = async () => {
        if (!email) {
            toast.error('Please login to resend verification email')
            navigate('/login')
            return
        }

        setLoading(true)
        setError('')

        try {
            const response = await AuthService.resendVerificationEmail({
                email
            })

            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to resend email')
            }

            toast.success('Verification email sent!')
        } catch (err) {
            console.error('Resend error:', err)
            setError(err.message || 'Failed to resend verification email')
        } finally {
            setLoading(false)
        }
    }

    if (verifying) {
        return (
            <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gray-950/50 backdrop-blur-xl border border-gray-900/50 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10"
                    >
                        <div className="text-center">
                            <svg className="animate-spin mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <h2 className="mt-4 text-xl font-semibold text-white">Verifying your email...</h2>
                            <p className="mt-2 text-sm text-gray-400">Please wait while we verify your email address</p>
                        </div>
                    </motion.div>
                </div>
            </div>
        )
    }

    if (verified) {
        return (
            <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-gray-950/50 backdrop-blur-xl border border-gray-900/50 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10"
                    >
                        <div className="text-center">
                            <svg
                                className="mx-auto h-12 w-12 text-green-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <h2 className="mt-4 text-xl font-semibold text-white">Email verified!</h2>
                            <p className="mt-2 text-sm text-gray-400">
                                Your email has been verified successfully. Redirecting to login...
                            </p>
                            <div className="mt-6">
                                <Link
                                    to="/login"
                                    className="text-primary hover:text-primary-light"
                                >
                                    Go to login →
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute left-1/3 top-1/4 -translate-x-1/2 -translate-y-1/2">
                    <div className="h-[400px] w-[400px] rounded-full bg-primary/10 blur-[128px]" />
                </div>
            </div>

            <div className="relative sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <Link to="/" className="inline-flex items-center gap-2 group">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-lg group-hover:blur-xl transition-all duration-300" />
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-light shadow-lg">
                                <svg
                                    className="h-5 w-5 text-white"
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
                        <span className="text-xl font-semibold text-white">Savlink</span>
                    </Link>

                    <h2 className="mt-6 text-3xl font-semibold text-white">
                        Verify your email
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        {email ? `Check your inbox at ${email}` : 'Check your email for verification link'}
                    </p>
                </motion.div>

                {/* Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mt-8"
                >
                    <div className="bg-gray-950/50 backdrop-blur-xl border border-gray-900/50 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary/20">
                                <svg
                                    className="h-6 w-6 text-primary"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                            <h3 className="mt-4 text-lg font-medium text-white">Check your email</h3>
                            <p className="mt-2 text-sm text-gray-400">
                                We've sent you an email with a verification link.
                                Click the link in the email to verify your account.
                            </p>
                            <p className="mt-4 text-xs text-gray-500">
                                Can't find the email? Check your spam folder.
                            </p>
                        </div>

                        <div className="mt-6">
                            <button
                                onClick={resendVerification}
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-900/50 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-gray-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : null}
                                {loading ? 'Sending...' : 'Resend verification email'}
                            </button>
                        </div>

                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="text-sm text-primary hover:text-primary-light"
                            >
                                Back to sign in
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}