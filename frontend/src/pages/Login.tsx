import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../ThemeContext';

const API_BASE_URL = 'http://localhost:8000/api';

interface LoginForm {
  email: string;
  password: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', form.email);
      formData.append('password', form.password);

      const response = await fetch(`${API_BASE_URL}/user/login`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        setServerError(error.detail || 'Login failed. Please try again.');
        return;
      }

      const data = await response.json();
      localStorage.setItem('ll_token', data.access_token);
      
      // Fetch user profile
      const profileResponse = await fetch(`${API_BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        localStorage.setItem('ll_user_profile', JSON.stringify(profile));
      }

      navigate('/dashboard', { replace: true });
    } catch (error) {
      setServerError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 transition-colors duration-200 ${
      theme === 'light_high' ? 'bg-primary' : 'bg-primary'
    }`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`w-full max-w-md rounded-2xl border p-8 space-y-6 ${
          theme === 'light_high'
            ? 'bg-secondary border-neutral-200'
            : 'bg-secondary border-white/10'
        }`}
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-accent">
              <Sparkles className="w-6 h-6 text-accent-contrast" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-primary uppercase tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-secondary">
            Log in to continue your learning journey
          </p>
        </div>

        {serverError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{serverError}</p>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-widest text-primary">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                errors.email
                  ? 'bg-red-500/10 border border-red-500/30 text-primary placeholder:text-red-400'
                  : theme === 'light_high'
                  ? 'bg-tertiary border border-neutral-300 text-primary placeholder:text-secondary'
                  : 'bg-tertiary border border-white/10 text-primary placeholder:text-secondary'
              }`}
            />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black uppercase tracking-widest text-primary">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs font-semibold text-accent hover:underline transition-all"
              >
                Forgot?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors pr-12 ${
                  errors.password
                    ? 'bg-red-500/10 border border-red-500/30 text-primary placeholder:text-red-400'
                    : theme === 'light_high'
                    ? 'bg-tertiary border border-neutral-300 text-primary placeholder:text-secondary'
                    : 'bg-tertiary border border-white/10 text-primary placeholder:text-secondary'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-lg font-black text-sm uppercase tracking-tight bg-accent text-accent-contrast hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        {/* Signup Link */}
        <p className="text-center text-sm text-secondary">
          Don't have an account?{' '}
          <button
            onClick={() => navigate('/signup')}
            className="font-semibold text-accent hover:underline transition-all"
          >
            Sign Up
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
