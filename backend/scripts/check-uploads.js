const fs = require('fs');
const path = require('path');

// Check uploads directory
const uploadsDir = path.join(__dirname, '../uploads');
const bidsDir = path.join(uploadsDir, 'bids');

console.log('=== Upload Directory Diagnostic ===');
console.log(`Uploads directory: ${uploadsDir}`);
console.log(`Uploads exists: ${fs.existsSync(uploadsDir)}`);
console.log(`Bids directory: ${bidsDir}`);
console.log(`Bids exists: ${fs.existsSync(bidsDir)}`);

if (fs.existsSync(uploadsDir)) {
  console.log('\n=== Files in uploads directory ===');
  const files = fs.readdirSync(uploadsDir, { withFileTypes: true });
  files.forEach(file => {
    if (file.isFile()) {
      const filePath = path.join(uploadsDir, file.name);
      const stats = fs.statSync(filePath);
      console.log(`File: ${file.name}, Size: ${stats.size} bytes, Modified: ${stats.mtime}`);
    } else if (file.isDirectory()) {
      console.log(`Directory: ${file.name}/`);
      try {
        const subFiles = fs.readdirSync(path.join(uploadsDir, file.name));
        console.log(`  Contains ${subFiles.length} files: ${subFiles.slice(0, 5).join(', ')}${subFiles.length > 5 ? '...' : ''}`);
      } catch (err) {
        console.log(`  Error reading directory: ${err.message}`);
      }
    }
  });
} else {
  console.log('❌ Uploads directory does not exist!');
  console.log('Creating uploads directory...');
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Uploads directory created successfully');
  } catch (err) {
    console.log('❌ Failed to create uploads directory:', err.message);
  }
}

// Check for recent bid files
if (fs.existsSync(bidsDir)) {
  console.log('\n=== Recent bid files ===');
  const bidFiles = fs.readdirSync(bidsDir);
  const recentFiles = bidFiles
    .map(filename => {
      const filePath = path.join(bidsDir, filename);
      const stats = fs.statSync(filePath);
      return { filename, stats, path: filePath };
    })
    .sort((a, b) => b.stats.mtime - a.stats.mtime)
    .slice(0, 10);

  recentFiles.forEach(file => {
    console.log(`${file.filename} (${(file.stats.size / 1024).toFixed(2)} KB) - ${file.stats.mtime.toLocaleString()}`);
  });
}

console.log('\n=== Environment Check ===');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`Process CWD: ${process.cwd()}`);
console.log(`Script location: ${__dirname}`);