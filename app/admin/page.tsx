'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Order = { id: string; orderNumber: string; status: string; paymentStatus: string; total: number; customer: { name: string | null; phone: string } };
type Summary = { totalSales: number; ordersToday: number; readyPickup: number; pendingPayments: number };

export default function AdminDashboard() {
  const [key, setKey] = useState('');
  const [summary, setSummary] = useState<Summary>({ totalSales: 0, ordersToday: 0, readyPickup: 0, pendingPayments: 0 });
  const [orders, setOrders] = useState<Order[]>([]);
  const [otpInput, setOtpInput] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('Enter the owner API key configured in the server environment to load private shop data.');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    try {
      const response = await fetch('/api/reports', { headers: { Authorization: `Bearer ${key}` }, cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load reports.');
      setSummary(data.summary);
      setOrders(data.orders);
      setMessage('');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load reports.'); }
    finally { setLoading(false); }
  }, [key]);

  useEffect(() => { if (key) void load(); }, [key, load]);

  const orderAction = async (order: Order, action: 'mark-ready' | 'verify-pickup') => {
    const response = await fetch('/api/orders/admin', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ action, orderId: order.id, otp: otpInput[order.id] }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message || 'Order action failed.'); return; }
    if (data.demoPickupCode) setMessage(`Development-only pickup code for ${order.orderNumber}: ${data.demoPickupCode}. Configure SMS delivery before launch.`);
    else setMessage(action === 'verify-pickup' ? `${order.orderNumber} collected.` : `${order.orderNumber} marked ready.`);
    await load();
  };

  return <main className="min-h-screen bg-slate-100 px-5 py-8"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-wrap items-center justify-between rounded-2xl bg-white p-4 shadow-soft"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Owner dashboard</p><h1 className="mt-2 text-3xl font-black text-brand-blue">Shop overview</h1></div><Link href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Home</Link></header>
    <section className="mb-6 rounded-2xl bg-white p-5 shadow-soft"><label className="block text-sm font-semibold">Owner API key<input type="password" autoComplete="current-password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Set ADMIN_API_KEY on the server" className="mt-2 block w-full max-w-xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-3" /></label><p className="mt-2 text-xs text-slate-500">This temporary owner gate is not a substitute for a full owner login/session system.</p></section>
    <div className="grid gap-4 md:grid-cols-4">{[['Today sales', `₹${summary.totalSales}`], ['Orders today', String(summary.ordersToday)], ['Ready for pickup', String(summary.readyPickup)], ['Pending payments', `₹${summary.pendingPayments}`]].map(([label, value]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-soft"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-black text-brand-blue">{value}</p></div>)}</div>
    <div className="mt-8 rounded-2xl bg-white p-5 shadow-soft"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black text-brand-blue">Order management</h2><button onClick={() => void load()} disabled={!key || loading} className="rounded-lg bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{loading ? 'Loading…' : 'Refresh'}</button></div>
      {message && <p className="mb-4 rounded-xl bg-orange/10 p-3 text-sm text-brand-blue">{message}</p>}
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-500">{['Order / Customer', 'Status', 'Payment', 'Amount', 'Action'].map((title) => <th key={title} className="py-3 pr-4 font-semibold">{title}</th>)}</tr></thead><tbody>
        {orders.map((order) => <tr key={order.id} className="border-b border-slate-100"><td className="py-3 pr-4"><b className="block text-brand-blue">{order.orderNumber}</b><span>{order.customer.name || 'Customer'} · {order.customer.phone}</span></td><td className="py-3 pr-4">{order.status.replaceAll('_', ' ')}</td><td className="py-3 pr-4">{order.paymentStatus}</td><td className="py-3 pr-4">₹{order.total}</td><td className="py-3 pr-4">{order.status === 'READY_FOR_PICKUP' ? <div className="flex min-w-32 flex-col gap-2"><input value={otpInput[order.id] || ''} maxLength={6} onChange={(e) => setOtpInput((prev) => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '') }))} className="rounded-lg border border-slate-200 px-2 py-2" placeholder="6-digit code"/><button onClick={() => void orderAction(order, 'verify-pickup')} className="rounded-lg bg-orange px-3 py-2 text-xs font-bold text-white">Verify collection</button></div> : ['COLLECTED', 'CANCELLED', 'REFUNDED'].includes(order.status) ? <span className="text-xs font-bold text-green-700">Closed</span> : <button disabled={!key} onClick={() => void orderAction(order, 'mark-ready')} className="rounded-lg bg-brand-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Mark ready</button>}</td></tr>)}
        {orders.length === 0 && <tr><td className="py-6 text-slate-500" colSpan={5}>{key && !loading ? 'No orders found.' : 'Authorize with the owner API key to view orders.'}</td></tr>}
      </tbody></table></div>
    </div>
  </div></main>;
}
