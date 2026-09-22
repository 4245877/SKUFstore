'use client';

import { useI18n } from '../../i18n/client';
import type { Translator } from '../../i18n/translate';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from '../../i18n/navigation';
import { getAccountProfile } from '../../lib/api';

type AuthState = 'checking' | 'ready' | 'error';

export default function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { locale, t, path } = useI18n();

  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await getAccountProfile();
        if (!cancelled) setAuthState('ready');
      } catch (error) {
        if (cancelled) return;

        const status =
          typeof error === 'object' && error && 'status' in error
            ? (error as { status?: number }).status
            : undefined;

        if (status === 401 || status === 403) {
          const suffix = pathname ? `?returnTo=${encodeURIComponent(pathname)}` : '';
          router.replace(`/login${suffix}`);
          return;
        }

        setAuthState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (authState === 'ready') {
    return <>{children}</>;
  }

  return (
    <main style={{ padding: '32px 20px' }}>
      <p>{authState === 'error' ? t('account.weCouldnTCheckYourSignIn') : t('account.checkingSignIn')}</p>
    </main>
  );
}