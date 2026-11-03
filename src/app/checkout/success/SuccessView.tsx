'use client';

import Link from 'next/link';
import { CheckCircle2, FileText, ShoppingBag } from 'lucide-react';
import { useTranslation } from '@/components/i18n/I18nProvider';
import { Price } from '@/components/currency/Price';
import { formatDate } from '@/lib/utils';
import { Order } from '@/lib/types';

export function SuccessView({ orders }: { orders: Order[] }) {
  const { t } = useTranslation();
  const grandTotal = orders.reduce((acc, order) => acc + order.total, 0);

  return (
    <div className="bg-gray-50 min-h-[75vh] py-16 flex items-center justify-center">
      <div className="modesy-container max-w-xl">
        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center shadow-xs">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-6 animate-scaleUp">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <span className="text-xs font-bold uppercase tracking-wider text-brand mb-1 block">
            {t('checkoutSuccess.title')}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            {t('checkoutSuccess.thankYou')}
          </h1>
          {orders.length > 1 && (
            <p className="text-xs text-gray-500 mb-6">
              {t('checkoutSuccess.splitNotice', { count: orders.length })}
            </p>
          )}

          <div className="space-y-3 mb-8 text-left">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-gray-200 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <span className="text-gray-500">{t('checkoutSuccess.orderNumber')}:</span>
                  <span className="font-mono font-bold text-gray-900">{order.order_number}</span>
                </div>
                {order.store?.title && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{t('checkoutSuccess.seller')}:</span>
                    <span className="font-semibold text-gray-800">{order.store.title}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('checkoutSuccess.placed')}:</span>
                  <span className="font-semibold text-gray-800">{formatDate(order.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('checkoutSuccess.status')}:</span>
                  <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded capitalize">
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">{t('checkoutSuccess.payment')}:</span>
                  <span className="font-bold capitalize text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    {order.payment_status} · {order.payment_method.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="font-bold text-gray-900">{t('checkoutSuccess.totalPaid')}:</span>
                  <Price amount={order.total} className="text-sm font-extrabold text-brand" />
                </div>
                <div className="pt-1">
                  <Link
                    href={`/account/orders/${order.order_number}`}
                    className="text-[11px] font-bold text-brand hover:underline"
                  >
                    {t('checkoutSuccess.viewDetails')}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {orders.length > 1 && (
            <div className="flex items-center justify-between px-4 py-3 mb-8 rounded-lg bg-gray-50 border border-gray-200 text-xs">
              <span className="font-bold text-gray-900">{t('checkoutSuccess.grandTotal')}:</span>
              <Price amount={grandTotal} className="text-base font-extrabold text-brand" />
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/account/orders"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-md text-xs font-bold transition shadow-xs"
            >
              <FileText className="w-4 h-4" />
              <span>{t('checkoutSuccess.viewOrders')}</span>
            </Link>
            <Link
              href="/products"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-semibold transition"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{t('checkoutSuccess.continueShopping')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
