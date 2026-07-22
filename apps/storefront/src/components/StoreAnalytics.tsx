'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { buildApiUrl } from '../lib/api';
import {
  getCartItemsCount,
  readCart,
  subscribeToCartChange,
} from '../lib/demo-store';

const VISITOR_ID_KEY = 'skufnya:analytics:visitor-id';
const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{16,80}$/;

let volatileVisitorId = '';

function generateVisitorId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function getVisitorId() {
  if (volatileVisitorId) return volatileVisitorId;

  try {
    const stored = window.localStorage.getItem(VISITOR_ID_KEY);

    if (stored && VISITOR_ID_PATTERN.test(stored)) {
      volatileVisitorId = stored;
      return stored;
    }
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }

  volatileVisitorId = generateVisitorId();

  try {
    window.localStorage.setItem(VISITOR_ID_KEY, volatileVisitorId);
  } catch {
    // The in-memory id still deduplicates requests during this page session.
  }

  return volatileVisitorId;
}

function sendSnapshot() {
  let items = [];

  try {
    items = readCart();
  } catch {
    // An unavailable localStorage is equivalent to an empty cart for tracking.
  }

  const body = JSON.stringify({
    visitorId: getVisitorId(),
    cart: {
      itemQuantity: getCartItemsCount(items),
      lineCount: items.length,
    },
  });

  void fetch(buildApiUrl('/api/analytics/snapshot'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics must never interrupt shopping if the API is unavailable.
  });
}

export default function StoreAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    sendSnapshot();
    return subscribeToCartChange(sendSnapshot);
  }, [pathname]);

  return null;
}
