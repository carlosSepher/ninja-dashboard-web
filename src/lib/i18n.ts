import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      filters: {
        title: "Filters",
        dateRange: "Date range",
        company: "Company",
        psp: "PSP",
        status: "Status",
        apply: "Apply",
        reset: "Reset",
      },
      layout: {
        overview: "Overview",
        transactions: "Transactions",
        health: "Service health",
        export: "Export",
        theme: "Toggle theme",
      },
      kpis: {
        totalPayments: "Total payments",
        totalAmount: "Total amount",
        activeCompanies: "Active companies",
        successRate: "Success rate",
        topPsp: "Top PSP",
      },
      tables: {
        payments: "Payments",
      },
      status: {
        ok: "Operational",
        degraded: "Degraded",
        down: "Down",
      },
      actions: {
        retry: "Retry",
      },
      errors: {
        generic: "Something went wrong",
      },
      empty: {
        noData: "No data to display",
      },
    },
  },
} as const;

export const initI18n = async () => {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng: "en",
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
    });
  }
  return i18n;
};

export default i18n;
