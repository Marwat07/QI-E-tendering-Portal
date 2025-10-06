import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { authService } from '../services/auth';
import './Login.css'; // Reusing login styles

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [tokenError, setTokenError] = useState('');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setTokenError('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Invalid reset token. Please request a new password reset.');
      return;
    }
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword({
        token,
        password: formData.password,
        confirm_password: formData.confirmPassword
      });
      
      toast.success('Password has been successfully reset! You can now log in with your new password.', {
        position: 'top-right',
        autoClose: 5000,
      });
      
      // Redirect to login page after successful reset
      navigate('/login', { replace: true });
      
    } catch (err) {
      console.error('Reset password failed:', err);
      
      if (err.response) {
        const { status, data } = err.response;
        
        switch (status) {
          case 400:
            if (data.message?.includes('expired')) {
              setTokenError('Reset token has expired. Please request a new password reset.');
            } else if (data.message?.includes('invalid')) {
              setTokenError('Invalid reset token. Please request a new password reset.');
            } else {
              toast.error(data.message || 'Invalid request.');
            }
            break;
          case 404:
            setTokenError('Reset token not found. Please request a new password reset.');
            break;
          case 422:
            if (data.errors) {
              const serverErrors = {};
              data.errors.forEach(error => {
                serverErrors[error.field] = error.message;
              });
              setErrors(prev => ({ ...prev, ...serverErrors }));
            } else {
              toast.error(data.message || 'Validation failed.');
            }
            break;
          case 429:
            toast.error('Too many requests. Please try again later.');
            break;
          default:
            toast.error(data.message || 'Failed to reset password. Please try again.');
        }
      } else if (err.request) {
        toast.error('Network error. Please check your connection.');
      } else {
        toast.error('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>Invalid Reset Link</h2>
          <div className="error-message">
            {tokenError}
          </div>
          <div className="form-links">
            <p>
              <Link to="/forgot-password" className="link-highlight">Request New Password Reset</Link>
            </p>
            <p>
              <Link to="/login" className="link-highlight">Back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Reset Password</h2>
        <p className="form-description">
          Enter your new password below.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div className="password-field-wrapper">
              <input 
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="New Password" 
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                required 
                disabled={loading}
                minLength="6"
              />
              <span 
                className="password-toggle-icon"
                onClick={togglePasswordVisibility}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    togglePasswordVisibility();
                  }
                }}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <div className="password-field-wrapper">
              <input 
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm New Password" 
                value={formData.confirmPassword}
                onChange={handleChange}
                className={errors.confirmPassword ? 'error' : ''}
                required 
                disabled={loading}
                minLength="6"
              />
              <span 
                className="password-toggle-icon"
                onClick={toggleConfirmPasswordVisibility}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    toggleConfirmPasswordVisibility();
                  }
                }}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>
          
          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <span className="button-loader">
                <span className="loader-dot"></span>
                <span className="loader-dot"></span>
                <span className="loader-dot"></span>
              </span>
            ) : 'Reset Password'}
          </button>
        </form>
        
        <div className="form-links">
          <p>
            <Link to="/login" className="link-highlight">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
