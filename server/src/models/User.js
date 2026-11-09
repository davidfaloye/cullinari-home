import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    restaurantName: { type: String, trim: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['client', 'admin'], default: 'client' },
    emailVerifiedAt: Date,
    verifyTokenHash: String,
    verifyTokenExpires: Date,
    termsAcceptedAt: Date,
    termsVersion: String,
    resetTokenHash: String,
    resetTokenExpires: Date,
  },
  { timestamps: true }
);

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    restaurantName: this.restaurantName,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    phone: this.phone,
    role: this.role,
    emailVerified: !!this.emailVerifiedAt,
  };
};

export const User = mongoose.model('User', userSchema);
