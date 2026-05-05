import { Star } from "lucide-react";
import { useLocale } from "next-intl";

import { LandingReveal } from "../widgets/landing-reveal";

const TESTIMONIALS = {
  es: [
    {
      name: "Carolina M.",
      business: "Sabores de Casa",
      text: "Antes perdía pedidos por WhatsApp. Ahora cada orden queda registrada, mis clientes piden solos y yo solo preparo. Fue un cambio total.",
      avatar: "CM",
      color: "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-300/30",
    },
    {
      name: "Diego R.",
      business: "MiniMarket Express",
      text: "Tenemos 2 sucursales y cada una maneja su inventario. Antes usábamos Excel y se nos olvidaba actualizar. Esto nos ahorró horas a la semana.",
      avatar: "DR",
      color: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/30",
    },
    {
      name: "Valentina S.",
      business: "V&S Café",
      text: "Lo que más me gustó es que mis clientes ven el menú bonito desde su celular. Las fotos, los precios, todo ordenado. Ya no mando PDFs por WhatsApp.",
      avatar: "VS",
      color: "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30",
    },
  ],
  en: [
    {
      name: "Carolina M.",
      business: "Sabores de Casa",
      text: "Before, I missed orders on WhatsApp. Now every order is recorded, customers order by themselves and I just prepare. A complete change.",
      avatar: "CM",
      color: "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-300/30",
    },
    {
      name: "Diego R.",
      business: "MiniMarket Express",
      text: "We have 2 branches and each one manages its inventory. We used Excel before and often forgot to update it. This saved us hours every week.",
      avatar: "DR",
      color: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/30",
    },
    {
      name: "Valentina S.",
      business: "V&S Cafe",
      text: "What I liked most is that customers can see a beautiful menu on mobile. Photos, prices, everything organized. I no longer send PDFs on WhatsApp.",
      avatar: "VS",
      color: "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30",
    },
  ],
  pt: [
    {
      name: "Carolina M.",
      business: "Sabores de Casa",
      text: "Antes eu perdia pedidos no WhatsApp. Agora cada pedido fica registrado, meus clientes pedem sozinhos e eu so preparo. Mudou tudo.",
      avatar: "CM",
      color: "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-300/30",
    },
    {
      name: "Diego R.",
      business: "MiniMarket Express",
      text: "Temos 2 filiais e cada uma controla seu estoque. Antes usavamos Excel e esqueciamo-nos de atualizar. Isso nos economizou horas por semana.",
      avatar: "DR",
      color: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/30",
    },
    {
      name: "Valentina S.",
      business: "V&S Cafe",
      text: "O que mais gostei foi que meus clientes veem um menu bonito no celular. Fotos, precos, tudo organizado. Nao envio mais PDFs no WhatsApp.",
      avatar: "VS",
      color: "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30",
    },
  ],
  fr: [
    {
      name: "Carolina M.",
      business: "Sabores de Casa",
      text: "Avant, je perdais des commandes sur WhatsApp. Maintenant, chaque commande est enregistree, mes clients commandent seuls et je prepare seulement. Changement total.",
      avatar: "CM",
      color: "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-300/30",
    },
    {
      name: "Diego R.",
      business: "MiniMarket Express",
      text: "Nous avons 2 succursales et chacune gere son stock. Avant, nous utilisions Excel et oubliions de mettre a jour. Cela nous a fait gagner des heures chaque semaine.",
      avatar: "DR",
      color: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/30",
    },
    {
      name: "Valentina S.",
      business: "V&S Cafe",
      text: "Ce que j'ai prefere, c'est que mes clients voient un menu clair sur mobile. Photos, prix, tout est organise. Je n'envoie plus de PDF sur WhatsApp.",
      avatar: "VS",
      color: "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30",
    },
  ],
  de: [
    {
      name: "Carolina M.",
      business: "Sabores de Casa",
      text: "Fruher habe ich Bestellungen auf WhatsApp verloren. Jetzt wird jede Bestellung erfasst, Kunden bestellen selbst und ich bereite nur zu. Ein kompletter Wandel.",
      avatar: "CM",
      color: "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-300/30",
    },
    {
      name: "Diego R.",
      business: "MiniMarket Express",
      text: "Wir haben 2 Filialen und jede verwaltet ihren Bestand. Fruher nutzten wir Excel und vergassen Updates. Das spart uns jede Woche Stunden.",
      avatar: "DR",
      color: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/30",
    },
    {
      name: "Valentina S.",
      business: "V&S Cafe",
      text: "Am besten fand ich, dass Kunden ein schones Menu auf dem Handy sehen. Fotos, Preise, alles geordnet. Ich sende keine PDFs mehr uber WhatsApp.",
      avatar: "VS",
      color: "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30",
    },
  ],
  it: [
    {
      name: "Carolina M.",
      business: "Sabores de Casa",
      text: "Prima perdevo ordini su WhatsApp. Ora ogni ordine resta registrato, i clienti ordinano da soli e io preparo soltanto. Un cambiamento totale.",
      avatar: "CM",
      color: "bg-indigo-500/20 text-indigo-100 ring-1 ring-indigo-300/30",
    },
    {
      name: "Diego R.",
      business: "MiniMarket Express",
      text: "Abbiamo 2 filiali e ognuna gestisce il proprio inventario. Prima usavamo Excel e dimenticavamo di aggiornare. Ci ha fatto risparmiare ore ogni settimana.",
      avatar: "DR",
      color: "bg-violet-500/20 text-violet-100 ring-1 ring-violet-300/30",
    },
    {
      name: "Valentina S.",
      business: "V&S Cafe",
      text: "La cosa che mi e piaciuta di piu e che i clienti vedono un menu curato da mobile. Foto, prezzi, tutto ordinato. Non invio piu PDF su WhatsApp.",
      avatar: "VS",
      color: "bg-blue-500/20 text-blue-100 ring-1 ring-blue-300/30",
    },
  ],
} as const;

type SupportedLocale = keyof typeof TESTIMONIALS;

function getLocaleKey(locale: string): SupportedLocale {
  const code = locale.toLowerCase().split("-")[0];
  return (code in TESTIMONIALS ? (code as SupportedLocale) : "en");
}

export function LandingTestimonials() {
  const locale = useLocale();
  const testimonials = TESTIMONIALS[getLocaleKey(locale)];
  return (
    <div className="mt-10 grid gap-4 sm:mt-14 sm:gap-6 md:grid-cols-3">
      {testimonials.map((t, i) => (
        <LandingReveal key={t.name} delay={i * 0.1}>
          <div className="flex h-full flex-col rounded-2xl border border-indigo-300/20 bg-slate-950/45 p-5 shadow-[0_20px_60px_-34px_rgba(0,0,0,0.85)] backdrop-blur-md transition hover:-translate-y-1 hover:border-indigo-300/30 sm:p-6">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, si) => (
                <Star key={si} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
              ))}
            </div>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-indigo-100/75">
              &ldquo;{t.text}&rdquo;
            </p>
            <div className="mt-5 flex items-center gap-3 border-t border-indigo-300/15 pt-4">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${t.color}`}>
                {t.avatar}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-indigo-200/65">{t.business}</p>
              </div>
            </div>
          </div>
        </LandingReveal>
      ))}
    </div>
  );
}
