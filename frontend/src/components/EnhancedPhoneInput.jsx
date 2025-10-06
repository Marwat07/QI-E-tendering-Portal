import React, { useState, useEffect } from 'react';
import PhoneInput, { getCountries } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import './EnhancedPhoneInput.css';

// Custom validation function for digit count
const validatePhoneDigitCount = (phoneNumber) => {
  if (!phoneNumber) return { isValid: true, message: '' };
  
  // Remove all non-digit characters to count actual digits
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  const digitCount = digitsOnly.length;
  
  if (digitCount < 11) {
    return { isValid: false, message: 'Phone number must have at least 11 digits' };
  } else if (digitCount > 12) {
    return { isValid: false, message: 'Phone number cannot exceed 12 digits' };
  }
  
  return { isValid: true, message: '' };
};

const EnhancedPhoneInput = ({ 
  value, 
  onChange, 
  placeholder = "Phone Number", 
  className = "", 
  disabled = false,
  required = false,
  error = "",
  defaultCountry = "US" 
}) => {
  const [phoneValue, setPhoneValue] = useState(value || '');
  const [countries] = useState(() => getCountries());
  const [digitCountError, setDigitCountError] = useState('');


  // Update internal state when value prop changes
  useEffect(() => {
    setPhoneValue(value || '');
  }, [value]);

  // Handle phone number change from PhoneInput
  const handlePhoneChange = (newValue) => {
    setPhoneValue(newValue || '');
    
    // Validate digit count
    const digitValidation = validatePhoneDigitCount(newValue);
    setDigitCountError(digitValidation.isValid ? '' : digitValidation.message);
    
    if (onChange) {
      onChange(newValue || '');
    }
  };



  return (
    <div className={`enhanced-phone-input ${className} ${error ? 'has-error' : ''}`}>

      <PhoneInput
        placeholder={placeholder}
        value={phoneValue}
        onChange={handlePhoneChange}
        defaultCountry={defaultCountry}
        countries={countries}
        international
        countryCallingCodeEditable={true}
        disabled={disabled}
        className="standard-phone-input"
      />

      {error && <span className="phone-error-message">{error}</span>}
      {digitCountError && <span className="phone-error-message">{digitCountError}</span>}
    </div>
  );
};

export default EnhancedPhoneInput;
