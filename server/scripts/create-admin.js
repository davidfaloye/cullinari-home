// Creates a Cullinari team account, or promotes an existing account to admin.
// Usage: npm run create-admin -- you@cullinari.com 'a-strong-password' "First" "Last"
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../src/config.js';
import { User } from '../src/models/User.js';

const [email, password, firstName = 'Cullinari', lastName = 'Team'] = process.argv.slice(2);
if (!email || !password || password.length < 10) {
  console.error('Usage: npm run create-admin -- <email> <password (10+ chars)> [first] [last]');
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
const existing = await User.findOne({ email: email.toLowerCase() });
if (existing) {
  existing.role = 'admin';
  existing.emailVerifiedAt = existing.emailVerifiedAt || new Date();
  existing.passwordHash = await bcrypt.hash(password, 12);
  await existing.save();
  console.log(`Promoted ${email} to admin.`);
} else {
  await User.create({
    email,
    firstName,
    lastName,
    restaurantName: 'Cullinari',
    role: 'admin',
    emailVerifiedAt: new Date(),
    passwordHash: await bcrypt.hash(password, 12),
  });
  console.log(`Created admin ${email}.`);
}
await mongoose.disconnect();
