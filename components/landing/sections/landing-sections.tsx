import Link from "next/link";
import "../landing.css";
import {
  ArrowRight,
  Check,
  Clock,
  CreditCard,
  Globe,
  Headphones,
  Mail,
  MessageCircle,
  Minus,
  Plus,
  Shield,
  Sparkles,
  X,
} from "lucide-react";

import type { LandingMediaBundle } from "@/lib/landing/landing-media-types";
import { popularPlanIndex, type PublicPlanForLanding } from "@/lib/plans/public-plans";
import type { Continent, CountryCode } from "@/lib/geo/landing-geo-plans";
import { getContinentFromCountry } from "@/lib/geo/landing-geo-plans";
import { cn } from "@/utils/cn";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { LandingReveal } from "../widgets/landing-reveal";
import { LandingFeatureBlock } from "./landing-feature-block";
import { LandingTestimonials } from "./landing-testimonials";
import { LaptopFrame, PhoneFrame } from "../widgets/landing-device-frame";
import { LandingFeatureShot } from "./landing-feature-shot";
import { LandingAnimatedGrid } from "../widgets/landing-animated-grid";
import { LandingPhoneCarousel } from "../media/landing-phone-carousel";
import { LandingContactForm } from "../forms/landing-contact-form";
import { LandingLeadForm } from "../forms/landing-lead-form";
import { LandingVideoPlayer } from "../widgets/landing-video-player";

function getPriceForContinent(plan: PublicPlanForLanding, continent: Continent): { price: number; currency: string } {
  if (plan.pricesByContinent?.[continent]) {
    return plan.pricesByContinent[continent];
  }
  
  // Fallback a Latinoamérica (default para compatibilidad)
  if (plan.pricesByContinent?.['Latinoamérica']) {
    return plan.pricesByContinent['Latinoamérica'];
  }
  
  // Intenta cualquier continente disponible como último recurso
  const availableContinents = Object.keys(plan.pricesByContinent || {});
  if (availableContinents.length > 0) {
    return plan.pricesByContinent[availableContinents[0]];
  }
  
  // Esto no debería suceder si los datos están correctos
  return {
    price: 0,
    currency: "USD",
  };
}

function formatPrice(price: number, currency: string): string {
  const locales: Record<string, string> = {
    CLP: "es-CL",
    VES: "es-VE",
    USD: "en-US",
    MXN: "es-MX",
    ARS: "es-AR",
  };

  const formatter = new Intl.NumberFormat(locales[currency] || "es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CLP" || currency === "VES" ? 0 : 2,
  });

  return formatter.format(price);
}

function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "hola@godcode.me";
}

type SupportedLocale = "es" | "en" | "pt" | "fr" | "de" | "it";

const LANDING_TX: Partial<Record<string, Record<Exclude<SupportedLocale, "es" | "en">, string>>> = {
  "Regístrate": { pt: "Cadastre-se", fr: "Inscrivez-vous", de: "Registriere dich", it: "Registrati" },
  "¿No sé nada de tecnología, puedo usarlo?": { pt: "Nao sei nada de tecnologia, posso usar?", fr: "Je ne suis pas technique, puis-je l'utiliser ?", de: "Ich bin nicht technisch, kann ich es nutzen?", it: "Non sono tecnico, posso usarlo?" },
  "Sí. No necesitas programar ni saber de servidores. Te registras, subes tus productos y tu tienda está lista. Si tienes dudas, nuestro soporte te guía.": { pt: "Sim. Voce nao precisa programar nem saber de servidores. Cadastre-se, suba seus produtos e sua loja fica pronta.", fr: "Oui. Vous n'avez pas besoin de coder ni de gerer des serveurs. Inscrivez-vous et votre boutique est prete.", de: "Ja. Du brauchst weder Programmierung noch Serverwissen. Registriere dich und dein Shop ist bereit.", it: "Si. Non devi programmare ne gestire server. Ti registri, carichi i prodotti e il negozio e pronto." },
  "¿Cuánto cuesta realmente?": { pt: "Quanto custa de verdade?", fr: "Combien cela coute vraiment ?", de: "Was kostet es wirklich?", it: "Quanto costa davvero?" },
  "Los precios están en la sección de planes arriba. No hay costos ocultos, comisiones por venta ni cargos sorpresa.": { pt: "Os precos estao na secao de planos acima. Nao ha custos ocultos nem taxas surpresa.", fr: "Les prix sont dans la section des plans ci-dessus. Aucun cout cache ni surprise.", de: "Die Preise stehen oben im Planbereich. Keine versteckten Kosten oder Uberraschungen.", it: "I prezzi sono nella sezione piani qui sopra. Nessun costo nascosto o sorpresa." },
  "¿Puedo cancelar cuando quiera?": { pt: "Posso cancelar quando quiser?", fr: "Puis-je annuler quand je veux ?", de: "Kann ich jederzeit kundigen?", it: "Posso annullare quando voglio?" },
  "Sí. Sin penalidad, sin permanencia mínima. Si no te sirve, cancelas y listo.": { pt: "Sim. Sem multa e sem fidelidade minima. Se nao servir, cancele e pronto.", fr: "Oui. Sans penalite ni engagement minimum. Si cela ne convient pas, vous annulez.", de: "Ja. Ohne Strafe und ohne Mindestlaufzeit. Wenn es nicht passt, kundigst du einfach.", it: "Si. Senza penali ne permanenza minima. Se non ti serve, annulli e basta." },
  "¿Mis datos están seguros?": { pt: "Meus dados estao seguros?", fr: "Mes donnees sont-elles securisees ?", de: "Sind meine Daten sicher?", it: "I miei dati sono al sicuro?" },
  "Usamos encriptación SSL, servidores protegidos y cada negocio tiene sus datos completamente aislados. Nadie más puede ver tu información.": { pt: "Usamos criptografia SSL e servidores protegidos. Cada negocio tem dados isolados.", fr: "Nous utilisons le chiffrement SSL et des serveurs proteges. Chaque entreprise a ses donnees isolees.", de: "Wir nutzen SSL-Verschlusselung und geschutzte Server. Jede Firma hat isolierte Daten.", it: "Usiamo crittografia SSL e server protetti. Ogni attivita ha dati completamente isolati." },
  "¿Cuánto tardo en tener mi tienda lista?": { pt: "Quanto tempo levo para ter minha loja pronta?", fr: "Combien de temps pour avoir ma boutique prete ?", de: "Wie lange bis mein Shop bereit ist?", it: "Quanto tempo ci vuole per avere il negozio pronto?" },
  "Si ya tienes tus productos y fotos, menos de 1 hora. El proceso de registro toma 5 minutos.": { pt: "Se voce ja tem produtos e fotos, menos de 1 hora. O cadastro leva 5 minutos.", fr: "Si vous avez deja vos produits et photos, moins d'une heure. L'inscription prend 5 minutes.", de: "Wenn du Produkte und Fotos hast, weniger als 1 Stunde. Die Registrierung dauert 5 Minuten.", it: "Se hai gia prodotti e foto, meno di 1 ora. La registrazione richiede 5 minuti." },
  "¿Puedo tener varias sucursales?": { pt: "Posso ter varias filiais?", fr: "Puis-je avoir plusieurs succursales ?", de: "Kann ich mehrere Filialen haben?", it: "Posso avere piu filiali?" },
  "Sí. Cada sucursal tiene su propio inventario, precios, zona de delivery y horarios.": { pt: "Sim. Cada filial tem seu proprio estoque, precos, area de delivery e horarios.", fr: "Oui. Chaque succursale a son inventaire, ses prix, sa zone de livraison et ses horaires.", de: "Ja. Jede Filiale hat eigenes Inventar, Preise, Liefergebiet und Offnungszeiten.", it: "Si. Ogni filiale ha inventario, prezzi, zona delivery e orari propri." },
  "Ver el producto": { pt: "Ver o produto", fr: "Voir le produit", de: "Das Produkt sehen", it: "Vedere il prodotto" },
  "Tu tienda lista en": { pt: "Sua loja pronta em", fr: "Votre boutique prete en", de: "Dein Shop bereit in", it: "Il tuo negozio pronto in" },
  "No necesitas saber de tecnología. Si puedes subir una foto a Instagram, puedes tener tu tienda funcionando hoy.": { pt: "Voce nao precisa saber de tecnologia. Se consegue subir uma foto no Instagram, consegue ter sua loja funcionando hoje.", fr: "Vous n'avez pas besoin de connaitre la technologie. Si vous pouvez publier une photo sur Instagram, vous pouvez avoir votre boutique operationnelle aujourd'hui.", de: "Du musst keine Ahnung von Technik haben. Wenn du ein Foto auf Instagram hochladen kannst, kannst du deinen Shop heute starten.", it: "Non devi sapere di tecnologia. Se riesci a caricare una foto su Instagram, puoi avere il tuo negozio attivo oggi." },
  "No todas las formas de vender online cuestan lo mismo. Compara el costo real: tiempo, comisión y control de cada opción.": { pt: "Nem todas as formas de vender online custam o mesmo. Compare o custo real: tempo, comissao e controle de cada opcao.", fr: "Toutes les facons de vendre en ligne ne coutent pas la meme chose. Comparez le cout reel: temps, commission et controle de chaque option.", de: "Nicht alle Online-Verkaufswege kosten dasselbe. Vergleiche die echten Kosten: Zeit, Provision und Kontrolle jeder Option.", it: "Non tutti i modi di vendere online costano uguale. Confronta il costo reale: tempo, commissione e controllo di ogni opzione." },
  "Empieza hoy:": { pt: "Comece hoje:", fr: "Commencez aujourd'hui:", de: "Starte heute:", it: "Inizia oggi:" },
  "tu canal propio, sin comisiones": { pt: "seu canal proprio, sem comissoes", fr: "votre propre canal, sans commissions", de: "dein eigener Kanal, ohne Provisionen", it: "il tuo canale, senza commissioni" },
  "Crea tu cuenta con email. El primer mes es gratis.": { pt: "Crie sua conta com email. O primeiro mes e gratis.", fr: "Creez votre compte avec email. Le premier mois est gratuit.", de: "Erstelle dein Konto per E-Mail. Der erste Monat ist kostenlos.", it: "Crea il tuo account con email. Il primo mese e gratis." },
  "Arma tu tienda": { pt: "Monte sua loja", fr: "Creez votre boutique", de: "Baue deinen Shop", it: "Crea il tuo negozio" },
  "Sube productos, configura delivery y sucursales.": { pt: "Adicione produtos, configure delivery e filiais.", fr: "Ajoutez des produits, configurez la livraison et les succursales.", de: "Fuege Produkte hinzu und konfiguriere Lieferung und Filialen.", it: "Carica prodotti, configura delivery e filiali." },
  "Empieza a vender": { pt: "Comece a vender", fr: "Commencez a vendre", de: "Starte mit dem Verkauf", it: "Inizia a vendere" },
  "Comparte tu link y recibe pedidos desde el día 1.": { pt: "Compartilhe seu link e receba pedidos desde o dia 1.", fr: "Partagez votre lien et recevez des commandes des le jour 1.", de: "Teile deinen Link und erhalte Bestellungen ab Tag 1.", it: "Condividi il tuo link e ricevi ordini dal giorno 1." },
  "Comisión por venta": { pt: "Comissao por venda", fr: "Commission par vente", de: "Verkaufsprovision", it: "Commissione per vendita" },
  "No aplica": { pt: "Nao se aplica", fr: "N/A", de: "Nicht anwendbar", it: "N/D" },
  "Control de clientes": { pt: "Controle de clientes", fr: "Propriete des clients", de: "Kundenhoheit", it: "Controllo clienti" },
  "Tu propia marca": { pt: "Sua propria marca", fr: "Votre propre marque", de: "Deine eigene Marke", it: "Il tuo brand" },
  "Tiempo de setup": { pt: "Tempo de configuracao", fr: "Temps de mise en place", de: "Einrichtungszeit", it: "Tempo di setup" },
  "1 día": { pt: "1 dia", fr: "1 jour", de: "1 Tag", it: "1 giorno" },
  "1-2 sem.": { pt: "1-2 sem.", fr: "1-2 sem.", de: "1-2 Wo.", it: "1-2 sett." },
  "2-6 meses": { pt: "2-6 meses", fr: "2-6 mois", de: "2-6 Monate", it: "2-6 mesi" },
  "Costo mensual": { pt: "Custo mensal", fr: "Cout mensuel", de: "Monatliche Kosten", it: "Costo mensile" },
  "Gratis*": { pt: "Gratis*", fr: "Gratuit*", de: "Kostenlos*", it: "Gratis*" },
  "Desde $20": { pt: "A partir de $20", fr: "A partir de $20", de: "Ab $20", it: "Da $20" },
  "Inventario y caja": { pt: "Inventario e caixa", fr: "Inventaire et caisse", de: "Inventar und Kasse", it: "Inventario e cassa" },
  "Lanzamiento: beneficios para primeros negocios (cupos limitados)": { pt: "Lancamento: beneficios para os primeiros negocios (vagas limitadas)", fr: "Lancement: avantages pour les premieres entreprises (places limitees)", de: "Launch: Vorteile fur erste Unternehmen (begrenzte Platze)", it: "Lancio: vantaggi per le prime attivita (posti limitati)" },
  "Dejas de ganar dinero en cada pedido": { pt: "Voce perde dinheiro em cada pedido", fr: "Vous perdez de l'argent sur chaque commande", de: "Du verlierst Geld bei jeder Bestellung", it: "Perdi denaro su ogni ordine" },
  "que va por un marketplace.": { pt: "que passa por um marketplace.", fr: "qui passe par une marketplace.", de: "die uber einen Marktplatz geht.", it: "che passa per un marketplace." },
  "Los marketplaces se quedan con hasta el 30% de cada venta. Tus clientes compran en tu local, pero su historial y sus datos quedan en la plataforma de ellos.": { pt: "Os marketplaces ficam com ate 30% de cada venda. Seus clientes compram de voce, mas o historico e os dados ficam na plataforma deles.", fr: "Les marketplaces prennent jusqu'a 30% de chaque vente. Vos clients achetent chez vous, mais leur historique reste sur leur plateforme.", de: "Marktplatze behalten bis zu 30% jedes Verkaufs. Deine Kunden kaufen bei dir, aber ihre Daten bleiben auf deren Plattform.", it: "I marketplace trattengono fino al 30% di ogni vendita. I tuoi clienti comprano da te, ma i loro dati restano sulla loro piattaforma." },
  "GodCode te da tu propio canal de ventas: tu dominio, tus clientes, el 100% de tus ingresos.": { pt: "GodCode te da seu proprio canal de vendas: seu dominio, seus clientes, 100% da sua receita.", fr: "GodCode vous donne votre propre canal de vente: votre domaine, vos clients, 100% de vos revenus.", de: "GodCode gibt dir deinen eigenen Verkaufskanal: deine Domain, deine Kunden, 100% deiner Einnahmen.", it: "GodCode ti da il tuo canale di vendita: il tuo dominio, i tuoi clienti, il 100% dei tuoi ricavi." },
  ", sin programar.": { pt: ", sem programar.", fr: ", sans coder.", de: ", ohne Programmierung.", it: ", senza programmare." },
  "Empezar gratis": { pt: "Comecar gratis", fr: "Commencer gratuitement", de: "Kostenlos starten", it: "Inizia gratis" },
  "El primer mes es gratis · Cancela cuando quieras": { pt: "O primeiro mes e gratis · Cancele quando quiser", fr: "Le premier mois est gratuit · Resiliez quand vous voulez", de: "Der erste Monat ist kostenlos · Jederzeit kuendbar", it: "Il primo mese e gratis · Annulla quando vuoi" },
  "Descuento de lanzamiento sujeto a disponibilidad y validación de rubro.": { pt: "Desconto de lancamento sujeito a disponibilidade e validacao de segmento.", fr: "Remise de lancement soumise a disponibilite et validation du secteur.", de: "Launch-Rabatt je nach Verfugbarkeit und Branchenprufung.", it: "Sconto di lancio soggetto a disponibilita e validazione del settore." },
  "Datos protegidos": { pt: "Dados protegidos", fr: "Donnees protegees", de: "Geschutzte Daten", it: "Dati protetti" },
  "Pagos seguros": { pt: "Pagamentos seguros", fr: "Paiements securises", de: "Sichere Zahlungen", it: "Pagamenti sicuri" },
  "Tu dominio propio": { pt: "Seu proprio dominio", fr: "Votre propre domaine", de: "Deine eigene Domain", it: "Il tuo dominio" },
  "Múltiples métodos de pago": { pt: "Multiplos metodos de pagamento", fr: "Plusieurs moyens de paiement", de: "Mehrere Zahlungsmethoden", it: "Metodi di pagamento multipli" },
  "Cifrado SSL": { pt: "Criptografia SSL", fr: "Chiffrement SSL", de: "SSL-Verschlusselung", it: "Crittografia SSL" },
  "Soporte humano por email (<24h)": { pt: "Suporte humano por email (<24h)", fr: "Support humain par email (<24h)", de: "Menschlicher Support per E-Mail (<24h)", it: "Supporto umano via email (<24h)" },
  "Sin comisión": { pt: "Sem comissao", fr: "Sans commission", de: "Ohne Provision", it: "Senza commissioni" },
  "0% por venta en todos los planes": { pt: "0% por venda em todos os planos", fr: "0% par vente sur tous les plans", de: "0% pro Verkauf in allen Plaenen", it: "0% per vendita in tutti i piani" },
  "Setup rápido": { pt: "Setup rapido", fr: "Mise en place rapide", de: "Schnelles Setup", it: "Setup rapido" },
  "Configuración guiada en minutos": { pt: "Configuracao guiada em minutos", fr: "Configuration guidee en quelques minutes", de: "Gefuhrte Einrichtung in Minuten", it: "Configurazione guidata in pochi minuti" },
  "Sin amarras": { pt: "Sem fidelidade", fr: "Sans engagement", de: "Ohne Bindung", it: "Nessun vincolo" },
  "Cancela cuando quieras": { pt: "Cancele quando quiser", fr: "Resiliez quand vous voulez", de: "Jederzeit kuendbar", it: "Annulla quando vuoi" },
  "Soporte real": { pt: "Suporte real", fr: "Support reel", de: "Echter Support", it: "Supporto reale" },
  "Respuesta humana por correo": { pt: "Resposta humana por email", fr: "Reponse humaine par email", de: "Menschliche Antwort per E-Mail", it: "Risposta umana via email" },
  "Sin el caos de siempre": { pt: "Sem o caos de sempre", fr: "Sans le chaos habituel", de: "Kein Chaos mehr", it: "Senza il solito caos" },
  "Un sistema. No cinco herramientas pegadas con cinta.": { pt: "Um sistema. Nao cinco ferramentas coladas com fita.", fr: "Un systeme. Pas cinq outils assembles a la va-vite.", de: "Ein System. Nicht funf Tools zusammengeklebt.", it: "Un sistema. Non cinque strumenti tenuti insieme con il nastro." },
  "Menú en una app, pedidos por WhatsApp, caja en otra pantalla, inventario en una hoja de cálculo. Con GodCode todo vive en un solo lugar.": { pt: "Menu em um app, pedidos pelo WhatsApp, caixa em outra tela, inventario em uma planilha. Com GodCode tudo fica em um so lugar.", fr: "Menu dans une app, commandes sur WhatsApp, caisse sur un autre ecran, inventaire dans un tableur. Avec GodCode tout est au meme endroit.", de: "Menu in einer App, Bestellungen per WhatsApp, Kasse auf einem anderen Bildschirm, Inventar in einer Tabelle. Mit GodCode ist alles an einem Ort.", it: "Menu in un'app, ordini su WhatsApp, cassa su un altro schermo, inventario in un foglio. Con GodCode tutto vive in un solo posto." },
  "Ventas online": { pt: "Vendas online", fr: "Ventes en ligne", de: "Online-Verkauf", it: "Vendite online" },
  "Menú digital y carrito inteligente": { pt: "Menu digital e carrinho inteligente", fr: "Menu digital et panier intelligent", de: "Digitales Menu und smarter Warenkorb", it: "Menu digitale e carrello intelligente" },
  "Tus clientes ven el menú desde su celular, eligen productos, personalizan extras y pagan online. Todo sin que levantes el teléfono.": { pt: "Seus clientes veem o menu no celular, escolhem produtos, personalizam extras e pagam online. Tudo sem precisar atender telefone.", fr: "Vos clients consultent le menu sur mobile, choisissent des produits, personnalisent des extras et paient en ligne.", de: "Deine Kunden sehen das Menu am Handy, waehlen Produkte, personalisieren Extras und zahlen online.", it: "I clienti vedono il menu da mobile, scelgono prodotti, personalizzano extra e pagano online." },
  "Categorías, fotos y precios por sucursal": { pt: "Categorias, fotos e precos por filial", fr: "Categories, photos et prix par succursale", de: "Kategorien, Fotos und Preise je Filiale", it: "Categorie, foto e prezzi per filiale" },
  "Carrito con totales automáticos y extras": { pt: "Carrinho com totais automaticos e extras", fr: "Panier avec totaux automatiques et extras", de: "Warenkorb mit automatischen Summen und Extras", it: "Carrello con totali automatici ed extra" },
  "Checkout rápido desde cualquier celular": { pt: "Checkout rapido de qualquer celular", fr: "Checkout rapide depuis n'importe quel mobile", de: "Schneller Checkout von jedem Handy", it: "Checkout rapido da qualsiasi cellulare" },
  "Operaciones": { pt: "Operacoes", fr: "Operations", de: "Betrieb", it: "Operazioni" },
  "Punto de venta y caja registradora": { pt: "Ponto de venda e caixa", fr: "Point de vente et caisse", de: "Kassensystem und POS", it: "Punto vendita e cassa" },
  "Cobra en tu local con un sistema rápido y simple. Turnos de caja, métodos de pago y resumen de ventas en un solo lugar.": { pt: "Cobre na sua loja com um sistema rapido e simples. Turnos de caixa, metodos de pagamento e resumo de vendas no mesmo lugar.", fr: "Encaissez en boutique avec un systeme rapide et simple. Caisse, paiements et resume des ventes au meme endroit.", de: "Kassiere im Laden mit einem schnellen, einfachen System. Schichten, Zahlarten und Verkaufsubersicht an einem Ort.", it: "Incassa nel tuo locale con un sistema rapido e semplice. Turni cassa, metodi di pagamento e riepilogo vendite in un unico posto." },
  "POS táctil rápido e intuitivo": { pt: "POS touch rapido e intuitivo", fr: "POS tactile rapide et intuitif", de: "Schnelles, intuitives Touch-POS", it: "POS touch rapido e intuitivo" },
  "Turnos de caja con apertura y cierre": { pt: "Turnos de caixa com abertura e fechamento", fr: "Tours de caisse avec ouverture et fermeture", de: "Kassenschichten mit Offnung und Abschluss", it: "Turni cassa con apertura e chiusura" },
  "Inventario": { pt: "Inventario", fr: "Inventaire", de: "Inventar", it: "Inventario" },
  "Stock y control por sucursal": { pt: "Estoque e controle por filial", fr: "Stock et controle par succursale", de: "Bestand und Kontrolle je Filiale", it: "Stock e controllo per filiale" },
  "Mantén inventario, recetas y movimientos sincronizados para evitar quiebres de stock y errores al vender.": { pt: "Mantenha estoque, receitas e movimentos sincronizados para evitar ruptura e erros na venda.", fr: "Gardez inventaire, recettes et mouvements synchronises pour eviter les ruptures.", de: "Halte Inventar, Rezepte und Bewegungen synchron, um Engpasse und Fehler zu vermeiden.", it: "Mantieni inventario, ricette e movimenti sincronizzati per evitare rotture di stock ed errori." },
  "Stock en tiempo real por sucursal": { pt: "Estoque em tempo real por filial", fr: "Stock en temps reel par succursale", de: "Echtzeit-Bestand je Filiale", it: "Stock in tempo reale per filiale" },
  "Alertas de inventario bajo": { pt: "Alertas de estoque baixo", fr: "Alertes de stock faible", de: "Warnungen bei niedrigem Bestand", it: "Avvisi di inventario basso" },
  "Recetas: descuento automático al vender": { pt: "Receitas: baixa automatica ao vender", fr: "Recettes: deduction automatique a la vente", de: "Rezepte: automatischer Abzug beim Verkauf", it: "Ricette: scarico automatico alla vendita" },
  "Historial completo de movimientos": { pt: "Historico completo de movimentos", fr: "Historique complet des mouvements", de: "Vollstandiger Bewegungsverlauf", it: "Storico completo dei movimenti" },
  "Cómo funciona": { pt: "Como funciona", fr: "Comment ca marche", de: "So funktioniert es", it: "Come funziona" },
  "Tu tienda lista en minutos": { pt: "Sua loja pronta em minutos", fr: "Votre boutique prete en quelques minutes", de: "Dein Shop in Minuten startklar", it: "Il tuo negozio pronto in pochi minuti" },
  "Un flujo corto y claro para pasar de idea a ventas sin fricción. Sin configuraciones pesadas, sin curva técnica y sin perder tiempo en pasos innecesarios.": { pt: "Um fluxo curto e claro para ir da ideia as vendas sem friccao.", fr: "Un parcours court et clair pour passer de l'idee aux ventes sans friction.", de: "Ein kurzer, klarer Ablauf von der Idee zu Verkaeufen ohne Reibung.", it: "Un flusso breve e chiaro per passare dall'idea alle vendite senza attriti." },
  "Primer mes gratis": { pt: "Primeiro mes gratis", fr: "Premier mois gratuit", de: "Erster Monat kostenlos", it: "Primo mese gratis" },
  "En menos de 5 minutos": { pt: "Em menos de 5 minutos", fr: "En moins de 5 minutes", de: "In weniger als 5 Minuten", it: "In meno di 5 minuti" },
  "Soporte incluido": { pt: "Suporte incluido", fr: "Support inclus", de: "Support inklusive", it: "Supporto incluso" },
  "Producto": { pt: "Produto", fr: "Produit", de: "Produkt", it: "Prodotto" },
  "Así se ve tu tienda": { pt: "Assim fica sua loja", fr: "Voila a quoi ressemble votre boutique", de: "So sieht dein Shop aus", it: "Cosi appare il tuo negozio" },
  "Interfaz limpia para ti y para tus clientes.": { pt: "Interface limpa para voce e seus clientes.", fr: "Interface claire pour vous et vos clients.", de: "Saubere Oberflache fur dich und deine Kunden.", it: "Interfaccia pulita per te e per i tuoi clienti." },
  "Empieza ahora": { pt: "Comece agora", fr: "Commencez maintenant", de: "Jetzt starten", it: "Inizia ora" },
  "Crea tu tienda en menos de": { pt: "Crie sua loja em menos de", fr: "Creez votre boutique en moins de", de: "Erstelle deinen Shop in weniger als", it: "Crea il tuo negozio in meno di" },
  "5 minutos": { pt: "5 minutos", fr: "5 minutes", de: "5 Minuten", it: "5 minuti" },
  "Sin código, sin servidores, sin complicaciones. Solo tú y tus productos.": { pt: "Sem codigo, sem servidores, sem complicacoes. So voce e seus produtos.", fr: "Sans code, sans serveurs, sans complications. Seulement vous et vos produits.", de: "Kein Code, keine Server, keine Komplikationen. Nur du und deine Produkte.", it: "Niente codice, niente server, niente complicazioni. Solo tu e i tuoi prodotti." },
  "Ver precios": { pt: "Ver precos", fr: "Voir les tarifs", de: "Preise ansehen", it: "Vedi prezzi" },
  "Demo": { pt: "Demo", fr: "Demo", de: "Demo", it: "Demo" },
  "Mira el producto en acción": { pt: "Veja o produto em acao", fr: "Voyez le produit en action", de: "Sieh das Produkt in Aktion", it: "Guarda il prodotto in azione" },
  "Esta demo resume el flujo completo: menú, carrito, pedidos, caja e inventario en una sola presentación.": { pt: "Esta demo resume o fluxo completo: menu, carrinho, pedidos, caixa e inventario em uma unica apresentacao.", fr: "Cette demo resume le flux complet: menu, panier, commandes, caisse et inventaire.", de: "Diese Demo zeigt den kompletten Ablauf: Menu, Warenkorb, Bestellungen, POS und Inventar.", it: "Questa demo riassume il flusso completo: menu, carrello, ordini, cassa e inventario." },
  "Video demo del producto": { pt: "Video demo do produto", fr: "Video de demo du produit", de: "Produkt-Demo-Video", it: "Video demo del prodotto" },
  "Versión de demo privada disponible para reuniones comerciales y partners.": { pt: "Versao de demo privada disponivel para reunioes comerciais e parceiros.", fr: "Version de demo privee disponible pour reunions commerciales et partenaires.", de: "Private Demo-Version verfugbar fur Sales-Meetings und Partner.", it: "Versione demo privata disponibile per riunioni commerciali e partner." },
  "Vista previa": { pt: "Previa", fr: "Apercu", de: "Vorschau", it: "Anteprima" },
  "Por qué conviene usarlo": { pt: "Por que vale a pena usar", fr: "Pourquoi cela vaut le coup", de: "Warum es sich lohnt", it: "Perche conviene usarlo" },
  "Demo comercial disponible bajo solicitud": { pt: "Demo comercial disponivel sob solicitacao", fr: "Demo commerciale disponible sur demande", de: "Kommerzielle Demo auf Anfrage verfugbar", it: "Demo commerciale disponibile su richiesta" },
  "Menú, carrito y pago en un solo lugar": { pt: "Menu, carrinho e pagamento em um unico lugar", fr: "Menu, panier et paiement au meme endroit", de: "Menu, Warenkorb und Zahlung an einem Ort", it: "Menu, carrello e pagamento in un unico posto" },
  "Pedidos y caja con control centralizado": { pt: "Pedidos e caixa com controle centralizado", fr: "Commandes et caisse avec controle centralise", de: "Bestellungen und POS mit zentraler Steuerung", it: "Ordini e cassa con controllo centralizzato" },
  "Inventario por sucursal con alertas": { pt: "Inventario por filial com alertas", fr: "Inventaire par succursale avec alertes", de: "Inventar je Filiale mit Warnungen", it: "Inventario per filiale con avvisi" },
  "Presentación lista para reuniones y demos": { pt: "Apresentacao pronta para reunioes e demos", fr: "Presentation prete pour reunions et demos", de: "Praesentation bereit fur Meetings und Demos", it: "Presentazione pronta per riunioni e demo" },
  "¿Por qué GodCode?": { pt: "Por que GodCode?", fr: "Pourquoi GodCode ?", de: "Warum GodCode?", it: "Perche GodCode?" },
  "Compara y decide": { pt: "Compare e decida", fr: "Comparez et decidez", de: "Vergleiche und entscheide", it: "Confronta e decidi" },
  "Elige una opción que te deje crecer sin comisiones altas, sin depender de terceros y con control total de tu negocio.": { pt: "Escolha uma opcao para crescer sem comissoes altas e com controle total do seu negocio.", fr: "Choisissez une option qui vous permet de grandir sans fortes commissions.", de: "Waehle eine Option, mit der du ohne hohe Provisionen wachsen kannst.", it: "Scegli un'opzione che ti permetta di crescere senza commissioni alte." },
  "Desarrollo propio": { pt: "Desenvolvimento proprio", fr: "Developpement sur mesure", de: "Eigene Entwicklung", it: "Sviluppo personalizzato" },
  "Sí": { pt: "Sim", fr: "Oui", de: "Ja", it: "Si" },
  "No": { pt: "Nao", fr: "Non", de: "Nein", it: "No" },
  "* Comparativa referencial. Costos y condiciones de terceros pueden variar por país, categoría y promociones vigentes.": { pt: "* Comparacao referencial. Custos e condicoes de terceiros podem variar por pais e categoria.", fr: "* Comparaison indicative. Les couts et conditions peuvent varier selon le pays.", de: "* Referenzvergleich. Kosten und Bedingungen Dritter konnen je nach Land variieren.", it: "* Confronto indicativo. Costi e condizioni dei terzi possono variare per paese." },
  "Testimonios": { pt: "Depoimentos", fr: "Temoignages", de: "Kundenstimmen", it: "Testimonianze" },
  "Lo que dicen nuestros clientes": { pt: "O que dizem nossos clientes", fr: "Ce que disent nos clients", de: "Was unsere Kunden sagen", it: "Cosa dicono i nostri clienti" },
  "Precios": { pt: "Precos", fr: "Tarifs", de: "Preise", it: "Prezzi" },
  "Planes simples, sin sorpresas": { pt: "Planos simples, sem surpresas", fr: "Plans simples, sans surprises", de: "Einfache Plane, ohne Uberraschungen", it: "Piani semplici, senza sorprese" },
  "Prueba el primer mes gratis. Cancela cuando quieras.": { pt: "Teste o primeiro mes gratis. Cancele quando quiser.", fr: "Essayez le premier mois gratuit. Resiliez quand vous voulez.", de: "Teste den ersten Monat kostenlos. Jederzeit kuendbar.", it: "Prova il primo mese gratis. Annulla quando vuoi." },
  "Estamos preparando los planes": { pt: "Estamos preparando os planos", fr: "Nous preparons les plans", de: "Wir bereiten die Plane vor", it: "Stiamo preparando i piani" },
  "Mientras tanto, puedes crear tu cuenta y explorar la plataforma gratis.": { pt: "Enquanto isso, voce pode criar sua conta e explorar a plataforma gratis.", fr: "En attendant, vous pouvez creer votre compte et explorer la plateforme gratuitement.", de: "In der Zwischenzeit kannst du dein Konto erstellen und die Plattform kostenlos testen.", it: "Nel frattempo puoi creare il tuo account ed esplorare la piattaforma gratis." },
  "Popular": { pt: "Popular", fr: "Populaire", de: "Beliebt", it: "Popolare" },
  "USD / mes": { pt: "USD / mes", fr: "USD / mois", de: "USD / Monat", it: "USD / mese" },
  "Comenzar": { pt: "Comecar", fr: "Commencer", de: "Starten", it: "Inizia" },
  "Garantía: si no te sirve, cancela sin costo ni penalidad.": { pt: "Garantia: se nao servir, cancele sem custo.", fr: "Garantie: si cela ne vous convient pas, annulez sans frais.", de: "Garantie: Wenn es nicht passt, kundige ohne Kosten.", it: "Garanzia: se non ti serve, annulla senza costi." },
  "Dudas": { pt: "Duvidas", fr: "Questions", de: "Fragen", it: "Dubbi" },
  "Preguntas frecuentes": { pt: "Perguntas frequentes", fr: "Questions frequentes", de: "Haufige Fragen", it: "Domande frequenti" },
  "Último paso": { pt: "Ultimo passo", fr: "Derniere etape", de: "Letzter Schritt", it: "Ultimo passo" },
  "Empieza hoy: tu primera tienda es": { pt: "Comece hoje: sua primeira loja e", fr: "Commencez aujourd'hui : votre premiere boutique est", de: "Starte heute: dein erster Shop ist", it: "Inizia oggi: il tuo primo negozio e" },
  "gratis": { pt: "gratis", fr: "gratuite", de: "kostenlos", it: "gratis" },
  "Menú digital, pedidos, caja e inventario en un solo lugar. Sin comisiones por venta ni letra chica.": { pt: "Menu digital, pedidos, caixa e inventario em um so lugar. Sem comissoes por venda.", fr: "Menu digital, commandes, caisse et inventaire en un seul endroit. Sans commission.", de: "Digitales Menu, Bestellungen, POS und Inventar an einem Ort. Keine Verkaufsprovision.", it: "Menu digitale, ordini, cassa e inventario in un unico posto. Nessuna commissione." },
  "Empieza en minutos": { pt: "Comece em minutos", fr: "Commencez en quelques minutes", de: "Starte in wenigen Minuten", it: "Inizia in pochi minuti" },
  "Cancelas cuando quieras": { pt: "Cancele quando quiser", fr: "Resiliez quand vous voulez", de: "Jederzeit kuendbar", it: "Annulla quando vuoi" },
  "Soporte en menos de 24 h": { pt: "Suporte em menos de 24 h", fr: "Support en moins de 24 h", de: "Support in weniger als 24 h", it: "Supporto in meno di 24 h" },
  "Crear mi tienda gratis": { pt: "Criar minha loja gratis", fr: "Creer ma boutique gratuite", de: "Meinen kostenlosen Shop erstellen", it: "Crea il mio negozio gratis" },
  "Ver preguntas frecuentes": { pt: "Ver perguntas frequentes", fr: "Voir la FAQ", de: "FAQ ansehen", it: "Vedi FAQ" },
  "Boletín": { pt: "Boletim", fr: "Newsletter", de: "Newsletter", it: "Newsletter" },
  "¿Aún no te decides?": { pt: "Ainda em duvida?", fr: "Toujours indecis ?", de: "Noch unsicher?", it: "Ancora indeciso?" },
  "Deja tu correo y te escribimos solo cuando tengamos algo que te sirva. Nada de spam.": { pt: "Deixe seu email e so vamos escrever quando houver algo util. Sem spam.", fr: "Laissez votre email et nous ecrirons seulement quand ce sera utile. Pas de spam.", de: "Hinterlasse deine E-Mail, wir schreiben nur bei relevanten Infos. Kein Spam.", it: "Lascia la tua email e ti scriveremo solo quando utile. Niente spam." },
  "Escríbenos": { pt: "Escreva para nos", fr: "Ecrivez-nous", de: "Schreib uns", it: "Scrivici" },
  "¿Tienes dudas?": { pt: "Tem duvidas?", fr: "Vous avez des questions ?", de: "Hast du Fragen?", it: "Hai dubbi?" },
  "Cuéntanos tu rubro y qué necesitas. Respondemos por correo en menos de 24 horas.": { pt: "Conte seu segmento e o que precisa. Respondemos por email em menos de 24 horas.", fr: "Parlez-nous de votre secteur et de vos besoins. Reponse par email en moins de 24 h.", de: "Erzaehl uns deine Branche und was du brauchst. Antwort per E-Mail in weniger als 24 h.", it: "Raccontaci il tuo settore e cosa ti serve. Rispondiamo via email in meno di 24 ore." },
  "Crear mi tienda ya": { pt: "Criar minha loja agora", fr: "Creer ma boutique maintenant", de: "Meinen Shop jetzt erstellen", it: "Crea il mio negozio ora" },
  "Registro en minutos.": { pt: "Cadastro em minutos.", fr: "Inscription en quelques minutes.", de: "Registrierung in wenigen Minuten.", it: "Registrazione in pochi minuti." },
  "Soporte humano si te atoras.": { pt: "Suporte humano se voce travar.", fr: "Support humain si vous bloquez.", de: "Menschlicher Support, wenn du festhangst.", it: "Supporto umano se ti blocchi." },
  "Cupos de lanzamiento disponibles": { pt: "Vagas de lancamento disponiveis", fr: "Places de lancement disponibles", de: "Launch-Plaetze verfuegbar", it: "Posti di lancio disponibili" },
  "Con ": { pt: "Com ", fr: "Avec ", de: "Mit ", it: "Con " },
  " comienza a vender al instante y sin comisiones.": {
    pt: ", comece a vender na hora e sem comissoes.",
    fr: ", commencez a vendre tout de suite sans commissions.",
    de: ", starte sofort mit dem Verkauf — ohne Verkaufsprovisionen.",
    it: ", inizia a vendere subito e senza commissioni.",
  },
  "Menú, pedidos y cobros con tu marca y tu dominio, todo en un solo lugar.": {
    pt: "Menu, pedidos e pagamentos com sua marca e seu dominio, tudo em um so lugar.",
    fr: "Menu, commandes et paiements sous votre marque et votre domaine, tout au meme endroit.",
    de: "Menu, Bestellungen und Zahlungen unter deiner Marke und deiner Domain — alles an einem Ort.",
    it: "Menu, ordini e incassi con il tuo brand e dominio, tutto in un unico posto.",
  },
  "Conoce más sobre GodCode": { pt: "Saiba mais sobre o GodCode", fr: "En savoir plus sur GodCode", de: "Mehr ueber GodCode erfahren", it: "Scopri di piu su GodCode" },
  "Primer mes gratis · Cancela cuando quieras · Sujeto a disponibilidad.": {
    pt: "Primeiro mes gratis · Cancele quando quiser · Sujeito a disponibilidade.",
    fr: "Premier mois gratuit · Resiliez quand vous voulez · Sous reserve de disponibilite.",
    de: "Erster Monat kostenlos · Jederzeit kuendbar · Abhangig von Verfuegbarkeit.",
    it: "Primo mese gratis · Annulla quando vuoi · Soggetto a disponibilita.",
  },
};

function resolveLocale(locale: string): SupportedLocale {
  const base = locale.toLowerCase().split("-")[0];
  if (base === "es" || base === "en" || base === "pt" || base === "fr" || base === "de" || base === "it") {
    return base;
  }
  return "en";
}

/* ───── Shared UI ───── */

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400", className)}>
      {children}
    </p>
  );
}

function SectionShell({
  id,
  variant = "default",
  className,
  children,
}: {
  id?: string;
  variant?: "default" | "white" | "muted" | "dark" | "gradient";
  className?: string;
  children: React.ReactNode;
}) {
  const bg = {
    default: "bg-transparent",
    white: "bg-white dark:bg-zinc-950",
    muted: "bg-slate-50 dark:bg-zinc-950",
    dark: "bg-slate-900 dark:bg-zinc-950",
    gradient: "bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700",
  }[variant];
  return (
    <section
      id={id}
      className={cn("scroll-mt-20 min-h-[100svh] py-14 sm:py-20 md:py-24", bg, className)}
    >
      {children}
    </section>
  );
}

/* ───── Main ───── */

export function LandingSections({
  plans,
  media,
  country = "OTHER",
  locale,
}: {
  plans: PublicPlanForLanding[];
  media: LandingMediaBundle;
  country?: CountryCode;
  locale: string;
}) {
  const localeKey = resolveLocale(locale);
  const tx = (es: string, en: string) => {
    if (localeKey === "es") return es;
    if (localeKey === "en") return en;
    return LANDING_TX[es]?.[localeKey] ?? en;
  };

  const support = getSupportEmail();
  const popularIdx = popularPlanIndex(plans.length);
  const continent = getContinentFromCountry(country);
  const steps = [
    { n: "1", title: tx("Regístrate", "Sign up"), text: tx("Crea tu cuenta con email. El primer mes es gratis.", "Create your account with email. The first month is free.") },
    { n: "2", title: tx("Arma tu tienda", "Build your store"), text: tx("Sube productos, configura delivery y sucursales.", "Upload products and configure delivery and branches.") },
    { n: "3", title: tx("Empieza a vender", "Start selling"), text: tx("Comparte tu link y recibe pedidos desde el día 1.", "Share your link and receive orders from day 1.") },
  ] as const;

  const compareRows = [
    { feature: tx("Comisión por venta", "Sales commission"), ig: tx("No aplica", "N/A"), rappi: "25-30%", custom: "0%", gc: "0%" },
    { feature: tx("Control de clientes", "Customer ownership"), ig: false, rappi: false, custom: true, gc: true },
    { feature: tx("Tu propia marca", "Your own brand"), ig: false, rappi: false, custom: true, gc: true },
    { feature: tx("Tiempo de setup", "Setup time"), ig: tx("1 día", "1 day"), rappi: tx("1-2 sem.", "1-2 weeks"), custom: tx("2-6 meses", "2-6 months"), gc: "5 min" },
    { feature: tx("Costo mensual", "Monthly cost"), ig: tx("Gratis*", "Free*"), rappi: tx("Gratis*", "Free*"), custom: "$500+", gc: tx("Desde $20", "From $20") },
    { feature: tx("Inventario y caja", "Inventory and POS"), ig: false, rappi: false, custom: true, gc: true },
  ] as const;

  const faqItems = [
    { q: tx("¿No sé nada de tecnología, puedo usarlo?", "I am not technical, can I use it?"), a: tx("Sí. No necesitas programar ni saber de servidores. Te registras, subes tus productos y tu tienda está lista. Si tienes dudas, nuestro soporte te guía.", "Yes. You do not need coding or server knowledge. Sign up, upload your products and your store is ready.") },
    { q: tx("¿Cuánto cuesta realmente?", "How much does it really cost?"), a: tx("Los precios están en la sección de planes arriba. No hay costos ocultos, comisiones por venta ni cargos sorpresa.", "Prices are in the plans section above. No hidden costs, sales commissions or surprise fees.") },
    { q: tx("¿Puedo cancelar cuando quiera?", "Can I cancel anytime?"), a: tx("Sí. Sin penalidad, sin permanencia mínima. Si no te sirve, cancelas y listo.", "Yes. No penalty and no minimum commitment.") },
    { q: tx("¿Mis datos están seguros?", "Is my data secure?"), a: tx("Usamos encriptación SSL, servidores protegidos y cada negocio tiene sus datos completamente aislados. Nadie más puede ver tu información.", "We use SSL encryption and protected servers, and each business has fully isolated data.") },
    { q: tx("¿Cuánto tardo en tener mi tienda lista?", "How long until my store is ready?"), a: tx("Si ya tienes tus productos y fotos, menos de 1 hora. El proceso de registro toma 5 minutos.", "If you already have products and photos, under one hour. Sign-up takes five minutes.") },
    { q: tx("¿Puedo tener varias sucursales?", "Can I have multiple branches?"), a: tx("Sí. Cada sucursal tiene su propio inventario, precios, zona de delivery y horarios.", "Yes. Each branch has its own inventory, pricing, delivery zone and schedules.") },
  ] as const;

  return (
    <main className="relative z-10">

      {/* ════ 1. HERO ════ */}
      <section
        id="inicio"
        className="relative scroll-mt-20 flex min-h-[92svh] items-center overflow-hidden bg-[radial-gradient(circle_at_1px_1px,rgb(226_232_240_/_0.4)_1px,transparent_0)] bg-[length:24px_24px] py-10 sm:py-14 md:py-16 lg:py-20"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white via-indigo-50/20 to-white dark:from-zinc-950 dark:via-indigo-950/10 dark:to-zinc-950" />
        <div className="landing-hero-aurora landing-hero-aurora--one" aria-hidden />
        <div className="landing-hero-aurora landing-hero-aurora--two" aria-hidden />
        <div className="landing-hero-aurora landing-hero-aurora--three" aria-hidden />
        <div className="landing-hero-sheen" aria-hidden />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-5 sm:px-6 lg:grid lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8">
          <div className="order-2 text-center lg:order-1 lg:text-left">
            <LandingReveal>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200/60 bg-indigo-50/80 px-3.5 py-1.5 text-[11px] font-medium text-indigo-700 backdrop-blur sm:px-4 sm:text-xs dark:border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                </span>
                {tx("Cupos de lanzamiento disponibles", "Launch spots available")}
              </span>
            </LandingReveal>

            <LandingReveal delay={0.08}>
              <h1 className="mt-5 text-[1.7rem] font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-[3.25rem] dark:text-white">
                {tx("Con ", "With ")}
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
                  GodCode
                </span>
                {tx(" comienza a vender al instante y sin comisiones.", ", start selling instantly—with no sales commissions.")}
              </h1>
            </LandingReveal>

            <LandingReveal delay={0.11}>
              <p className="mt-4 max-w-xl text-balance text-sm leading-relaxed text-slate-600 sm:text-base lg:mt-5 dark:text-zinc-400">
                {tx(
                  "Menú, pedidos y cobros con tu marca y tu dominio, todo en un solo lugar.",
                  "Menu, orders and payments under your brand and domain—all in one place."
                )}
              </p>
            </LandingReveal>

            <LandingReveal delay={0.2}>
              <div className="mt-7 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href="/onboarding"
                  prefetch={false}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-7 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700 sm:h-[3.25rem] sm:w-auto sm:px-8 sm:text-base"
                >
                  {tx("Empezar gratis", "Start for free")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                {/* En mobile: "Ver demo" y WhatsApp en la misma fila */}
                <div className="flex w-full items-center gap-3 sm:contents">
                  <a
                    href="#demo"
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-7 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:h-[3.25rem] sm:flex-none sm:w-auto sm:px-8 sm:text-base dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
                  >
                    {tx("Ver demo", "View demo")}
                  </a>
                  <a
                    href="https://wa.me/56943848080?text=Hola%2C%20quiero%20conocer%20Godcode%20SaaS"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800 sm:h-[3.25rem] sm:w-[3.25rem] dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:border-emerald-400/30 dark:hover:bg-emerald-500/15 dark:hover:text-emerald-200"
                    aria-label={tx("Hablar por WhatsApp", "Talk on WhatsApp")}
                    title={tx("Hablar por WhatsApp", "Talk on WhatsApp")}
                  >
                    <svg viewBox="0 0 32 32" aria-hidden className="h-5 w-5 fill-current">
                      <path d="M16 3C8.82 3 3 8.64 3 15.58c0 2.79.93 5.37 2.53 7.47L4 29l6.19-1.45c1.97 1.04 4.23 1.63 6.65 1.63 7.18 0 13-5.64 13-12.6C29.84 8.64 24.02 3 16 3Zm0 23.08c-2.2 0-4.31-.58-6.12-1.67l-.44-.26-3.67.86.93-3.55-.29-.46a10.87 10.87 0 0 1-1.75-5.92C4.66 9.55 9.72 4.85 16 4.85c6.28 0 11.34 4.7 11.34 10.23 0 5.55-5.06 10.3-11.34 10.3Zm6.44-7.43c-.34-.17-2.02-.99-2.33-1.1-.31-.1-.53-.17-.75.17-.22.33-.86 1.1-1.05 1.32-.2.23-.39.25-.73.08-.34-.17-1.43-.52-2.72-1.66-1.01-.89-1.69-1.99-1.89-2.33-.2-.33-.02-.52.15-.69.15-.15.34-.39.51-.59.17-.2.23-.34.34-.56.11-.23.06-.43-.03-.6-.09-.17-.75-1.83-1.03-2.51-.27-.65-.55-.56-.75-.57h-.64c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.85 0 1.68 1.23 3.3 1.4 3.53.17.23 2.42 3.73 5.86 5.08 3.44 1.35 3.44.9 4.06.84.62-.06 2.02-.82 2.31-1.61.28-.78.28-1.45.2-1.6-.08-.15-.31-.23-.65-.4Z" />
                    </svg>
                  </a>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-slate-400 lg:text-left dark:text-zinc-500">
                {tx("Primer mes gratis · Cancela cuando quieras · Sujeto a disponibilidad.", "First month free · Cancel anytime · Subject to availability.")}
              </p>
            </LandingReveal>

            <LandingReveal delay={0.28}>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500 sm:gap-x-6 sm:text-sm lg:justify-start dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden />{tx("Datos protegidos", "Protected data")}</span>
                <span className="inline-flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden />{tx("Pagos seguros", "Secure payments")}</span>
                <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden />{tx("Tu dominio propio", "Your own domain")}</span>
              </div>
              <div className="mt-3 text-center lg:text-left">
                <Link
                  href="/sobre-godcode"
                  prefetch={false}
                  className="text-sm font-semibold text-indigo-700 transition-colors hover:text-indigo-800 hover:underline dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  {tx("Conoce más sobre GodCode", "Learn more about GodCode")}
                </Link>
              </div>
            </LandingReveal>
          </div>

          <div className="order-1 w-full lg:order-2">
            <LandingReveal delay={0.1} direction="right">
              <div className="relative mx-auto max-w-[28rem] pb-4 sm:max-w-lg sm:pb-10 lg:max-w-none">
                <LaptopFrame
                  src={media.hero.laptopSrc}
                  alt={media.hero.laptopAlt}
                  priority
                />
                <div className="absolute -bottom-2 -left-2 z-10 hidden sm:block sm:-bottom-4 sm:-left-6 lg:-left-10">
                  <PhoneFrame
                    className="!max-w-[108px] sm:!max-w-[152px] lg:!max-w-[184px]"
                    src={media.hero.phoneSrc}
                    alt={media.hero.phoneAlt}
                    priority
                  />
                </div>
              </div>
            </LandingReveal>
          </div>
        </div>
      </section>

      {/* wave: white → dark — fill-current = mismo token que bg-slate-900 de la sección; -mt-px evita halo por antialiasing */}
      <div className="relative -my-2 h-8 overflow-hidden bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-950 sm:h-12">
        <svg viewBox="0 0 1440 54" fill="none" preserveAspectRatio="none" className="absolute inset-x-0 top-[-1px] block h-[calc(100%+2px)] w-full">
          <path d="M0 22C240 52 480 54 720 36S1200 0 1440 18V54H0Z" className="fill-current" />
        </svg>
      </div>

      {/* ════ 2. TRUST STRIP + KPIs ════ */}
      <SectionShell variant="dark" className="-mt-px min-h-0 py-10 sm:py-14">
        <div className="mx-auto max-w-5xl px-5 sm:px-6">
          <LandingReveal>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-slate-400 sm:gap-x-12">
              <span className="inline-flex items-center gap-2 font-medium"><CreditCard className="h-4 w-4 text-indigo-400" aria-hidden />{tx("Múltiples métodos de pago", "Multiple payment methods")}</span>
              <span className="inline-flex items-center gap-2 font-medium"><Shield className="h-4 w-4 text-indigo-400" aria-hidden />{tx("Cifrado SSL", "SSL encryption")}</span>
              <span className="inline-flex items-center gap-2 font-medium"><Headphones className="h-4 w-4 text-indigo-400" aria-hidden />{tx("Soporte humano por email (<24h)", "Human support by email (<24h)")}</span>
            </div>
          </LandingReveal>

          <LandingReveal delay={0.1}>
            <div className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:gap-6 md:grid-cols-4">
              {([
                { title: tx("Sin comisión", "No commission"), label: tx("0% por venta en todos los planes", "0% per sale on all plans") },
                { title: tx("Setup rápido", "Fast setup"), label: tx("Configuración guiada en minutos", "Guided setup in minutes") },
                { title: tx("Sin amarras", "No lock-in"), label: tx("Cancela cuando quieras", "Cancel anytime") },
                { title: tx("Soporte real", "Real support"), label: tx("Respuesta humana por correo", "Human response by email") },
              ] as const).map((kpi) => (
                <div key={kpi.title} className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4 text-center">
                  <p className="text-base font-semibold text-white sm:text-lg">{kpi.title}</p>
                  <p className="mt-1 text-xs text-slate-400 sm:text-sm">{kpi.label}</p>
                </div>
              ))}
            </div>
          </LandingReveal>
        </div>
      </SectionShell>

      {/* wave: dark → white */}
      <div className="relative -my-2 h-8 overflow-hidden bg-white text-slate-900 dark:bg-zinc-950 dark:text-zinc-950 sm:h-12">
        <svg viewBox="0 0 1440 54" fill="none" preserveAspectRatio="none" className="absolute inset-x-0 top-[-1px] block h-[calc(100%+2px)] w-full">
          <path d="M0 32C360 4 720 0 1080 22S1380 52 1440 40V0H0Z" className="fill-current" />
        </svg>
      </div>

      {/* ════ 3. FEATURE SPOTLIGHTS ════ */}
      <SectionShell id="funciones" variant="white" className="-mt-px">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <LandingReveal>
            <Eyebrow>{tx("Sin el caos de siempre", "No more chaos")}</Eyebrow>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {tx("Un sistema. No cinco herramientas pegadas con cinta.", "One system. Not five tools held together with tape.")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-500 sm:text-base dark:text-zinc-400">
              {tx("Menú en una app, pedidos por WhatsApp, caja en otra pantalla, inventario en una hoja de cálculo. Con GodCode todo vive en un solo lugar.", "Menu on one app, orders on WhatsApp, POS on another screen, inventory in a spreadsheet. With GodCode everything lives in one place.")}
            </p>
          </LandingReveal>
        </div>

        <div className="mt-14 space-y-16 sm:mt-20 sm:space-y-24">
          <LandingFeatureBlock
            eyebrow={tx("Ventas online", "Online sales")}
            title={tx("Menú digital y carrito inteligente", "Digital menu and smart cart")}
            description={tx("Tus clientes ven el menú desde su celular, eligen productos, personalizan extras y pagan online. Todo sin que levantes el teléfono.", "Customers browse from mobile, customize extras and pay online.")}
            bullets={[
              tx("Categorías, fotos y precios por sucursal", "Categories, photos and pricing by branch"),
              tx("Carrito con totales automáticos y extras", "Cart with automatic totals and extras"),
              tx("Checkout rápido desde cualquier celular", "Fast checkout from any mobile"),
            ]}
            visual={
              <LandingFeatureShot
                src={media.features.menu.src}
                alt={media.features.menu.alt}
              />
            }
          />

          <LandingFeatureBlock
            eyebrow={tx("Operaciones", "Operations")}
            title={tx("Punto de venta y caja registradora", "Point of sale and cash register")}
            description={tx("Cobra en tu local con un sistema rápido y simple. Turnos de caja, métodos de pago y resumen de ventas en un solo lugar.", "Charge quickly in-store. Cash shifts, payment methods and sales summary in one place.")}
            bullets={[
              tx("POS táctil rápido e intuitivo", "Fast, intuitive touch POS"),
              tx("Turnos de caja con apertura y cierre", "Cash opening and closing shifts"),
              tx("Múltiples métodos de pago", "Multiple payment methods"),
            ]}
            visual={
              <LandingFeatureShot
                src={media.features.pos.src}
                alt={media.features.pos.alt}
              />
            }
            reversed
            delay={0.05}
          />

          <LandingFeatureBlock
            eyebrow={tx("Inventario", "Inventory")}
            title={tx("Stock y control por sucursal", "Stock control by branch")}
            description={tx("Mantén inventario, recetas y movimientos sincronizados para evitar quiebres de stock y errores al vender.", "Keep inventory, recipes and movements synced to avoid stockouts and errors.")}
            bullets={[
              tx("Stock en tiempo real por sucursal", "Real-time stock by branch"),
              tx("Alertas de inventario bajo", "Low inventory alerts"),
              tx("Recetas: descuento automático al vender", "Recipes: automatic stock deduction on sale"),
              tx("Historial completo de movimientos", "Full movement history"),
            ]}
            visual={
              <LandingFeatureShot
                src={media.features.inventory.src}
                alt={media.features.inventory.alt}
              />
            }
            delay={0.1}
          />
        </div>
      </SectionShell>

      {/* ════ 4. CÓMO FUNCIONA ════ */}
      <SectionShell
        id="como-funciona"
        variant="dark"
        className="relative min-h-0 overflow-hidden border-y border-indigo-500/20 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.24),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(139,92,246,0.22),transparent_30%),radial-gradient(circle_at_50%_58%,rgba(37,99,235,0.2),transparent_38%),linear-gradient(180deg,#0f172a_0%,#070d1d_100%)]"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute left-[-8rem] top-[10%] h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
          <div className="absolute right-[-7rem] top-[22%] h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-[58%] h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end lg:gap-12">
            <LandingReveal>
              <div className="max-w-2xl">
                <Eyebrow className="text-left !text-indigo-300">{tx("Cómo funciona", "How it works")}</Eyebrow>
                <h2 className="text-left text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[3rem]">
                  {tx("Tu tienda lista en minutos", "Your store ready in minutes")}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-indigo-100/80 sm:text-base">
                  {tx("Un flujo corto y claro para pasar de idea a ventas sin fricción. Sin configuraciones pesadas, sin curva técnica y sin perder tiempo en pasos innecesarios.", "A short and clear flow to go from idea to sales with no friction.")}
                </p>

                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-100 shadow-sm backdrop-blur-sm">
                    <Check className="h-3.5 w-3.5 text-indigo-200" aria-hidden />
                    {tx("Primer mes gratis", "First month free")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-indigo-100 shadow-sm backdrop-blur-sm">
                    <Clock className="h-3.5 w-3.5 text-violet-200" aria-hidden />
                    {tx("En menos de 5 minutos", "Under 5 minutes")}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-indigo-100 shadow-sm backdrop-blur-sm">
                    <Shield className="h-3.5 w-3.5 text-blue-200" aria-hidden />
                    {tx("Soporte incluido", "Support included")}
                  </span>
                </div>
              </div>
            </LandingReveal>

            <LandingReveal delay={0.05} direction="right">
              <div className="relative overflow-hidden rounded-[2rem] border border-indigo-300/20 bg-slate-950/45 p-4 shadow-[0_24px_90px_-34px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-6 md:p-8">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent" aria-hidden />

              {/* Connector arrows (desktop) */}
              <div className="pointer-events-none absolute left-[33.33%] top-14 hidden -translate-x-1/2 text-indigo-200/35 md:block" aria-hidden>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="pointer-events-none absolute left-[66.66%] top-14 hidden -translate-x-1/2 text-indigo-200/35 md:block" aria-hidden>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>

              <ol className="relative grid gap-4 md:grid-cols-3 md:gap-5">

            {steps.map((s, i) => {
              const cardStyles = [
                "border-indigo-300/30 bg-gradient-to-b from-indigo-500/20 to-slate-950/50 text-indigo-200",
                "border-violet-300/30 bg-gradient-to-b from-violet-500/20 to-slate-950/50 text-violet-200",
                "border-blue-300/30 bg-gradient-to-b from-blue-500/20 to-slate-950/50 text-blue-200",
              ];

              return (
                <LandingReveal key={s.n} delay={i * 0.1}>
                  <li className={`group flex h-full flex-col rounded-[1.5rem] border p-6 shadow-[0_10px_30px_-24px_rgba(0,0,0,0.8)] transition-transform duration-300 hover:-translate-y-1 sm:p-7 ${cardStyles[i]}`}>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-sm font-bold shadow-sm ring-1 ring-white/20">
                      {s.n}
                    </span>
                    <h3 className="mt-5 text-lg font-bold text-white sm:text-xl">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-indigo-100/75">{s.text}</p>
                  </li>
                </LandingReveal>
              );
            })}
              </ol>
            </div>
            </LandingReveal>
          </div>
        </div>
      </SectionShell>

      {/* ════ 5. PRODUCTO SHOWCASE ════ */}
      <SectionShell
        id="producto"
        variant="muted"
        className="flex min-h-[100dvh] flex-col justify-center py-8 sm:py-12 md:py-16"
      >
        <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center px-5 sm:px-6 lg:px-8">
          <LandingReveal>
            <Eyebrow>{tx("Producto", "Product")}</Eyebrow>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {tx("Así se ve tu tienda", "This is how your store looks")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-slate-500 sm:text-base dark:text-zinc-400">
              {tx("Interfaz limpia para ti y para tus clientes.", "Clean interface for you and your customers.")}
            </p>
          </LandingReveal>

          <LandingPhoneCarousel slides={media.phoneCarouselSlides} />
        </div>
      </SectionShell>

      {/* ════ 6. DEMO + CTA INTERMEDIO ════ */}
      <section id="demo" className="relative overflow-hidden bg-slate-900 py-16 sm:py-20 md:py-24 dark:bg-zinc-950">
        <LandingAnimatedGrid />

        <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <LandingReveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
                {tx("Ver el producto", "See the product")}
              </p>
              <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-[2.75rem] md:leading-[1.15]">
                {tx("Tu tienda lista en", "Your store ready in")}{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  {tx("5 minutos", "5 minutes")}
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
                {tx("No necesitas saber de tecnología. Si puedes subir una foto a Instagram, puedes tener tu tienda funcionando hoy.", "You do not need to know about tech. If you can upload a photo to Instagram, you can have your store running today.")}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/onboarding"
                  prefetch={false}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-700 sm:h-[3.25rem] sm:w-auto sm:text-base"
                >
                  {tx("Empezar gratis", "Start for free")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href="#precios"
                  className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-700 px-8 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:text-white sm:h-[3.25rem] sm:w-auto sm:text-base"
                >
                  {tx("Ver precios", "See pricing")}
                </a>
              </div>
            </div>
          </LandingReveal>

          <LandingReveal delay={0.08} direction="right">
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:mt-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-stretch">
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-700/60 bg-slate-950/40 p-5 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-6">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/50 to-transparent" aria-hidden />
                <div className="flex items-center gap-2 text-indigo-400">
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{tx("Demo", "Demo")}</span>
                </div>
                <h3 className="mt-3 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {tx("Mira el producto en acción", "See the product in action")}
                </h3>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400 sm:text-base">
                  {tx("Esta demo resume el flujo completo: menú, carrito, pedidos, caja e inventario en una sola presentación.", "This demo summarizes the complete flow: menu, cart, orders, POS and inventory.")}
                </p>
                <div className="mt-6 overflow-hidden">
                  <LandingVideoPlayer
                    src="/Del_caos_al_control.mp4"
                    title={tx("Video demo del producto", "Product demo video")}
                    subtitle={tx("Versión de demo privada disponible para reuniones comerciales y partners.", "Private demo version available for sales meetings and partners.")}
                  />
                </div>
              </div>

              <div className="flex items-center">
                <div className="w-full rounded-[2rem] border border-slate-700/60 bg-slate-950/40 p-5 shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)] backdrop-blur-sm sm:p-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">{tx("Vista previa", "Preview")}</p>
                      <h3 className="mt-1 text-lg font-bold text-white">{tx("Por qué conviene usarlo", "Why it is worth it")}</h3>
                    </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-100 ring-1 ring-indigo-300/25">
                      {tx("Demo comercial disponible bajo solicitud", "Commercial demo available on request")}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {[
                      tx("Menú, carrito y pago en un solo lugar", "Menu, cart and payment in one place"),
                      tx("Pedidos y caja con control centralizado", "Orders and POS with centralized control"),
                      tx("Inventario por sucursal con alertas", "Inventory by branch with alerts"),
                      tx("Presentación lista para reuniones y demos", "Presentation ready for meetings and demos"),
                    ].map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-slate-300">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </LandingReveal>
        </div>
      </section>

      {/* ════ 8. COMPARACIÓN ════ */}
      <SectionShell
        id="comparar"
        variant="white"
        className="relative flex items-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.08),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_30%)]"
      >
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
          <div className="absolute left-[-8rem] top-[16%] h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute right-[-8rem] bottom-[8%] h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />
        </div>
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-6 lg:px-8">
          <LandingReveal>
            <Eyebrow>{tx("¿Por qué GodCode?", "Why GodCode?")}</Eyebrow>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {tx("Compara y decide", "Compare and decide")}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-slate-600 sm:text-base dark:text-zinc-400">
              {tx("No todas las formas de vender online cuestan lo mismo. Compara el costo real: tiempo, comisión y control de cada opción.", "Not all ways to sell online cost the same. Compare the real cost: time, commission and control of each option.")}
            </p>
          </LandingReveal>

          <LandingReveal delay={0.1}>
            <div className="mt-10 overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-white/85 p-3 shadow-[0_24px_80px_-38px_rgba(15,23,42,0.3)] backdrop-blur-sm sm:mt-14 sm:p-5 dark:border-zinc-800/70 dark:bg-zinc-900/70 dark:shadow-[0_24px_80px_-38px_rgba(0,0,0,0.8)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200/90 dark:border-zinc-800">
                    <th className="pb-4 pr-4 text-left font-medium text-slate-500 dark:text-zinc-400" />
                    <th className="pb-4 px-3 text-center font-medium text-slate-500 dark:text-zinc-400">IG / WhatsApp</th>
                    <th className="pb-4 px-3 text-center font-medium text-slate-500 dark:text-zinc-400">Rappi / Uber</th>
                    <th className="pb-4 px-3 text-center font-medium text-slate-500 dark:text-zinc-400">{tx("Desarrollo propio", "Custom development")}</th>
                    <th className="pb-4 px-3 text-center font-bold text-indigo-600 dark:text-indigo-300">
                      <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-indigo-700 ring-1 ring-indigo-100 dark:bg-indigo-500/15 dark:text-indigo-200 dark:ring-indigo-400/30">
                        GodCode
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.feature} className="border-b border-slate-100/90 transition hover:bg-slate-50/70 dark:border-zinc-800/70 dark:hover:bg-zinc-800/30">
                      <td className="py-4 pr-4 font-medium text-slate-700 dark:text-zinc-300">{row.feature}</td>
                      {([row.ig, row.rappi, row.custom, row.gc] as const).map((val, ci) => (
                        <td
                          key={ci}
                          className={cn(
                            "px-3 py-4 text-center",
                            ci === 3 && "bg-gradient-to-b from-indigo-50/85 to-indigo-100/60 font-semibold text-indigo-700 dark:from-indigo-950/40 dark:to-indigo-950/25 dark:text-indigo-200",
                          )}
                        >
                          {typeof val === "boolean"
                            ? val
                              ? <Check className="mx-auto h-4 w-4 text-emerald-500" aria-label={tx("Sí", "Yes")} />
                              : <X className="mx-auto h-4 w-4 text-slate-300 dark:text-zinc-600" aria-label={tx("No", "No")} />
                            : val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
              <p className="px-1 pt-3 text-xs text-slate-500 dark:text-zinc-400">
                {tx("* Comparativa referencial. Costos y condiciones de terceros pueden variar por país, categoría y promociones vigentes.", "* Reference comparison. Third-party costs and terms may vary by country and category.")}
              </p>
            </div>
          </LandingReveal>
        </div>
      </SectionShell>

      {/* ════ 9. TESTIMONIOS ════ */}
      <SectionShell
        id="testimonios"
        variant="dark"
        className="relative min-h-0 overflow-hidden border-y border-indigo-500/20 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.24),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(139,92,246,0.22),transparent_30%),radial-gradient(circle_at_50%_58%,rgba(37,99,235,0.2),transparent_38%),linear-gradient(180deg,#0f172a_0%,#070d1d_100%)]"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          <div className="absolute left-[-8rem] top-[8%] h-64 w-64 rounded-full bg-indigo-500/22 blur-3xl" />
          <div className="absolute right-[-7rem] top-[20%] h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute left-1/2 top-[62%] h-80 w-80 -translate-x-1/2 rounded-full bg-blue-500/14 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <LandingReveal>
            <Eyebrow className="!text-indigo-300">{tx("Testimonios", "Testimonials")}</Eyebrow>
            <h2 className="text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {tx("Lo que dicen nuestros clientes", "What our customers say")}
            </h2>
          </LandingReveal>
          <LandingTestimonials />
        </div>
      </SectionShell>

      {/* ════ 10. PRECIOS ════ */}
      <SectionShell id="precios" variant="white" className="min-h-0">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <LandingReveal>
            <Eyebrow>{tx("Precios", "Pricing")}</Eyebrow>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {tx("Planes simples, sin sorpresas", "Simple plans, no surprises")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-500 sm:text-base dark:text-zinc-400">
              {tx("Prueba el primer mes gratis. Cancela cuando quieras.", "Try the first month free. Cancel anytime.")}
            </p>
          </LandingReveal>

          {plans.length === 0 ? (
            <LandingReveal delay={0.1}>
              <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-dashed border-slate-300/80 bg-slate-50/80 px-5 py-8 text-center dark:border-zinc-600 dark:bg-zinc-900/40">
                <p className="text-sm font-medium text-slate-700 dark:text-zinc-200">{tx("Estamos preparando los planes", "We are preparing the plans")}</p>
                <p className="mt-2 text-xs text-slate-500 dark:text-zinc-400">{tx("Mientras tanto, puedes crear tu cuenta y explorar la plataforma gratis.", "Meanwhile, you can create your account and explore the platform for free.")}</p>
                <Link
                  href="/onboarding"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-indigo-600 px-6 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {tx("Empezar gratis", "Start for free")}
                </Link>
              </div>
            </LandingReveal>
          ) : (
            <div
              className={cn(
                "mt-10 grid items-stretch gap-4 sm:gap-6",
                plans.length === 1 && "mx-auto max-w-md",
                plans.length === 2 && "sm:grid-cols-2",
                plans.length >= 3 && "sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {plans.map((plan, index) => {
                const isPopular = index === popularIdx;
                const priceData = getPriceForContinent(plan, continent);
                return (
                  <LandingReveal key={plan.id} delay={index * 0.08}>
                    <div
                      className={cn(
                        "relative flex h-full flex-col rounded-2xl border bg-white p-5 transition sm:p-7 dark:bg-zinc-900/60",
                        isPopular
                          ? "z-10 scale-[1.02] border-2 border-indigo-500/60 shadow-xl shadow-indigo-500/10 sm:py-9"
                          : "border-slate-200/60 hover:border-slate-300 hover:shadow-lg dark:border-zinc-800 dark:hover:border-zinc-700",
                      )}
                    >
                      {isPopular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow sm:text-xs">
                          {tx("Popular", "Popular")}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                      <div className="mt-4 border-b border-slate-100 pb-4 dark:border-zinc-800">
                        <p className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">{formatPrice(priceData.price, priceData.currency)}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-500">{priceData.currency} / {tx("mes", "month")}</p>
                      </div>
                      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-slate-600 dark:text-zinc-300">
                        {plan.featureBullets.map((b, bi) => (
                          <li key={`${plan.id}-b-${bi}`} className="flex gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                            <span className="whitespace-pre-wrap">{b}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href="/onboarding"
                        className={cn(
                          "mt-6 inline-flex h-11 items-center justify-center rounded-xl text-center text-sm font-semibold transition",
                          isPopular
                            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700"
                            : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
                        )}
                      >
                        {tx("Comenzar", "Start")}
                      </Link>
                    </div>
                  </LandingReveal>
                );
              })}
            </div>
          )}

          <LandingReveal delay={0.2}>
            <p className="mt-8 text-center text-xs text-slate-400 dark:text-zinc-500">
              <Shield className="mr-1 inline h-3 w-3" aria-hidden />
              {tx("Garantía: si no te sirve, cancela sin costo ni penalidad.", "Guarantee: if it does not work for you, cancel with no penalty.")}
            </p>
          </LandingReveal>
        </div>
      </SectionShell>

      {/* ════ 11. FAQ ════ */}
      <SectionShell id="faq" variant="muted" className="flex items-center">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-6 lg:px-8">
          <LandingReveal>
            <Eyebrow>{tx("Dudas", "Questions")}</Eyebrow>
            <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              {tx("Preguntas frecuentes", "Frequently asked questions")}
            </h2>
          </LandingReveal>

          <LandingReveal delay={0.1}>
            <Card className="mt-10 rounded-2xl border-slate-200 bg-white p-0 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
              <Accordion type="single" collapsible className="border-0 bg-transparent shadow-none">
                {faqItems.map(({ q, a }, idx) => (
                  <AccordionItem key={q} value={String(idx)}>
                    <AccordionTrigger className="group text-left hover:bg-slate-50/80 dark:hover:bg-zinc-800/50">
                      <span className="flex-1 text-sm sm:text-base">{q}</span>
                      <span aria-hidden className="relative h-5 w-5 shrink-0">
                        <Plus className="absolute inset-0 h-5 w-5 text-slate-400 transition-opacity group-data-[state=open]:opacity-0 dark:text-zinc-500" />
                        <Minus className="absolute inset-0 hidden h-5 w-5 text-slate-400 transition-opacity group-data-[state=open]:block dark:text-zinc-500" />
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm">{a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Card>
          </LandingReveal>
        </div>
      </SectionShell>

      {/* wave: muted → dark */}
      <div className="relative -mb-px h-8 overflow-hidden bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-950 sm:h-12">
        <svg viewBox="0 0 1440 54" fill="none" preserveAspectRatio="none" className="absolute inset-0 block h-full w-full">
          <path d="M0 22C240 52 480 54 720 36S1200 0 1440 18V54H0Z" className="fill-current" />
        </svg>
      </div>

      {/* ════ 12. CTA FINAL + CONTACTO ════ */}
      <SectionShell id="contacto" variant="dark" className="relative -mt-px overflow-hidden pb-0">
        <LandingAnimatedGrid />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          {/* Hero CTA */}
          <LandingReveal>
            <div className="mx-auto max-w-3xl text-center">
              <Eyebrow className="!text-indigo-400">{tx("Último paso", "Final step")}</Eyebrow>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-[1.12]">
                {tx("Empieza hoy:", "Start today:")}{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  {tx("tu canal propio, sin comisiones", "your own channel, zero commissions")}
                </span>
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-relaxed text-slate-400 sm:text-base">
                {tx("Menú digital, pedidos, caja e inventario en un solo lugar. Sin comisiones por venta ni letra chica.", "Digital menu, orders, POS and inventory in one place. No sales commissions.")}
              </p>
              <ul className="mt-6 flex flex-col items-center gap-2 text-xs text-slate-400 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2 sm:text-sm">
                <li className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  {tx("Empieza en minutos", "Start in minutes")}
                </li>
                <li className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                  {tx("Cancelas cuando quieras", "Cancel anytime")}
                </li>
                <li className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0 text-indigo-400" aria-hidden />
                  {tx("Soporte en menos de 24 h", "Support in under 24h")}
                </li>
              </ul>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
                <Link
                  href="/onboarding"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-500 sm:h-[3.25rem] sm:text-base"
                >
                  {tx("Crear mi tienda gratis", "Create my free store")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href="#faq"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-600/80 bg-slate-800/40 px-6 text-sm font-medium text-slate-200 backdrop-blur transition hover:border-slate-500 hover:bg-slate-800/70 sm:h-[3.25rem]"
                >
                  {tx("Ver preguntas frecuentes", "View FAQ")}
                </a>
              </div>
            </div>
          </LandingReveal>

          {/* Newsletter + contacto (items-start: la tarjeta corta no se estira a la altura de la otra) */}
          <div className="mx-auto mt-14 grid max-w-6xl gap-6 lg:mt-20 lg:grid-cols-2 lg:gap-8 lg:items-start">
            <LandingReveal delay={0.08} className="self-start">
              <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-600/45 bg-slate-950/40 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] backdrop-blur-sm sm:rounded-[1.35rem]">
                <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 opacity-90" aria-hidden />
                <div className="flex flex-col p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <Mail className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{tx("Boletín", "Newsletter")}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold tracking-tight text-white sm:text-xl">
                    {tx("¿Aún no te decides?", "Still unsure?")}
                  </h3>
                  <p className="mt-1.5 max-w-md text-pretty text-sm leading-snug text-slate-400">
                    {tx("Deja tu correo y te escribimos solo cuando tengamos algo que te sirva. Nada de spam.", "Leave your email and we will only message you when useful. No spam.")}
                  </p>
                  <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/50 p-3.5 sm:p-4">
                    <LandingLeadForm dark layout="stacked" />
                  </div>
                </div>
              </div>
            </LandingReveal>

            <LandingReveal delay={0.12} className="self-start">
              <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-slate-600/45 bg-slate-950/40 shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset] backdrop-blur-sm sm:rounded-[1.35rem]">
                <div
                  className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 opacity-90"
                  aria-hidden
                />
                <div className="flex flex-col p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-violet-400">
                    <MessageCircle className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">{tx("Escríbenos", "Contact us")}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-bold tracking-tight text-white sm:text-xl">{tx("¿Tienes dudas?", "Have questions?")}</h3>
                  <p className="mt-1.5 max-w-md text-pretty text-sm leading-snug text-slate-400">
                    {tx("Cuéntanos tu rubro y qué necesitas. Respondemos por correo en menos de 24 horas.", "Tell us your business type and what you need. We reply by email within 24 hours.")}
                  </p>
                  <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-900/50 p-3.5 sm:p-4">
                    <LandingContactForm supportEmail={support} dark className="mt-0 space-y-3" />
                  </div>
                  <div className="mt-4 border-t border-slate-700/40 pt-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <a
                        href={`mailto:${support}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-indigo-400 transition hover:text-indigo-300"
                      >
                        <Headphones className="h-4 w-4 shrink-0" aria-hidden />
                        {support}
                      </a>
                      <Link
                        href="/onboarding"
                        className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-600/70 bg-slate-900/40 px-4 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800/50 sm:w-auto sm:shrink-0"
                      >
                        {tx("Crear mi tienda ya", "Create my store now")}
                      </Link>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-xs text-slate-500">
                      <li className="flex gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/90" aria-hidden />
                        {tx("Registro en minutos.", "Sign up in minutes.")}
                      </li>
                      <li className="flex gap-2">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500/90" aria-hidden />
                        {tx("Soporte humano si te atoras.", "Human support if you get stuck.")}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </LandingReveal>
          </div>

          <div className="pb-10 sm:pb-14" />
        </div>
      </SectionShell>
    </main>
  );
}
