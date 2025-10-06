/**
 * Get the appropriate dashboard route based strictly on user role
 * @param {string} userRole - The role of the user ('vendor', 'supplier', 'buyer', 'admin')
 * @returns {string} - The route path for the user's dashboard
 */
export const getRoleBasedDashboard = (userRole) => {
  console.log('🔍 getRoleBasedDashboard - Role:', userRole);

  switch (userRole) {
    case 'admin':
      console.log('✅ Admin role detected, redirecting to /admin');
      return '/admin';
    case 'vendor':
    case 'supplier':
      console.log('✅ Vendor/supplier role detected, redirecting to /bidder-dashboard');
      return '/bidder-dashboard';
    case 'buyer':
      console.log('✅ Buyer role detected, redirecting to /tenders/manage');
      return '/tenders/manage';
    default:
      console.log('⚠️ Unknown role, falling back to home page');
      return '/';
  }
};

/**
 * Get the appropriate redirect path for authenticated users
 * @param {Object} user - The user object containing role information
 * @param {string} intendedPath - The path user was trying to access (from state)
 * @param {string} currentPath - The current path (to avoid redirecting from same page)
 * @returns {string} - The appropriate redirect path
 */
export const getAuthenticatedUserRedirect = (user, intendedPath = '/', currentPath = '/') => {
  console.log('🔄 getAuthenticatedUserRedirect - User:', user, 'Intended:', intendedPath, 'Current:', currentPath);

  if (!user) {
    console.log('❌ No user provided, redirecting to home');
    return '/';
  }

  // Role-based dashboard detection using role only
  const dashboardPath = getRoleBasedDashboard(user.role);
  console.log('📍 Calculated dashboard path:', dashboardPath);

  // If user came from a specific page (not auth pages), respect that
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];

  if (intendedPath && intendedPath !== '/' && !authPages.includes(intendedPath)) {
    console.log('🎯 Redirecting to intended path:', intendedPath);
    return intendedPath;
  }

  // For users logging in directly from login page, go to their role-based dashboard
  if (currentPath === '/login' || authPages.includes(currentPath)) {
    console.log(`🔀 Login redirect: ${user.email} (${user.role}) -> ${dashboardPath}`);
    return dashboardPath;
  }

  // If they were trying to access home page specifically, let them
  if (intendedPath === '/') {
    console.log('🏠 User wants home page, allowing');
    return '/';
  }

  console.log('📍 Final redirect to dashboard:', dashboardPath);
  return dashboardPath;
};
