import { decrypt } from './crypto.js';
import { firstPayment } from '../../../shared/plans.js';
import { currentPeriod } from './billing.js';

function file(f) {
  if (!f || !f.filename) return null;
  return { id: f._id?.toString(), url: `/api/files/${f.filename}`, name: f.originalName, mime: f.mime, size: f.size };
}

// Shape of an application as sent to the browser. Secrets never leave except the
// admin login, and only once the app is live (or to the Cullinari team).
export function serializeApplication(app, { forAdmin = false } = {}) {
  if (!app) return null;
  const o = app.toObject({ virtuals: false });
  const showLogin = forAdmin || o.status === 'live';
  const user = o.user && o.user.email
    ? { id: o.user._id.toString(), firstName: o.user.firstName, lastName: o.user.lastName, email: o.user.email, phone: o.user.phone, restaurantName: o.user.restaurantName }
    : undefined;

  return {
    id: o._id.toString(),
    plan: o.plan,
    status: o.status,
    details: o.details || {},
    files: {
      logo: file(o.files?.logo),
      splash: file(o.files?.splash),
      menu: (o.files?.menu || []).map(file).filter(Boolean),
    },
    reviewNote: o.reviewNote || '',
    history: (o.history || []).map((h) => ({ status: h.status, at: h.at, note: forAdmin ? h.note : undefined })),
    submittedAt: o.submittedAt,
    amounts: o.plan ? firstPayment(o.plan) : null,
    payment: o.payment?.paidAt
      ? {
          reference: o.payment.reference,
          amount: o.payment.amount,
          paidAt: o.payment.paidAt,
          channel: o.payment.channel,
          ...(forAdmin ? { subscriptionCode: o.payment.subscriptionCode, subscriptionError: o.payment.subscriptionError } : {}),
        }
      : null,
    delivery: o.delivery
      ? {
          etaStart: o.delivery.etaStart,
          etaEnd: o.delivery.etaEnd,
          playStoreUrl: o.delivery.playStoreUrl,
          appStoreUrl: o.delivery.appStoreUrl,
          adminUrl: showLogin ? o.delivery.adminUrl : undefined,
          adminLoginEmail: showLogin ? o.delivery.adminLoginEmail : undefined,
          adminPassword: showLogin && o.delivery.adminPasswordEnc ? safeDecrypt(o.delivery.adminPasswordEnc) : undefined,
          deliveredAt: o.delivery.deliveredAt,
        }
      : null,
    pendingPlan: o.pendingPlan || null,
    pendingPlanAt: o.pendingPlanAt || null,
    billingPeriod: o.payment?.paidAt ? currentPeriod(o) : null,
    planChanges: (o.planChanges || []).map((c) => ({
      kind: c.kind, from: c.from, to: c.to, status: c.status, amount: c.amount,
      reference: c.reference, requestedAt: c.requestedAt, effectiveAt: c.effectiveAt,
    })),
    user,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

function safeDecrypt(v) {
  try {
    return decrypt(v);
  } catch {
    return '';
  }
}
