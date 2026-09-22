'use client';

import NextLink from 'next/link';
import { useRouter as useNextRouter, usePathname as useNextPathname } from 'next/navigation';
import { useMemo, type ComponentProps } from 'react';
import { useLocale } from './client';
import { localizeHref, unprefixedPath } from './paths';

/** Shared internal navigation; locale never enters an API payload. */
export default function Link(props: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const href = typeof props.href === 'string'
    ? localizeHref(locale, props.href)
    : { ...props.href, pathname: props.href.pathname ? localizeHref(locale, props.href.pathname) : props.href.pathname };
  return <NextLink {...props} href={href} />;
}

export function useRouter() {
  const router = useNextRouter();
  const locale = useLocale();
  return useMemo(() => ({
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(localizeHref(locale, href), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(localizeHref(locale, href), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(localizeHref(locale, href), options),
  }), [router, locale]);
}

/** Existing view comparisons use semantic, unprefixed paths. */
export function usePathname() {
  const pathname = useNextPathname();
  return pathname ? unprefixedPath(pathname) : pathname;
}
