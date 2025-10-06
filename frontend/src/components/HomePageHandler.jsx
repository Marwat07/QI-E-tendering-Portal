import React from 'react';
import Hero from './Hero';
import About from './About';
import Features from './Features';
import Contact from './Contact';

const HomePageHandler = () => {

  // No automatic redirection - let vendors access home page when they want to
  // Login redirect is handled by the Login component itself

  // For non-vendors or non-authenticated users, show the normal home page
  return (
    <main>
      <Hero />
      <About />
      <Features />
      <Contact />
    </main>
  );
};

export default HomePageHandler;
