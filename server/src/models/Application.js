import mongoose from 'mongoose';

// Lifecycle of a restaurant's application:
// draft → submitted → approved → paid → live
//            ↘ changes_requested → (edited) → submitted
//            ↘ rejected
export const STATUSES = ['draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'paid', 'live'];

const fileSchema = new mongoose.Schema(
  {
    filename: String, // stored name on disk
    originalName: String,
    mime: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const branchSchema = new mongoose.Schema({ name: String, address: String }, { _id: false });

const historySchema = new mongoose.Schema(
  {
    status: String,
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['starter', 'growth', 'pro', null], default: null },
    status: { type: String, enum: STATUSES, default: 'draft', index: true },

    details: {
      businessName: String,
      appName: String,
      tagline: String,
      cuisine: String,
      phone: String,
      whatsapp: String,
      email: String,
      address: String,
      city: String,
      state: String,
      hours: String,
      branches: [branchSchema],
      primaryColor: String,
      secondaryColor: String,
      menuLayout: { type: String, default: 'list' },
      extraOptions: [String],
      offersDelivery: { type: Boolean, default: false },
      offersPickup: { type: Boolean, default: true },
      deliveryNotes: String,
      menuLink: String,
      customDomain: String,
      customFeatures: String,
      hasPlayAccount: String, // 'yes' | 'no' | 'unsure'
      notes: String,
    },

    files: {
      logo: fileSchema,
      splash: fileSchema,
      menu: [fileSchema],
    },

    reviewNote: String,
    history: [historySchema],
    submittedAt: Date,
    reviewedAt: Date,

    payment: {
      reference: String,
      amount: Number, // naira
      currency: String,
      channel: String,
      paidAt: Date,
      customerCode: String,
      authorizationCode: String, // Paystack token for recurring charges; never sent to the browser (see lib/serialize.js)
      subscriptionCode: String,
      subscriptionError: String,
    },

    delivery: {
      etaStart: Date,
      etaEnd: Date,
      playStoreUrl: String,
      appStoreUrl: String,
      adminUrl: String,
      adminLoginEmail: String,
      adminPasswordEnc: String, // AES-256-GCM, see lib/crypto.js
      deliveredAt: Date,
    },
  },
  { timestamps: true }
);

applicationSchema.methods.setStatus = function setStatus(status, { by, note } = {}) {
  this.status = status;
  this.history.push({ status, by, note });
};

export const Application = mongoose.model('Application', applicationSchema);
