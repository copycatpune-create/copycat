'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ShoppingCart, Upload, CheckCircle2 } from 'lucide-react';

type CatalogItem = { id: string; name: string; type: 'service' | 'product'; category: string; price: number; description: string; stock?: number };
export default function CustomerDashboard() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH_AT_SHOP');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { fetch('/api/catalog').then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((data) => setItems([...data.services, ...data.products])).catch(() => setCheckoutMessage('Unable to load catalog. Please try again later.')); }, []);
  const cartItems = useMemo(() => items.filter((item) => cart[item.id]).map((item) => ({ ...item, quantity: cart[item.id] || 0 })), [cart, items]);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const changeQuantity = (id: string, delta: number) => setCart((prev) => { const quantity = (prev[id] || 0) + delta; if (quantity <= 0) { const next = { ...prev }; delete next[id]; return next; } return { ...prev, [id]: quantity }; });
  const checkout = async () => {
    if (!customerName.trim() || !customerPhone.trim()) { setCheckoutMessage('Enter your name and mobile number to place an order.'); return; }
    if (!cartItems.length) { setCheckoutMessage('Your cart is empty. Add a service or product first.'); return; }
    setBusy(true); setCheckoutMessage('');
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName, customerPhone, paymentMode: paymentMethod, items: cartItems.map(({ id, type, quantity }) => ({ id, type, quantity })) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Checkout failed.');
      setCheckoutMessage(`${result.message} Order ID: ${result.order.orderNumber}. Amount: ₹${result.order.total}.`);
      setCart({});
    } catch (error) { setCheckoutMessage(error instanceof Error ? error.message : 'Checkout failed.'); }
    finally { setBusy(false); }
  };
  const serviceItems = items.filter((item) => item.type === 'service');
  const productItems = items.filter((item) => item.type === 'product');
  const card = (item: CatalogItem, accent = false) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-orange">{item.category}</p><h3 className="mt-1 text-lg font-black text-brand-blue">{item.name}</h3></div><span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-bold text-brand-blue">₹{item.price}</span></div><p className="mt-2 text-sm text-slate-600">{item.description}</p>{item.stock !== undefined && <p className="mt-2 text-xs text-slate-500">{item.stock} in stock</p>}<button onClick={() => changeQuantity(item.id, 1)} className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white ${accent ? 'bg-orange' : 'bg-brand-blue'}`}>Add to cart</button></article>;
  return <main className="min-h-screen bg-slate-100 px-5 py-8"><div className="mx-auto max-w-7xl"><header className="mb-6 flex flex-wrap items-center justify-between rounded-2xl bg-white p-4 shadow-soft"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Customer portal</p><h1 className="mt-2 text-3xl font-black text-brand-blue">COPYCAT COPIERS</h1></div><Link href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Home</Link></header><div className="grid gap-6 xl:grid-cols-[1.4fr_.6fr]"><section className="space-y-6"><div className="rounded-2xl bg-brand-blue p-5 text-white shadow-soft"><p className="text-xs uppercase tracking-[.2em] text-slate-200">Print & stationery</p><h2 className="mt-2 text-2xl font-black">Order online. Collect in-store.</h2><div className="mt-4 flex items-center gap-2 text-sm"><Upload size={17}/> Shop collection only — no delivery available.</div></div><div className="rounded-2xl bg-white p-5 shadow-soft"><h2 className="mb-4 text-xl font-black text-brand-blue">Printing services</h2><div className="grid gap-4 md:grid-cols-2">{serviceItems.map((item) => card(item))}</div></div><div className="rounded-2xl bg-white p-5 shadow-soft"><h2 className="mb-4 text-xl font-black text-brand-blue">Stationery</h2><div className="grid gap-4 md:grid-cols-2">{productItems.map((item) => card(item, true))}</div></div></section>
  <aside className="h-fit rounded-2xl bg-white p-5 shadow-soft"><div className="flex items-center justify-between"><h2 className="text-xl font-black text-brand-blue">Your cart</h2><span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-bold">{cartItems.reduce((sum, item) => sum + item.quantity, 0)} items</span></div><div className="mt-5 space-y-3">{cartItems.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-slate-500">No items added yet.</p> : cartItems.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><b>{item.name}</b><p className="text-xs text-slate-500">₹{item.price} each</p></div><div className="flex items-center gap-2"><button onClick={() => changeQuantity(item.id, -1)} className="h-8 w-8 rounded-full bg-slate-100">−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(item.id, 1)} className="h-8 w-8 rounded-full bg-slate-100">+</button></div></div>)}</div><div className="mt-5 flex justify-between border-t pt-4"><b>Total</b><b className="text-xl">₹{subtotal.toFixed(2)}</b></div><div className="mt-5 space-y-3"><input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" className="w-full rounded-xl border px-3 py-3"/><input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} inputMode="tel" placeholder="Mobile number" className="w-full rounded-xl border px-3 py-3"/><label className="block text-sm font-semibold">Payment choice<select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-2 w-full rounded-xl border bg-slate-50 px-3 py-3"><option value="CASH_AT_SHOP">Cash at shop</option><option value="UPI">UPI (gateway setup required)</option><option value="CARD">Card (gateway setup required)</option><option value="NET_BANKING">Net banking (gateway setup required)</option></select></label><button disabled={busy || cartItems.length === 0} onClick={() => void checkout()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 font-bold text-white disabled:opacity-50"><ShoppingCart size={18}/>{busy ? 'Placing order…' : 'Place order'}</button></div>{checkoutMessage && <div className="mt-4 flex items-start gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-800"><CheckCircle2 className="mt-0.5 shrink-0" size={16}/><span>{checkoutMessage}</span></div>}<p className="mt-4 text-xs text-slate-500">Online payments remain pending until a server-verified payment gateway is connected. Never send payment screenshots as proof.</p></aside></div></div></main>;
}
