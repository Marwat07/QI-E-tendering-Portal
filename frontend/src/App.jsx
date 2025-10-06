import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import HomePageHandler from './components/HomePageHandler';
import Footer from './components/Footer';
import Login from './components/Login';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import ActiveTendersTable from './components/ActiveTendersTable';
import TenderForm from './components/TenderForm';
import TenderList from './components/TenderList';
import TenderDetails from './components/TenderDetails';
import TenderBids from './components/TenderBids';
import BidderDashboard from './components/BidderDashboard';
import MyBids from './components/MyBids';
import SubmitBid from './components/SubmitBid';
import AdminDashboard from './components/AdminDashboard';
import ProfileSettings from './components/ProfileSettings';
import AdminPanel from './components/AdminPanel';
import AdminUploadPDF from './components/AdminUploadPDF';
import TenderPDFViewer from './components/TenderPDFViewer';
import DebugTenderDetails from './components/DebugTenderDetails';

import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import categoryService from './services/categoryService';

// Component to handle hash navigation
const ScrollToHash = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  return null;
};

function App() {
  // Initialize category service when app starts
  useEffect(() => {
    categoryService.initialize();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="App">
        
          <Header />
          <ScrollToHash />
          <Routes>
            <Route path="/" element={<HomePageHandler />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/active-tenders" element={
              <ProtectedRoute>
                <ActiveTendersTable />
              </ProtectedRoute>
            } />
            <Route path="/tenders/create" element={
              <ProtectedRoute roles={['buyer', 'admin']}>
                <TenderForm />
              </ProtectedRoute>
            } />
            <Route path="/tenders/edit/:id" element={
              <ProtectedRoute roles={['buyer', 'admin']}>
                <TenderForm />
              </ProtectedRoute>
            } />
            <Route path="/tenders/manage" element={
              <ProtectedRoute roles={['buyer', 'admin']}>
                <TenderList />
              </ProtectedRoute>
            } />
            <Route path="/tender/:id" element={
              <ProtectedRoute>
                <TenderDetails />
              </ProtectedRoute>
            } />
            <Route path="/tender/:id/bids" element={
              <ProtectedRoute roles={['buyer', 'admin']}>
                <TenderBids />
              </ProtectedRoute>
            } />
            <Route path="/bidder-dashboard" element={
              <ProtectedRoute roles={['vendor', 'supplier']}>
                <BidderDashboard />
              </ProtectedRoute>
            } />
            <Route path="/my-bids" element={
              <ProtectedRoute roles={['vendor', 'supplier']}>
                <MyBids />
              </ProtectedRoute>
            } />
            <Route path="/bid/:tenderId" element={
              <ProtectedRoute roles={['vendor', 'supplier']}>
                <SubmitBid />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/profile/settings" element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            } />
            <Route path="/admin/panel" element={
              <ProtectedRoute roles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="/admin/upload-pdf" element={
              <ProtectedRoute roles={['admin']}>
                <AdminUploadPDF />
              </ProtectedRoute>
            } />
            <Route path="/tender-viewer" element={
              <ProtectedRoute>
                <TenderPDFViewer />
              </ProtectedRoute>
            } />
            <Route path="/debug-tender-details" element={
              <ProtectedRoute roles={['admin']}>
                <DebugTenderDetails />
              </ProtectedRoute>
            } />
          </Routes>
          <Footer />
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
