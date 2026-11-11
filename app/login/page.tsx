'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [phone, setPhone] = useState('9876543210');
  const [otp, setOtp] = useState('');
  const [sent, setSent] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('123456');
  const [message, setMessage] = useState('');

  const requestOtp = () => {
    const code = '123456';
    setGeneratedOtp(code);
    setSent(true);
    setMessage(`Demo OTP sent to ${phone}. Use ${code} to continue.`);
  };

  const verifyOtp = () => {
    if (otp === generatedOtp) {
      localStorage.setItem('copycat_session', JSON.stringify({ phone, role: 'customer' }));
      setMessage('OTP verified. Redirecting to customer portal...');
      window.location.href = '/customer';
      return;
    }
    setMessage('Invalid OTP. Use the demo OTP shown after you request it.');
  };

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-soft">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange">Copycat Copiers</p>
            <h1 className="mt-2 text-3xl font-black text-brand-blue">Customer login</h1>
          </div>
          <Link href="/" className="text-sm font-semibold text-slate-600">Home</Link>
        </div>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Mobile number
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-0"
              placeholder="Enter your mobile number"
            />
          </label>

          <button
            onClick={requestOtp}
            className="w-full rounded-xl bg-brand-blue px-4 py-3 font-bold text-white"
          >
            Send OTP
          </button>

          {sent && (
            <label className="block text-sm font-medium text-slate-700">
              Enter OTP
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none ring-0"
                placeholder="123456"
              />
            </label>
          )}

          {sent && (
            <button
              onClick={verifyOtp}
              className="w-full rounded-xl bg-orange px-4 py-3 font-bold text-white"
            >
              Verify and continue
            </button>
          )}

          <Link href="/admin" className="block text-center text-sm font-semibold text-brand-blue">
            Continue as owner/admin
          </Link>

          {message && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        </div>
      </div>
    </main>
  );
}
