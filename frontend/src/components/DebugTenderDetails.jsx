import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import tenderService from '../services/tender';

const DebugTenderDetails = () => {
  const { user } = useAuth();
  const [tenderId, setTenderId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testAdminEndpoint = async () => {
    if (!tenderId) {
      alert('Please enter a tender ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const url = `${API_BASE}/admin/tenders/${tenderId}`;
      
      console.log('Testing admin endpoint:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Admin endpoint result:', data);
      setResult({ type: 'admin', data });
    } catch (err) {
      console.error('Admin endpoint error:', err);
      setError(`Admin endpoint failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testRegularEndpoint = async () => {
    if (!tenderId) {
      alert('Please enter a tender ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing regular endpoint via tenderService...');
      const data = await tenderService.getTenderById(tenderId);
      console.log('Regular endpoint result:', data);
      setResult({ type: 'regular', data });
    } catch (err) {
      console.error('Regular endpoint error:', err);
      setError(`Regular endpoint failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testBothEndpoints = async () => {
    if (!tenderId) {
      alert('Please enter a tender ID');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const results = {};

    // Test admin endpoint
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
      const url = `${API_BASE}/admin/tenders/${tenderId}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        results.admin = { success: true, data };
      } else {
        results.admin = { success: false, error: `HTTP ${response.status}` };
      }
    } catch (err) {
      results.admin = { success: false, error: err.message };
    }

    // Test regular endpoint
    try {
      const data = await tenderService.getTenderById(tenderId);
      results.regular = { success: true, data };
    } catch (err) {
      results.regular = { success: false, error: err.message };
    }

    console.log('Both endpoints results:', results);
    setResult({ type: 'both', data: results });
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Debug Tender Details API</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p><strong>Current User:</strong> {user?.email} ({user?.role})</p>
        <p><strong>Auth Token:</strong> {localStorage.getItem('authToken') ? 'Present' : 'Missing'}</p>
        <p><strong>API Base URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label>
          <strong>Tender ID to test:</strong>
          <input
            type="text"
            value={tenderId}
            onChange={(e) => setTenderId(e.target.value)}
            placeholder="Enter tender ID (e.g., 1, 2, 3...)"
            style={{ 
              marginLeft: '10px', 
              padding: '5px', 
              width: '200px',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testAdminEndpoint}
          disabled={loading}
          style={{
            padding: '10px 15px',
            marginRight: '10px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Test Admin Endpoint
        </button>
        
        <button 
          onClick={testRegularEndpoint}
          disabled={loading}
          style={{
            padding: '10px 15px',
            marginRight: '10px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Test Regular Endpoint
        </button>

        <button 
          onClick={testBothEndpoints}
          disabled={loading}
          style={{
            padding: '10px 15px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Test Both Endpoints
        </button>
      </div>

      {loading && (
        <div style={{ color: '#3b82f6', marginBottom: '20px' }}>
          <strong>Testing...</strong>
        </div>
      )}

      {error && (
        <div style={{ color: '#ef4444', marginBottom: '20px', padding: '10px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h2>Result:</h2>
          <pre style={{ 
            backgroundColor: '#f3f4f6', 
            padding: '15px', 
            borderRadius: '4px', 
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '4px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Make sure you're logged in as an admin</li>
          <li>Go to Admin Dashboard → Tender Management to see available tender IDs</li>
          <li>Enter a tender ID above and click one of the test buttons</li>
          <li>Check the browser console and the results below</li>
          <li>This will help identify if the issue is with the API endpoints or the TenderDetails component</li>
        </ol>
      </div>
    </div>
  );
};

export default DebugTenderDetails;