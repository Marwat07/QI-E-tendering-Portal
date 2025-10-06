import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { getAuthenticatedUserRedirect } from '../utils/roleBasedRouting';
import { useAuthRedirect } from '../hooks/useAuthRedirect';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '', // This can be either email or username
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  
  const { login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';
  
  // Use custom hook to handle authenticated user redirects
  const { isRedirecting } = useAuthRedirect();

  useEffect(() => {
    clearError();
    setApiError('');
  }, [clearError]);

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
    
    if (apiError) {
      setApiError('');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email or Username is required';
    }
    // Remove email format validation since it can be username
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setApiError('');

    try {
      const loginData = {
        email: formData.email.trim(),
        password: formData.password
      };

      const userData = await login(loginData);
      
      toast.success('Login successful! Welcome back.', {
        position: 'top-right',
        autoClose: 3000,
      });

      // Enhanced role-based redirect after successful login
      console.log('Login successful - User data:', userData.user);
      console.log('User role:', userData.user?.role, 'Email:', userData.user?.email);
      
      // Use role-based routing to determine where to redirect
      const redirectPath = getAuthenticatedUserRedirect(userData.user, from, '/login');
      
      console.log('Final redirect path:', redirectPath);
      navigate(redirectPath, { replace: true });

    } catch (err) {
      console.error('Login failed:', err);
      
      if (err.response) {
        const { status, data } = err.response;
        
        switch (status) {
          case 400:
            setApiError(data.message || 'Invalid login credentials.');
            break;
          case 401:
            setApiError('Invalid email or password.');
            break;
          case 403:
            if (data.message?.includes('deactivated')) {
              setApiError('Your account has been deactivated. Please contact support.');
            } else {
              setApiError('Account is not verified or has been suspended.');
            }
            break;
          case 404:
            setApiError('User not found. Please check your email.');
            break;
          case 422:
            if (data.errors) {
              const serverErrors = {};
              data.errors.forEach(error => {
                serverErrors[error.field] = error.message;
              });
              setErrors(prev => ({ ...prev, ...serverErrors }));
            } else {
              setApiError(data.message || 'Validation failed.');
            }
            break;
          case 429:
            setApiError('Too many login attempts. Please try again later.');
            break;
          default:
            setApiError(data.message || 'Login failed. Please try again.');
        }
      } else if (err.request) {
        setApiError('Network error. Please check your connection.');
      } else {
        setApiError('An unexpected error occurred.');
      }
      
      toast.error(apiError || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while redirecting authenticated users
  if (isRedirecting) {
    return (
      <div className="login-container">
        <div className="login-form">
          <div className="redirect-loading">
            <div className="button-loader">
              <span className="loader-dot"></span>
              <span className="loader-dot"></span>
              <span className="loader-dot"></span>
            </div>
            <p>Redirecting you to your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Login to E-Tendering Portal</h2>
        
        <div className="form-description">
          Enter your email address or username along with your password to access your account.
          <br />
          <small style={{color: '#999', fontSize: '13px'}}>New users will receive login credentials via email after account creation.</small>
        </div>
        
        {(apiError || authError) && (
          <div className="error-message">
            {apiError || authError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input 
              type="text" 
              name="email"
              placeholder="Email or Username" 
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              required 
              disabled={loading}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          
          <div className="form-group">
            <div className="password-field-wrapper">
              <input 
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password" 
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'error' : ''}
                required 
                disabled={loading}
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
          
          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <span className="button-loader">
                <span className="loader-dot"></span>
                <span className="loader-dot"></span>
                <span className="loader-dot"></span>
              </span>
            ) : 'Login'}
          </button>
        </form>
        
        <div className="form-links">
          {/* <p>
            Don't have an account? <Link to="/register" className="link-highlight">Register Here</Link>
          </p> */}
          <p>
            <Link to="/forgot-password" className="link-highlight">Forgot Password?</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;