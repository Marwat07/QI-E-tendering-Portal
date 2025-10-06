import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthenticatedUserRedirect } from '../utils/roleBasedRouting';

/**
 * Custom hook to handle redirecting authenticated users away from auth pages
 * @param {boolean} shouldRedirect - Whether to perform the redirect check (default: true)
 */
export const useAuthRedirect = (shouldRedirect = true) => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const from = location.state?.from?.pathname || '/';
  const currentPath = location.pathname;
  
  useEffect(() => {
    if (shouldRedirect && isAuthenticated && user) {
      // Only redirect if user is on an auth page
      const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
      
      if (authPages.includes(currentPath)) {
        const redirectPath = getAuthenticatedUserRedirect(user, from, currentPath);
        
        console.log(`User already authenticated as ${user.role}, redirecting from ${currentPath} to: ${redirectPath}`);
        navigate(redirectPath, { replace: true });
      }
    }
  }, [shouldRedirect, isAuthenticated, user, navigate, from, currentPath]);
  
  return {
    isAuthenticated,
    user,
    isRedirecting: shouldRedirect && isAuthenticated && user
  };
};
