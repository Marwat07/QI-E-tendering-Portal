import React, { useState } from 'react';
import './Features.css';

const Features = () => {
  const [activeFeature, setActiveFeature] = useState(null);

  const features = [
    {
      id: 1,
      icon: '🔥',
      title: 'Vendor Registration',
      description: 'Quick and easy registration process for vendors to join our platform and access tender opportunities.',
      details: 'Register your company to participate in tenders and access exclusive opportunities. Our streamlined registration process ensures you can get started quickly and efficiently.',
      benefits: [
        'Fast approval process',
        'Access to all tender categories',
        'Profile verification system',
        'Dedicated vendor dashboard'
      ]
    },
    {
      id: 2,
      icon: '⚡',
      title: 'Bid Submission',
      description: 'Submit bids electronically with our secure, user-friendly interface and track submission status.',
      details: 'Submit your competitive bids online with our secure platform. Track your submissions in real-time and receive instant confirmations.',
      benefits: [
        'Secure digital submission',
        'Real-time status tracking',
        'Document encryption',
        'Automated confirmations'
      ]
    },
    {
      id: 3,
      icon: '💡',
      title: 'Bid Evaluation',
      description: 'Transparent evaluation process with real-time updates and detailed feedback for participants.',
      details: 'Transparent and fair evaluation process for all submitted bids. Get detailed feedback and understand how your bid performed.',
      benefits: [
        'Fair evaluation criteria',
        'Real-time result updates',
        'Detailed feedback reports',
        'Appeals process available'
      ]
    },
   
   
   
  ];

  const handleFeatureClick = (featureId) => {
    setActiveFeature(activeFeature === featureId ? null : featureId);
  };

  return (
    <section className="features" id="features">
      <div className="container">
        <div className="features-header">
          <h2 className="section-title">Platform Features</h2>
          <div className="title-underline"></div>
          <p className="section-subtitle">
            Discover the powerful tools and capabilities that make our e-tendering platform 
            the preferred choice for businesses worldwide.
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature) => (
            <div 
              key={feature.id}
              className={`feature-card ${activeFeature === feature.id ? 'active' : ''}`}
              onClick={() => handleFeatureClick(feature.id)}
            >
              <div className="card-front">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <button className="feature-btn">
                  {activeFeature === feature.id ? 'Show Less' : 'Learn More'}
                </button>
              </div>

              {activeFeature === feature.id && (
                <div className="card-back">
                  <div className="feature-details">
                    <h4>Details</h4>
                    <p>{feature.details}</p>
                    
                    <h4>Key Benefits</h4>
                    <ul>
                      {feature.benefits.map((benefit, index) => (
                        <li key={index}>
                          <span className="benefit-icon">✓</span>
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="features-cta">
          <div className="cta-content">
            <h3>Ready to Get Started?</h3>
            <p>Join thousands of vendors and buyers who trust our platform for their tender needs.</p>
            <button 
              className="cta-button"
              onClick={() => {
                const element = document.getElementById('contact');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Contact Us Today
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
