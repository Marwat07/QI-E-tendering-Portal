import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Hero.css';

const Hero = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleActiveTenders = () => {
    navigate('/active-tenders');
  };

  const handleCreateTender = () => {
    // If user is admin, navigate to admin dashboard with upload-tender tab
    if (user?.role === 'admin') {
      navigate('/admin', { state: { activeTab: 'upload-tender' } });
    } else {
      // For buyers, use the regular tender creation form
      navigate('/tenders/create');
    }
  };

  const handleManageTenders = () => {
    // If user is admin, navigate to admin dashboard with tenders tab
    if (user?.role === 'admin') {
      navigate('/admin', { state: { activeTab: 'tenders' } });
    } else {
      // For buyers, use the regular tender management
      navigate('/tenders/manage');
    }
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <section className="hero" id="home">
      <div className="hero-content">
        <div className="hero-text">
          <h1 className="hero-title">
            Digital Procurement <span className="highlight">Simplified</span>
          </h1>
          <p className="hero-subtitle">
            Join us to revolutionize your procurement processes with cutting-edge 
            technology and transparent tender management.
          </p>
          
          <div className="cta-buttons">
            {/* Always show active tenders button */}
            <button 
              className="btn btn-primary"
              onClick={handleActiveTenders}
            >
              View Active Tenders
            </button>
            
            {/* Show different buttons based on authentication and role */}
            {!isAuthenticated ? (
              <>
                <button 
                  className="btn btn-success"
                  onClick={handleRegister}
                >
                  Register Now
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={handleLogin}
                >
                  Login to Participate
                </button>
                {/* <button 
                 className="btn btn-primary"
                  onClick={scrollToContact}
                >
                  Request for Quote
                </button> */}
              </>
            ) : (
              <>
                {/* Buttons for buyers and admins */}
                {(user?.role === 'buyer' || user?.role === 'admin') && (
                  <>
                    <button 
                      className="btn btn-success"
                      onClick={handleCreateTender}
                    >
                      Create New Tender
                    </button>
                    <button 
                      className="btn btn-secondary"
                      onClick={handleManageTenders}
                    >
                      Manage My Tenders
                    </button>
                  </>
                )}
                
                {/* Button for vendors */}
                {user?.role === 'vendor' && (
                  <button 
                    className="btn btn-secondary"
                    onClick={scrollToContact}
                  >
                    Get Support
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    
    </section>
  );
};

export default Hero;
