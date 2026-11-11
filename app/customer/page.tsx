'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShoppingCart, Trash2, Upload, CheckCircle2 } from 'lucide-react';

type CatalogItem = {
  id: string;
  name: string;
  type: 'service' | 'product';
  category: string;
  price: number;
  description: string;
};

export default function CustomerDashboard() {
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');

  useEffect(() => {
    fetch('/api/catalog')
      .then((res) => res.json())
      .then((data) => {
        setServices([...data.services, ...data.products]);
      })
      .catch(() => {
        setServices([]);
      });
  }, []);

  const cartItems = useMemo(
    () =>
      services
        .filter((item) => cart[item.id])
        .map((item) => ({ ...item, quantity: cart[item.id] || 0 })),
    [cart, services]
  );

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (item: CatalogItem) => {
    setCart((prev) => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }));
  };

  const changeQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      const nextQty = (prev[id] || 0) + delta;
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: nextQty };
    });
  };

  const checkout = async () => {
    if (cartItems.length === 0) {
      setCheckoutMessage('Your cart is empty. Add a service or product first.');
      return;
    }

    const payload = {
      customerName: 'Demo Customer',
      customerPhone: '9876543210',
      paymentMode: paymentMethod,
      items: cartItems.map((item) => ({
        id: item.id,
        type: item.type,
        quantity: item.quantity,
        unitPrice: item.price,
      })),
    };

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.ok) {
      setCheckoutMessage(result.message || 'Checkout failed.');
      return;
    }

    setCheckoutMessage(`Order ${result.order.orderNumber} created successfully. Payment status: ${result.order.paymentStatus}.`);
    setCart({});
  };

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between rounded-2xl bg-white p-4 shadow-soft">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Customer portal</p>
            <h1 className="mt-2 text-3xl font-black text-brand-blue">Copycat Copiers</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-semibold text-slate-600">Login</Link>
            <Link href="/" className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
              Home
            </Link>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <section className="space-y-6">
            <div className="rounded-2xl bg-brand-blue p-5 text-white shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-200">Print & stationery</p>
                  <h2 className="mt-2 text-2xl font-black">Order online. Collect in-store.</h2>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <Upload size={20} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black text-brand-blue">Services</h3>
                <span className="text-sm text-slate-500">Printing & finishing</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {services.filter((item) => item.type === 'service').map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-orange">{item.category}</p>
                        <h4 className="mt-1 text-lg font-black text-brand-blue">{item.name}</h4>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-bold text-brand-blue">
                        ₹{item.price}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    <button
                      onClick={() => addToCart(item)}
                      className="mt-4 w-full rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-black text-brand-blue">Stationery</h3>
                <span className="text-sm text-slate-500">Paper, files & office essentials</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {services.filter((item) => item.type === 'product').map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-orange">{item.category}</p>
                        <h4 className="mt-1 text-lg font-black text-brand-blue">{item.name}</h4>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-bold text-brand-blue">
                        ₹{item.price}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    <button
                      onClick={() => addToCart(item)}
                      className="mt-4 w-full rounded-xl bg-orange px-4 py-2.5 text-sm font-bold text-white"
                    >
                      Add to cart
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="rounded-2xl bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-brand-blue">Your cart</h3>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-bold text-brand-blue">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {cartItems.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No items added yet.
                </div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-brand-blue">{item.name}</p>
                        <p className="text-xs text-slate-500">₹{item.price} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => changeQuantity(item.id, -1)} className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold">-</button>
                        <span className="w-7 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => changeQuantity(item.id, 1)} className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold">+</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <strong className="text-brand-blue">₹{subtotal}</strong>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>Pickup</span>
                <strong>Free</strong>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="font-bold text-brand-blue">Total</span>
                <span className="text-2xl font-black text-brand-blue">₹{subtotal}</span>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-sm font-medium text-slate-700">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
              >
                <option value="UPI">UPI / GPay / PhonePe</option>
                <option value="CARD">Debit card / Credit card</option>
                <option value="NET_BANKING">Net banking</option>
                <option value="CASH_AT_SHOP">Cash at shop</option>
              </select>
            </div>

            <button onClick={checkout} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-4 py-3 font-bold text-white">
              <ShoppingCart size={18} />
              Checkout
            </button>

            {checkoutMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-sm text-green-700">
                <CheckCircle2 size={16} />
                <span>{checkoutMessage}</span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
