import React from 'react';
import './Contact.css';

const Contact = () => {
  const contactDetails = [
    {
      icon: '📧',
      label: 'Email',
      value: 'scm@qaswaindustries.com',
      link: 'mailto:info@etendering.com',
    },
    {
      icon: '📞',
      label: 'Phone',
      value: '+92 319 0508030',
      link: 'tel:+1234567890',
    },
    {
      icon: '📍',
      label: 'Address',
      value: 'Plot No: 56, 57 and 58 Special Economic Zone,Hattar',
      link: 'https://maps.google.com/?q=Plot+No+56,+57+and+58+Special+Economic+Zone,+Hattar',
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

