import React from 'react';
import './Footer.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Contact Us',
      items: [
        { label: 'Email: scm@qaswaindustries.com', link: 'mailto:info@etendering.com' },
        { label: 'Phone: +92 319 0508030', link: 'tel:+1234567890' },
        { label: 'Plot No: 56, 57 and 58 Special Economic Zone, Hattar', link: '#' }
      ]
    },
    {
      title: 'Services',
      items: [
        { label: 'Vendor Registration', link: '#' },
        { label: 'Bid Submission', link: '#' },
        { label: 'Tender Management', link: '#' },
        { label: 'Procurement Solutions', link: '#' }
      ]
    },
    {
      title: 'Resources',
      items: [
        { label: 'Documentation', link: '#' },
        { label: 'Support', link: '#' },
        { label: 'FAQ', link: '#' },
        { label: 'Training', link: '#' }
      ]
    }
  ];

  const socialLinks = [
    { name: 'LinkedIn', icon: '🔗', link: '#' },
    { name: 'Twitter', icon: '🐦', link: '#' },
    { name: 'Facebook', icon: '📘', link: '#' },
    { name: 'Email', icon: '📧', link: 'mailto:info@etendering.com' }
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <h3 className="footer-logo">QI E-Tendering</h3>
            <p className="footer-description">
              Revolutionizing procurement processes through innovative 
              digital solutions and transparent tender management.
            </p>
            <div className="social-links">
              {socialLinks.map((social, index) => (
                <a 
                  key={index}
                  href={social.link}
                  className="social-link"
                  title={social.name}
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {footerSections.map((section, index) => (
            <div key={index} className="footer-section">
              <h4>{section.title}</h4>
              <ul>
                {section.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <a href={item.link}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <div className="footer-divider"></div>
          <div className="footer-bottom-content">
            <p className="copyright">
              &copy; {currentYear} QI E-Tendering System. All Rights Reserved.
            </p>
            <div className="footer-bottom-links">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#cookies">Cookie Policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
