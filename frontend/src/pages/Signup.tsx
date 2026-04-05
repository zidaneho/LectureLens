import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Check, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../ThemeContext';

const API_BASE_URL = 'http://localhost:8000/api';

interface SignupForm {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [form, setForm] = useState<SignupForm>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!form.password) {
      newErrors.password = 'Password is required';
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (form.fullName.trim().length < 2) {
      newErrors.fullName = 'Please enter your full name';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.fullName,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setServerError(error.detail || 'Signup failed. Please try again.');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
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
            Create Account
          </h1>
          <p className="text-sm text-secondary">
            Join LectureLens and transform your learning
          </p>
        </div>

        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3"
          >
            <Check className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-semibold text-green-600">Success!</p>
              <p className="text-xs text-green-500/70">Redirecting to login...</p>
            </div>
          </motion.div>
        )}

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

        {!success && (
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-primary">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                  errors.fullName
                    ? 'bg-red-500/10 border border-red-500/30 text-primary placeholder:text-red-400'
                    : theme === 'light_high'
                    ? 'bg-tertiary border border-neutral-300 text-primary placeholder:text-secondary'
                    : 'bg-tertiary border border-white/10 text-primary placeholder:text-secondary'
                }`}
              />
              {errors.fullName && (
                <p className="text-xs text-red-500">{errors.fullName}</p>
              )}
            </div>

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
              <label className="block text-xs font-black uppercase tracking-widest text-primary">
                Password
              </label>
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
              <p className="text-xs text-secondary">
                At least 8 characters, with uppercase, lowercase, and number
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-widest text-primary">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 rounded-lg font-medium text-sm transition-colors pr-12 ${
                    errors.confirmPassword
                      ? 'bg-red-500/10 border border-red-500/30 text-primary placeholder:text-red-400'
                      : theme === 'light_high'
                      ? 'bg-tertiary border border-neutral-300 text-primary placeholder:text-secondary'
                      : 'bg-tertiary border border-white/10 text-primary placeholder:text-secondary'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-black text-sm uppercase tracking-tight bg-accent text-accent-contrast hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Login Link */}
        {!success && (
          <p className="text-center text-sm text-secondary">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-semibold text-accent hover:underline transition-all"
            >
              Log In
            </button>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default Signup;
