import Link from "next/link";
import { ArrowUpRight, FileUp, Printer, ShoppingBag, MapPin, Clock3, ShieldCheck, Menu } from "lucide-react";

const services = [
  { icon: Printer, title: "Document printing", detail: "B&W, colour, single or double-sided", price: "From ₹2/page" },
  { icon: FileUp, title: "Xerox & scanning", detail: "Clear copies and digital scans", price: "Quick turnaround" },
  { icon: ShoppingBag, title: "Stationery store", detail: "Everyday school and office essentials", price: "Shop in one place" },
];
const steps = ["Upload your files", "Choose print options", "Pay securely", "Collect at our shop"];

export default function HomePage() {
  return <main className="min-h-screen">
    <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <Link href="/" className="flex items-center gap-3" aria-label="COPYCAT COPIERS home">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-sm font-black text-white">CC</span>
        <span><b className="block text-sm tracking-[.13em]">COPYCAT COPIERS</b><small className="text-slate-500">Print · Paper · Possibilities</small></span>
      </Link>
      <nav className="hidden items-center gap-8 text-sm font-semibold md:flex"><a href="#services">Services</a><a href="#how">How it works</a><a href="#visit">Visit us</a></nav>
      <div className="flex items-center gap-3"><Link className="hidden rounded-full px-4 py-2 text-sm font-semibold sm:inline-flex" href="/admin">Owner login</Link><Link className="rounded-full bg-orange px-5 py-3 text-sm font-bold text-white shadow-card" href="/customer">Start an order <ArrowUpRight className="ml-1 inline" size={16}/></Link><Menu className="md:hidden" size={20}/></div>
    </header>
    <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-8 lg:pt-16">
      <div><span className="inline-flex items-center gap-2 rounded-full border border-orange/20 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-orange"><span className="h-2 w-2 rounded-full bg-orange"/> Your neighbourhood print shop</span>
        <h1 className="mt-7 max-w-2xl text-5xl font-black leading-[1.06] tracking-tight sm:text-6xl">Good ideas deserve <span className="text-orange">great prints.</span></h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">Order prints and stationery online, then pick everything up from our shop. Simple, convenient, and always handled with care.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/customer" className="rounded-full bg-ink px-6 py-3.5 text-sm font-bold text-white">Upload & order <ArrowUpRight className="ml-2 inline" size={16}/></Link><a href="#services" className="rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-bold">Explore services</a></div>
        <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-slate-600"><span className="flex items-center gap-2"><ShieldCheck size={17} className="text-orange"/> Secure order updates</span><span className="flex items-center gap-2"><MapPin size={17} className="text-orange"/> Shop pickup only</span></div>
      </div>
      <div className="relative"><div className="absolute -right-4 -top-5 h-28 w-28 rounded-full bg-orange/10"/><div className="relative overflow-hidden rounded-[2rem] bg-ink p-7 text-white shadow-card sm:p-10">
        <div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide">YOUR PRINT, YOUR WAY</span><Printer size={22}/></div>
        <div className="my-9 rounded-2xl bg-white p-6 text-ink shadow-lg sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-slate-400">Print order</p><p className="mt-2 text-2xl font-black">Ready when you are.</p></div><div className="grid h-12 w-12 place-items-center rounded-xl bg-orange/10 text-orange"><FileUp/></div></div><div className="mt-8 space-y-3"><div className="h-2 rounded bg-slate-100"/><div className="h-2 w-4/5 rounded bg-slate-100"/><div className="h-2 w-3/5 rounded bg-slate-100"/></div><div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-4 text-sm"><span className="text-slate-500">Collect in store</span><b className="text-orange">Easy pickup ↗</b></div></div>
        <div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-white/10 p-4"><Clock3 className="mb-3 text-orange" size={18}/><b>Quick service</b><p className="mt-1 text-xs text-white/60">Made with care</p></div><div className="rounded-xl bg-white/10 p-4"><MapPin className="mb-3 text-orange" size={18}/><b>Local pickup</b><p className="mt-1 text-xs text-white/60">Visit our shop</p></div></div>
      </div></div>
    </section>
    <section id="services" className="bg-white py-16"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-orange">What we do</p><h2 className="mt-2 text-3xl font-black">All your print essentials.</h2></div><Link href="/customer" className="text-sm font-bold text-orange">Browse all services ↗</Link></div><div className="grid gap-4 md:grid-cols-3">{services.map(({icon: Icon,title,detail,price},i)=><article key={title} className="rounded-2xl border border-slate-100 bg-cream p-6"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-orange"><Icon size={22}/></span><span className="text-xs font-bold text-slate-400">0{i+1}</span></div><h3 className="mt-6 text-lg font-black">{title}</h3><p className="mt-2 text-sm text-slate-600">{detail}</p><p className="mt-5 text-sm font-bold text-orange">{price}</p></article>)}</div></div></section>
    <section id="how" className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><p className="text-xs font-bold uppercase tracking-[.2em] text-orange">Simple from start to finish</p><h2 className="mt-2 text-3xl font-black">Four steps. Zero delivery guesswork.</h2><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{steps.map((s,i)=><div className="flex gap-4 rounded-2xl bg-white p-5" key={s}><b className="text-xl text-orange">0{i+1}</b><span className="font-bold">{s}</span></div>)}</div></section>
    <footer id="visit" className="bg-ink py-10 text-white"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 sm:flex-row sm:items-center lg:px-8"><div><b className="tracking-[.13em]">COPYCAT COPIERS</b><p className="mt-2 text-sm text-white/60">Printing and stationery, made easy.</p></div><p className="flex items-center gap-2 text-sm text-white/80"><MapPin size={16} className="text-orange"/> Visit our shop to collect your order.</p></div></footer>
  </main>;
}
