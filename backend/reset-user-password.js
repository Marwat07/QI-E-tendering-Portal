const { query, connectDB, gracefulShutdown } = require('./config/database');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

async function resetUserPassword() {
  try {
    // Ensure DB connection
    await connectDB();

    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('Usage: node reset-user-password.js <email> <new_password>');
      console.log('Example: node reset-user-password.js admin@etendering.com admin123');
      await gracefulShutdown();
      process.exit(1);
    }

    const [email, newPassword] = args;
    
    console.log(`🔄 Resetting password for: ${email}`);
    
    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      await gracefulShutdown();
      process.exit(1);
    }
    
    console.log(`✅ User found: ${user.email} (${user.role})`);
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, user.id]
    );
    
    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`🔑 New password: ${newPassword}`);
    
    // Test the new password
    const updatedUser = await User.findByEmail(email);
    const isMatch = await updatedUser.matchPassword(newPassword);
    
    if (isMatch) {
      console.log(`✅ Password verification successful!`);
    } else {
      console.log(`❌ Password verification failed!`);
    }
    
  } catch (error) {
    console.error('❌ Password reset failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await gracefulShutdown();
  }
  
  process.exit(0);
}

resetUserPassword();
