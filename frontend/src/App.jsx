// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Eager load the home page
import Home from './pages/public/Home';
import VerifyEmail from './pages/auth/VerifyEmail';

// Lazy load other pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));
const NotFound = lazy(() => import('./pages/public/NotFound'));

// Enhanced Loading component
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-gray-800 border-t-primary animate-spin" />
        </div>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

// Error Boundary for better error handling
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Router Error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold mb-4">Oops! Something went wrong</h2>
            <p className="text-gray-400 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => window.location.href = '/'}
                className="btn-primary"
              >
                Go Home
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn-secondary"
              >
                Reload Page
              </button>
            </div>
            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-gray-900 p-4 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Handle redirect from 404.html
function RedirectHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Handle redirect from 404.html
    const params = new URLSearchParams(location.search);
    const redirectPath = params.get('redirect');

    if (redirectPath && redirectPath !== location.pathname) {
      navigate(redirectPath, { replace: true });
    }
  }, [location, navigate]);

  return null;
}

// Component to handle hash routing fallback and scroll restoration
function RouterEnhancements() {
  const location = useLocation();

  useEffect(() => {
    // Handle hash routing fallback for Vercel 404s
    if (window.location.hash && window.location.hash.length > 1) {
      const path = window.location.hash.substring(1);
      window.history.replaceState(null, '', path);
    }
  }, []);

  useEffect(() => {
    // Scroll to top on route change (except for hash links)
    if (!location.hash) {
      window.scrollTo(0, 0);
    }
  }, [location.pathname]);

  // Log route changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Route changed to:', location.pathname);
    }
  }, [location]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <RedirectHandler />
        <RouterEnhancements />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />

            {/* Auth callback route for OAuth flows */}
            <Route path="/auth/callback" element={<Login />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Common Redirects for better UX */}
            <Route path="/signin" element={<Navigate to="/login" replace />} />
            <Route path="/signup" element={<Navigate to="/register" replace />} />
            <Route path="/sign-in" element={<Navigate to="/login" replace />} />
            <Route path="/sign-up" element={<Navigate to="/register" replace />} />
            <Route path="/app" element={<Navigate to="/dashboard" replace />} />
            <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />
            <Route path="/home" element={<Navigate to="/" replace />} />

            {/* Catch all 404 - Must be last */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AuthProvider>
  );
}