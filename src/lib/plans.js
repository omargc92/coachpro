// ============================================================
// CoachPro — definición central de planes y límites.
// Única fuente de verdad. Toda la app lee de aquí.
// ============================================================

export const PLANS = {
  trial: {
    label: 'Trial',
    sublabel: '14 días gratis',
    maxAthletes: 3,
    canWrite: true,
    features: {
      chat: true,
      ownLogo: true,
      customColors: false,
      exportPdf: false,
      businessDashboard: true
    }
  },
  expired: {
    label: 'Expirado',
    sublabel: 'Solo lectura',
    maxAthletes: 0,
    canWrite: false,
    features: {
      chat: false,
      ownLogo: false,
      customColors: false,
      exportPdf: false,
      businessDashboard: false
    }
  },
  fit: {
    // Plan de entrada: el atleta solo ve rutinas precargadas y registra avance.
    // Sin asesoría (chat) ni dashboard de negocio.
    label: 'Fit',
    sublabel: '$99 MXN/mes',
    price: 99,
    maxAthletes: 10,
    canWrite: true,
    features: {
      chat: false,
      ownLogo: false,
      customColors: false,
      exportPdf: false,
      businessDashboard: false
    }
  },
  pro: {
    label: 'Pro',
    sublabel: '$299 MXN/mes',
    price: 299,
    maxAthletes: 25,
    canWrite: true,
    features: {
      chat: true,
      ownLogo: true,
      customColors: false,
      exportPdf: false,
      businessDashboard: true
    }
  },
  premium: {
    label: 'Premium',
    sublabel: '$599 MXN/mes',
    price: 599,
    maxAthletes: Infinity,
    canWrite: true,
    features: {
      chat: true,
      ownLogo: true,
      customColors: true,
      exportPdf: true,
      businessDashboard: true
    }
  }
}

export const PLAN_FEATURES_LABELS = {
  chat: 'Chat con atletas',
  ownLogo: 'Logo propio',
  customColors: 'Colores white-label',
  exportPdf: 'Export PDF de progreso',
  businessDashboard: 'Dashboard de negocio'
}
