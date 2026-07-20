import { MarketingNav, MarketingFooter } from "@/components/Marketing";

function LegalShell({ title, subtitle, children }) {
  return (
    <div className="bg-background min-h-screen">
      <MarketingNav />
      <article className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-brand-dark">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-3">{subtitle}</p>}
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/80">{children}</div>
        <p className="mt-14 text-xs text-muted-foreground border-t border-border pt-6">
          Hinweis: Dieser Text ist eine Vorlage und ersetzt keine Rechtsberatung. Bitte lassen Sie Ihre rechtlichen Angaben vor Veröffentlichung prüfen.
        </p>
      </article>
      <MarketingFooter />
    </div>
  );
}

const H = ({ children }) => <h2 className="font-display text-xl font-semibold text-brand-dark mb-2">{children}</h2>;
const Sec = ({ title, children }) => <section><H>{title}</H><div className="space-y-2">{children}</div></section>;

export function Impressum() {
  return (
    <LegalShell title="Impressum" subtitle="Angaben gemäß § 5 TMG">
      <Sec title="Anbieter">
        <p>MietGate<br />[Firmenname / Inhaber]<br />[Straße & Hausnummer]<br />[PLZ & Ort]<br />Deutschland</p>
      </Sec>
      <Sec title="Kontakt">
        <p>E-Mail: kontakt@mietgate.de<br />Telefon: [Telefonnummer]</p>
      </Sec>
      <Sec title="Vertretungsberechtigt">
        <p>[Name der vertretungsberechtigten Person]</p>
      </Sec>
      <Sec title="Registereintrag & USt-IdNr.">
        <p>Registergericht: [z.B. Amtsgericht ...]<br />Registernummer: [HRB ...]<br />Umsatzsteuer-ID gemäß § 27a UStG: [DE...]</p>
      </Sec>
      <Sec title="Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)">
        <p>[Name, Anschrift]</p>
      </Sec>
      <Sec title="Streitschlichtung">
        <p>Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: ec.europa.eu/consumers/odr. Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </Sec>
    </LegalShell>
  );
}

export function Datenschutz() {
  return (
    <LegalShell title="Datenschutzerklärung" subtitle="Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO">
      <Sec title="1. Verantwortlicher">
        <p>Verantwortlich für die Datenverarbeitung ist MietGate, [Anschrift], E-Mail: kontakt@mietgate.de.</p>
      </Sec>
      <Sec title="2. Welche Daten wir verarbeiten">
        <p>Bei der Nutzung von MietGate verarbeiten wir insbesondere: Konto- und Kontaktdaten (Name, E-Mail, Telefon), Bewerbungsdaten (Angaben aus dem Bewerbungsformular), hochgeladene Dokumente sowie Nutzungs- und Protokolldaten.</p>
      </Sec>
      <Sec title="3. Zwecke & Rechtsgrundlagen">
        <p>Die Verarbeitung erfolgt zur Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO), aufgrund Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, insbesondere bei Bewerbungen) sowie zur Wahrung berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO).</p>
      </Sec>
      <Sec title="4. Weitergabe an Vermieter">
        <p>Bewerbungsdaten und Dokumente werden ausschließlich dem jeweiligen Vermieter bzw. der Organisation zur Verfügung gestellt, bei der Sie sich beworben haben. Eine Weitergabe an unbeteiligte Dritte findet nicht statt.</p>
      </Sec>
      <Sec title="5. Hosting & Sicherheit">
        <p>Wir hosten innerhalb der EU. Dokumente werden verschlüsselt gespeichert und sind ausschließlich über zeitlich begrenzte, signierte Links für Berechtigte abrufbar.</p>
      </Sec>
      <Sec title="6. Speicherdauer / Löschkonzept">
        <p>Wir speichern Bewerbungsdaten nur so lange, wie es erforderlich ist: bei abgelehnten Bewerbungen bis zu 6 Monate, bei Inaktivität bis zu 12 Monate, bei erfolgreicher Vermietung bis zu 24 Monate – sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
      </Sec>
      <Sec title="7. Ihre Rechte">
        <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch. Zudem können Sie sich bei einer Aufsichtsbehörde beschweren. Anfragen richten Sie bitte an kontakt@mietgate.de.</p>
      </Sec>
    </LegalShell>
  );
}

export function AGB() {
  return (
    <LegalShell title="Allgemeine Geschäftsbedingungen" subtitle="AGB für die Nutzung der MietGate-Plattform">
      <Sec title="1. Geltungsbereich">
        <p>Diese AGB gelten für die Nutzung der SaaS-Plattform MietGate durch Vermieter, Makler, Hausverwaltungen und Bewerber.</p>
      </Sec>
      <Sec title="2. Leistungen">
        <p>MietGate stellt eine Plattform zur digitalen Verwaltung von Mietbewerbungen, Dokumenten und Besichtigungen bereit. MietGate ist kein Immobilienportal und vermittelt keine Wohnungen.</p>
      </Sec>
      <Sec title="3. Vertragsschluss & Konto">
        <p>Mit der Registrierung kommt ein Nutzungsvertrag zustande. Nutzer sind für die Richtigkeit ihrer Angaben und die Vertraulichkeit ihrer Zugangsdaten verantwortlich.</p>
      </Sec>
      <Sec title="4. Preise & Zahlung">
        <p>Es gelten die zum Zeitpunkt der Buchung gültigen Preise. Abonnements verlängern sich automatisch und können zum Ende der jeweiligen Laufzeit gekündigt werden. Bei Preisänderungen behalten Bestandskunden ihren bisherigen Tarif.</p>
      </Sec>
      <Sec title="5. Pflichten der Nutzer">
        <p>Nutzer verpflichten sich, keine rechtswidrigen Inhalte hochzuladen und geltendes Datenschutzrecht einzuhalten.</p>
      </Sec>
      <Sec title="6. Haftung">
        <p>MietGate haftet nach den gesetzlichen Bestimmungen. Für die Auswahl von Mietern sowie den Abschluss von Mietverträgen sind ausschließlich die Nutzer verantwortlich.</p>
      </Sec>
      <Sec title="7. Kündigung">
        <p>Der Vertrag kann jederzeit zum Ende der Abrechnungsperiode gekündigt werden. Kostenlose Konten können jederzeit gelöscht werden.</p>
      </Sec>
    </LegalShell>
  );
}
