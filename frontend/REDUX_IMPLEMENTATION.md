# Redux Implementation Guide

## Overview

This project now includes a comprehensive Redux state management setup using Redux Toolkit (RTK). The implementation provides centralized state management for authentication, tenders, bids, and UI state.

## Structure

```
src/
├── store/
│   ├── store.js              # Main store configuration
│   ├── hooks.js              # Typed hooks for Redux
│   └── slices/
│       ├── authSlice.js      # Authentication state
│       ├── tenderSlice.js    # Tender management
│       ├── bidSlice.js       # Bid management
│       └── uiSlice.js        # UI state management
└── components/
    ├── LoginRedux.jsx        # Redux-based login component
    ├── ActiveTendersRedux.jsx # Redux-based tender listing
    └── ProtectedRouteRedux.jsx # Redux-based route protection
```

## Key Features

### 1. Authentication Management
- User login/logout
- Registration
- Profile management
- Persistent authentication state
- Password changes

### 2. Tender Management
- Fetch active tenders
- Create/update/delete tenders
- Search and filtering
- Tender categorization
- Pagination support

### 3. Bid Management
- Submit/update/delete bids
- View tender bids (admin/buyer)
- Bid eligibility checking
- Bid statistics
- Award/reject bids

### 4. UI State Management
- Theme management
- Modal state
- Notifications/toasts
- Loading states
- User preferences

## Usage Examples

### Using Redux in Components

```jsx
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, selectAuthLoading, selectAuthError } from '../store/slices/authSlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);

  const handleLogin = async (credentials) => {
    try {
      await dispatch(loginUser(credentials)).unwrap();
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    // Your component JSX
  );
};
```

### Dispatching Actions

```jsx
// Authentication
dispatch(loginUser(credentials));
dispatch(registerUser(userData));
dispatch(logout());
dispatch(checkAuthStatus());

// Tenders
dispatch(fetchActiveTenders());
dispatch(fetchTenderById(id));
dispatch(createTender(tenderData));
dispatch(updateTender({ id, tenderData }));
dispatch(deleteTender(id));

// Bids
dispatch(submitBid(bidData));
dispatch(fetchMyBids());
dispatch(fetchTenderBids(tenderId));

// UI
dispatch(showSuccessNotification('Operation successful!'));
dispatch(openModal({ modalName: 'loginModal', data: {} }));
dispatch(setTheme('dark'));
```

### Selecting State

```jsx
// Authentication
const user = useAppSelector(selectUser);
const isAuthenticated = useAppSelector(selectIsAuthenticated);
const authLoading = useAppSelector(selectAuthLoading);

// Tenders
const activeTenders = useAppSelector(selectActiveTenders);
const currentTender = useAppSelector(selectCurrentTender);
const tendersLoading = useAppSelector(selectTendersLoading);

// Bids
const myBids = useAppSelector(selectMyBids);
const tenderBids = useAppSelector(selectTenderBids(tenderId));

// UI
const theme = useAppSelector(selectTheme);
const notifications = useAppSelector(selectNotifications);
```

## Migration from Context API

The project previously used React Context for authentication. The Redux implementation provides:

1. **Better Performance**: Redux prevents unnecessary re-renders
2. **DevTools**: Enhanced debugging with Redux DevTools
3. **Predictable State**: Clear state updates through reducers
4. **Scalability**: Easy to add new features and state slices
5. **Testing**: Easier to test individual pieces of state logic

## Switching to Redux

To switch from the Context API to Redux implementation:

1. Update `main.jsx` to use the Redux Provider (already done)
2. Replace component imports:
   - Use `LoginRedux` instead of `Login`
   - Use `ActiveTendersRedux` instead of `ActiveTenders`
   - Use `ProtectedRouteRedux` instead of `ProtectedRoute`
3. Update `App.jsx` to use `AppWithRedux.jsx`

## Best Practices

1. **Use Typed Hooks**: Always use `useAppDispatch` and `useAppSelector`
2. **Handle Async Actions**: Use `.unwrap()` for error handling
3. **Select Specific State**: Select only the state you need
4. **Clear Errors**: Clear error state when appropriate
5. **Loading States**: Show appropriate loading indicators
6. **Notifications**: Use UI slice for user feedback

## Development Tools

Install Redux DevTools browser extension for enhanced debugging:
- Chrome: Redux DevTools
- Firefox: Redux DevTools

The store is configured to work with DevTools in development mode.

## API Integration

All Redux async thunks integrate with existing service files:
- `authService` for authentication
- `tenderService` for tender operations
- `bidService` for bid operations

No changes are needed to the existing API layer.

## Testing

Redux state management can be tested independently:

```javascript
import { store } from '../store/store';
import { loginUser } from '../store/slices/authSlice';

// Test actions
const result = await store.dispatch(loginUser(credentials));

// Test selectors
const state = store.getState();
const user = selectUser(state);
```

This Redux implementation provides a robust, scalable foundation for state management in the E-Tendering Portal.
