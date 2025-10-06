import React from 'react';
import './About.css';

const About = () => {
  const stats = [
    {
      number: '1000+',
      label: 'Active Vendors',
      description: 'Trusted vendors worldwide'
    },
    {
      number: '500+',
      label: 'Successful Tenders',
      description: 'Completed projects'
    },
    {
      number: '98%',
      label: 'Client Satisfaction',
      description: 'Happy customers'
    },
    {
      number: '10+',
      label: 'Years Experience',
      description: 'Industry expertise'
    }
  ];

  return (
    <section className="about" id="about">
      <div className="container">
        <div className="about-content">
          <div className="about-header">
            <h2 className="section-title">About QI E-Tendering</h2>
            <div className="title-underline"></div>
          </div>

          <div className="about-grid">
            <div className="about-text">
              <div className="text-content">
                <h3>Transforming Procurement Processes</h3>
                <p>
                  We are a leading e-tendering platform dedicated to transforming the 
                  procurement processes for businesses worldwide. Our mission is to 
                  streamline tender management, increase transparency, and provide equal 
                  opportunities for all participants.
                </p>
                <p>
                  With over 10 years of experience in digital procurement solutions, 
                  we have helped thousands of organizations improve their tendering 
                  processes, reduce costs, and enhance efficiency through cutting-edge 
                  technology and innovative solutions.
                </p>

              
              </div>
            </div>

            <div className="about-visual">
              <div className="visual-card">
                <div className="card-content">
                  <h4>Our Mission</h4>
                  <p>
                    To revolutionize procurement through technology, 
                    creating transparent, efficient, and accessible 
                    tender processes for all stakeholders.
                  </p>
                </div>
              </div>
              <div className="visual-card">
                <div className="card-content">
                  <h4>Our Vision</h4>
                  <p>
                    To be the global leader in digital procurement 
                    solutions, connecting buyers and vendors 
                    through innovative technology.
                  </p>
                </div>
              </div>
            </div>
          </div>

         
        </div>
      </div>
    </section>
  );
};

export default About;
