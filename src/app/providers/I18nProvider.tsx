import { Suspense, useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, { initI18n } from "@/lib/i18n";

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [ready, setReady] = useState(i18n.isInitialized);

  useEffect(() => {
    if (!i18n.isInitialized) {
      initI18n().then(() => setReady(true));
    }
  }, []);

  if (!ready) {
    return <div className="flex h-screen items-center justify-center">Loading i18n...</div>;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Suspense
        fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}
      >
        {children}
      </Suspense>
    </I18nextProvider>
  );
};
