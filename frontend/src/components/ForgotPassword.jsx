import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authService } from '../services/auth';
import './Login.css'; // Reusing login styles

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { value } = e.target;
    setEmail(value);
    
    if (errors.email) {
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email is invalid';
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

    try {
      await authService.forgotPassword({ email: email.trim() });
      
      toast.success('Password reset instructions have been sent to your email!', {
        position: 'top-right',
        autoClose: 5000,
      });
      
      setIsSubmitted(true);
      
    } catch (err) {
      console.error('Forgot password failed:', err);
      
      if (err.response) {
        const { status, data } = err.response;
        
        switch (status) {
          case 404:
            setErrors({ email: 'No account found with this email address.' });
            break;
          case 429:
            toast.error('Too many requests. Please try again later.');
            break;
          default:
            toast.error(data.message || 'Failed to send reset instructions. Please try again.');
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

  if (isSubmitted) {
    return (
      <div className="login-container">
        <div className="login-form">
          <h2>Check Your Email</h2>
          <div className="success-message">
            <p>Password reset instructions have been sent to <strong>{email}</strong></p>
            <p>Please check your email and follow the instructions to reset your password.</p>
            <p>The reset link will expire in 1 hour.</p>
          </div>
          <div className="form-links">
            <p>
              Didn't receive the email? <button 
                onClick={() => setIsSubmitted(false)} 
                className="link-button"
                type="button"
              >
                Try again
              </button>
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
        <h2>Forgot Password</h2>
        <p className="form-description">
          Enter your email address and we'll send you instructions to reset your password.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input 
              type="email" 
              name="email"
              placeholder="Email Address" 
              value={email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              required 
              disabled={loading}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          
          <button type="submit" disabled={loading} className="login-button">
            {loading ? (
              <span className="button-loader">
                <span className="loader-dot"></span>
                <span className="loader-dot"></span>
                <span className="loader-dot"></span>
              </span>
            ) : 'Send Reset Instructions'}
          </button>
        </form>
        
        <div className="form-links">
          <p>
            Remember your password? <Link to="/login" className="link-highlight">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
