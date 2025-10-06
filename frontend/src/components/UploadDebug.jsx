import React, { useState } from 'react';
import apiService from '../services/api';

const UploadDebug = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    console.log(message);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    addLog(`Selected ${files.length} files`);
    files.forEach(file => {
      addLog(`File: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
    });
    
    if (files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      addLog('Creating FormData and sending request...');
      
      // Test the upload
      const response = await apiService.post('/upload/multiple', formData);
      
      addLog(`Response received: ${JSON.stringify(response)}`);

      // Handle response
      const responseData = response.data || response;
      
      if (responseData.success) {
        const filesData = responseData.data || responseData.files || [];
        const newFiles = filesData.map(file => ({
          filename: file.filename,
          name: file.originalName,
          size: file.size,
          type: file.mimetype,
          path: file.path
        }));
        
        setUploadedFiles(prev => [...prev, ...newFiles]);
        addLog(`Successfully uploaded ${newFiles.length} files`);
      } else {
        throw new Error(responseData.message || 'Upload failed');
      }
    } catch (err) {
      addLog(`Upload error: ${err.message}`);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const clearFiles = () => {
    setUploadedFiles([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Upload Debug Tool</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="files">Select files to upload:</label>
        <input
          type="file"
          id="files"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ marginTop: '10px', padding: '10px', width: '100%' }}
        />
      </div>

      {uploading && (
        <div style={{ padding: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '20px' }}>
          Uploading files...
        </div>
      )}

      {error && (
        <div style={{ padding: '10px', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px', color: '#dc2626' }}>
          Error: {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Uploaded Files ({uploadedFiles.length})</h3>
          {uploadedFiles.map((file, index) => (
            <div key={index} style={{ padding: '10px', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '10px' }}>
              <div><strong>Name:</strong> {file.name}</div>
              <div><strong>Filename:</strong> {file.filename}</div>
              <div><strong>Size:</strong> {file.size} bytes</div>
              <div><strong>Type:</strong> {file.type}</div>
              <div><strong>Path:</strong> {file.path}</div>
            </div>
          ))}
          <button onClick={clearFiles} style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Clear Files
          </button>
        </div>
      )}

      <div style={{ marginBottom: '20px' }}>
        <h3>Debug Logs</h3>
        <button onClick={clearLogs} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', marginBottom: '10px' }}>
          Clear Logs
        </button>
        <div style={{ background: '#f3f4f6', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
          {logs.length === 0 ? (
            <div>No logs yet...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index}>{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadDebug;
