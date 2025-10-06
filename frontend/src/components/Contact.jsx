import React from 'react';
import './Contact.css';

const Contact = () => {
  const contactDetails = [
    {
      icon: '📧',
      label: 'Email',
      value: 'info@etendering.com',
      link: 'mailto:info@etendering.com',
    },
    {
      icon: '📞',
      label: 'Phone',
      value: '+123 456 7890',
      link: 'tel:+1234567890',
    },
    {
      icon: '📍',
      label: 'Address',
      value: '123 Tender Lane, Business City',
      link: 'https://maps.google.com/?q=123+Tender+Lane,+Business+City',
    },
  ];

  return (
    <section className="contact" id="contact">
      <div className="container">
        <h2 className="section-title">Contact Us</h2>
        <div className="title-underline"></div>
        <p className="contact-subtitle">For inquiries, please reach out using the methods below:</p>
        <div className="contact-grid">
          {contactDetails.map((detail, index) => (
            <a key={index} href={detail.link} className="contact-card">
              <div className="contact-icon">{detail.icon}</div>
              <div className="contact-info">
                <h4>{detail.label}</h4>
                <p>{detail.value}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Contact;

