import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getStatusLabel,
  normalizeOrderStatus,
  type OrderStatus,
} from '../src/lib/demo-store.ts';

const PUBLIC_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'awaiting_payment',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'returned',
];

describe('подписи статусов заказа', () => {
  it('знает все публичные статусы backend', () => {
    for (const status of PUBLIC_STATUSES) {
      const label = getStatusLabel(status);

      assert.notEqual(label, 'Невідомо', `для ${status} нужна подпись`);
      assert.ok(label.length > 0);
    }
  });

  it('поддерживает новые статусы confirmed, awaiting_payment и returned', () => {
    assert.equal(getStatusLabel('confirmed'), 'Підтверджено');
    assert.equal(getStatusLabel('awaiting_payment'), 'Очікує оплати');
    assert.equal(getStatusLabel('returned'), 'Повернення');
  });

  it('не показывает undefined для неизвестного статуса', () => {
    for (const value of ['whatever', '', 'PENDING_REVIEW', 'undefined']) {
      const label = getStatusLabel(value);

      assert.equal(typeof label, 'string');
      assert.ok(!label.includes('undefined'), `«${value}» дало «${label}»`);
    }

    assert.equal(getStatusLabel('whatever'), 'Невідомо');
  });

  it('нормализует регистр и отсекает незнакомые значения', () => {
    assert.equal(normalizeOrderStatus('SHIPPED'), 'shipped');
    assert.equal(normalizeOrderStatus('Awaiting_Payment'), 'awaiting_payment');
    assert.equal(normalizeOrderStatus('nonsense'), null);
  });
});
