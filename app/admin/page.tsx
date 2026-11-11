'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState({
    totalSales: 0,
    ordersToday: 0,
    readyPickup: 0,
    pendingPayments: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [otpInput, setOtpInput] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/reports')
      .then((res) => res.json())
      .then((data) => {
        setSummary(data.summary);
        setOrders(data.orders);
      })
      .catch(() => {
        setSummary({ totalSales: 0, ordersToday: 0, readyPickup: 0, pendingPayments: 0 });
        setOrders([]);
      });
  }, []);

  const markReady = (order: Order) => {
    const code = '123456';
    setOrders((prev) =>
      prev.map((item) =>
        item.id === order.id ? { ...item, status: 'READY_FOR_PICKUP', paymentStatus: 'SUCCESS' } : item
      )
    );
    setMessage(`Order ${order.orderNumber} is ready. Collection OTP: ${code}`);
  };

  const verifyPickup = (order: Order) => {
    const code = otpInput[order.id] || '';
    if (code === '123456') {
      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? { ...item, status: 'COLLECTED' } : item))
      );
      setMessage(`Order ${order.orderNumber} collected successfully.`);
      return;
    }
    setMessage('Invalid OTP. Use the demo OTP shown when the order is marked ready.');
  };

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between rounded-2xl bg-white p-4 shadow-soft">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Owner dashboard</p>
            <h1 className="mt-2 text-3xl font-black text-brand-blue">Shop overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-600">Login</Link>
            <Link href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Home
            </Link>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            ['Today sales', `₹${summary.totalSales}`],
            ['Orders today', String(summary.ordersToday)],
            ['Ready for pickup', String(summary.readyPickup)],
            ['Pending payments', `₹${summary.pendingPayments}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white p-5 shadow-soft">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-3 text-3xl font-black text-brand-blue">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-black text-brand-blue">Order management</h3>
            <span className="text-sm text-slate-500">Collection workflow</span>
          </div>

          {message && (
            <div className="mb-4 rounded-xl bg-orange/10 p-3 text-sm font-medium text-brand-blue">
              {message}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4 font-semibold">Order</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Payment</th>
                  <th className="py-3 pr-4 font-semibold">Amount</th>
                  <th className="py-3 pr-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 font-bold text-brand-blue">{order.orderNumber}</td>
                    <td className="py-3 pr-4">{order.status}</td>
                    <td className="py-3 pr-4">{order.paymentStatus}</td>
                    <td className="py-3 pr-4">₹{order.total}</td>
                    <td className="py-3 pr-4">
                      {order.status !== 'READY_FOR_PICKUP' && order.status !== 'COLLECTED' ? (
                        <button onClick={() => markReady(order)} className="rounded-lg bg-brand-blue px-3 py-2 text-xs font-bold text-white">
                          Mark ready
                        </button>
                      ) : order.status === 'READY_FOR_PICKUP' ? (
                        <div className="flex flex-col gap-2">
                          <input
                            value={otpInput[order.id] || ''}
                            onChange={(e) =>
                              setOtpInput((prev) => ({ ...prev, [order.id]: e.target.value }))
                            }
                            className="w-28 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs"
                            placeholder="OTP"
                          />
                          <button onClick={() => verifyPickup(order)} className="rounded-lg bg-orange px-3 py-2 text-xs font-bold text-white">
                            Verify pickup
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-green-700">Collected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
