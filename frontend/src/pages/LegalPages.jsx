import { useEffect } from "react";
import { Link } from "react-router-dom";
import { MarketingNav, MarketingFooter } from "@/components/Marketing";

function LegalShell({ title, subtitle, children }) {
  useEffect(() => {
    document.title = `${title} · MietGate`;
  }, [title]);
  return (
    <div className="bg-background min-h-screen">
      <MarketingNav />
      <article className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-brand-dark">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-3">{subtitle}</p>}
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/80">{children}</div>
        <p className="mt-14 text-xs text-muted-foreground border-t border-border pt-6">Stand: Juni 2026 · MietGate – ein Angebot der BORK Solutions UG (haftungsbeschränkt) i. Gr.</p>
      </article>
      <MarketingFooter />
    </div>
  );
}

const H = ({ children }) => <h2 className="font-display text-xl font-semibold text-brand-dark mb-2">{children}</h2>;
const Sec = ({ title, children }) => <section><H>{title}</H><div className="space-y-2">{children}</div></section>;
const List = ({ items }) => (
  <ul className="list-disc pl-5 space-y-1.5">{items.map((it, i) => <li key={i}>{it}</li>)}</ul>
);

export function Impressum() {
  return (
    <LegalShell title="Impressum" subtitle="Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)">
      <Sec title="Anbieter">
        <p>MietGate – ein Angebot der<br />
        <strong>BORK Solutions UG (haftungsbeschränkt) i. Gr.</strong><br />
        Fährstraße 217<br />40221 Düsseldorf<br />Deutschland</p>
      </Sec>
      <Sec title="Vertreten durch">
        <p>Geschäftsführer: Henry Bork</p>
      </Sec>
      <Sec title="Kontakt">
        <p>E-Mail: support@mietgate.de</p>
      </Sec>
      <Sec title="Gesellschaft in Gründung">
        <p>Die BORK Solutions UG (haftungsbeschränkt) befindet sich derzeit in Gründung (i. Gr.). Bis zur Eintragung in das Handelsregister handeln die Gründer für die Gesellschaft. Eine Handelsregisternummer liegt zum jetzigen Zeitpunkt noch nicht vor; sie wird nach erfolgter Eintragung an dieser Stelle ergänzt.</p>
      </Sec>
      <Sec title="Umsatzsteuer">
        <p>Eine Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz wurde bislang nicht erteilt und wird nach Erteilung an dieser Stelle ergänzt.</p>
      </Sec>
      <Sec title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>Henry Bork, Anschrift wie oben.</p>
      </Sec>
      <Sec title="EU-Streitschlichtung">
        <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a className="text-primary hover:underline" href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>. Unsere E-Mail-Adresse finden Sie oben.</p>
      </Sec>
      <Sec title="Verbraucherstreitbeilegung / Universalschlichtungsstelle">
        <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </Sec>
      <Sec title="Haftung für Inhalte">
        <p>Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
      </Sec>
      <Sec title="Haftung für Links">
        <p>Unser Angebot enthält ggf. Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für diese fremden Inhalte können wir keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber verantwortlich.</p>
      </Sec>
      <Sec title="Urheberrecht">
        <p>Die durch die Betreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts bedürfen unserer schriftlichen Zustimmung.</p>
      </Sec>
    </LegalShell>
  );
}

export function Datenschutz() {
  return (
    <LegalShell title="Datenschutzerklärung" subtitle="Informationen zur Verarbeitung personenbezogener Daten gemäß DSGVO">
      <Sec title="1. Verantwortlicher">
        <p>Verantwortlicher im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:</p>
        <p>BORK Solutions UG (haftungsbeschränkt) i. Gr.<br />Fährstraße 217, 40221 Düsseldorf, Deutschland<br />Geschäftsführer: Henry Bork<br />E-Mail: support@mietgate.de</p>
        <p>Für alle Fragen zum Datenschutz erreichen Sie uns unter support@mietgate.de. Ein Datenschutzbeauftragter ist gesetzlich nicht verpflichtend bestellt.</p>
      </Sec>

      <Sec title="2. Überblick über die Verarbeitung">
        <p>MietGate ist eine digitale Plattform, die Vermieter und Mietinteressenten bei der Organisation des Vermietungsprozesses unterstützt. Wir verarbeiten personenbezogene Daten, um Konten bereitzustellen, Bewerbungen zu ermöglichen, Dokumente sicher zu verwalten, die Kommunikation zu ermöglichen und Zahlungen abzuwickeln.</p>
      </Sec>

      <Sec title="3. Welche Daten wir verarbeiten">
        <List items={[
          "Konto- und Kontaktdaten: Name, E-Mail-Adresse, ggf. Telefonnummer, Rolle (Vermieter/Mieter), Organisationsangaben, Passwort (verschlüsselt gespeichert).",
          "Objekt- und Inseratsdaten: Angaben zu Wohnungen, die Vermieter erstellen.",
          "Bewerbungs- und Suchprofildaten: Angaben aus Bewerbungs- und Suchformularen (z. B. Haushalt, Einkommen, Einzugstermin).",
          "Sensible Bewerbungsunterlagen (soweit freiwillig hochgeladen): Personalausweis oder Reisepass, Gehaltsnachweise, Arbeitsverträge, SCHUFA-Auskunft, Mietschuldenfreiheitsbescheinigungen sowie weitere freiwillig bereitgestellte Dokumente.",
          "Kommunikationsdaten: Nachrichten zwischen Vermietern und Mietinteressenten, Support-Anfragen.",
          "Zahlungsdaten: Abo-/Kaufstatus, Transaktions-IDs. Kreditkarten-/Bankdaten werden ausschließlich durch unseren Zahlungsdienstleister Stripe verarbeitet, nicht durch uns gespeichert.",
          "Nutzungs- und Protokolldaten: technische Zugriffsdaten, Zeitstempel, Aktivitätsprotokolle zu Sicherheits- und Nachweiszwecken.",
        ]} />
      </Sec>

      <Sec title="4. Zwecke und Rechtsgrundlagen (Art. 6 DSGVO)">
        <List items={[
          "Bereitstellung von Konto und Plattform, Vertragserfüllung, Abwicklung von Abonnements und Zahlungen: Art. 6 Abs. 1 lit. b DSGVO.",
          "Verarbeitung von Bewerbungsdaten und -unterlagen: auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) sowie zur Durchführung vorvertraglicher Maßnahmen (Art. 6 Abs. 1 lit. b DSGVO). Sie stellen diese Daten freiwillig bereit, um sich bei einem Vermieter zu bewerben.",
          "Verarbeitung besonderer bzw. sensibler Unterlagen (z. B. Ausweisdokumente): ausschließlich auf Grundlage Ihrer ausdrücklichen Einwilligung. Sie entscheiden selbst, welche Dokumente Sie hochladen; ein Upload ist freiwillig.",
          "Gewährleistung von Sicherheit, Missbrauchsvermeidung und Verbesserung der Plattform: berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO).",
          "Erfüllung gesetzlicher Aufbewahrungspflichten: Art. 6 Abs. 1 lit. c DSGVO.",
          "Optionale Cookies/Statistik: nur mit Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG).",
        ]} />
      </Sec>

      <Sec title="5. Zugriff auf Bewerbungsdaten und Dokumente">
        <p>Ihre Bewerbungsdaten und hochgeladenen Dokumente werden ausschließlich dem jeweiligen Vermieter bzw. der Organisation zugänglich gemacht, bei der Sie sich beworben haben, sowie in engen Grenzen autorisierten MietGate-Administratoren (z. B. zur Missbrauchsprüfung oder Fehlerbehebung). Andere Nutzer erhalten zu keinem Zeitpunkt Zugriff auf Ihre Dokumente. Der Abruf erfolgt über zeitlich begrenzte, signierte Links.</p>
      </Sec>

      <Sec title="6. Empfänger und Auftragsverarbeiter">
        <p>Zur Erbringung unserer Leistungen setzen wir sorgfältig ausgewählte Dienstleister ein, mit denen – soweit erforderlich – Auftragsverarbeitungsverträge nach Art. 28 DSGVO bestehen:</p>
        <List items={[
          "Hosting & Infrastruktur: Betrieb der Anwendung sowie Server-, Datenbank- (MongoDB) und Dokumentenspeicher-Infrastruktur innerhalb der Europäischen Union.",
          "Stripe (Stripe Payments Europe, Ltd., Irland): Abwicklung von Zahlungen und Abonnements.",
          "Resend: Versand transaktionaler E-Mails wie Konto-Aktivierung, Benachrichtigungen und Passwort-Zurücksetzung.",
          "Google (Google Ireland Ltd.): optionale Anmeldung per Google-Login (OAuth), sofern Sie diese Funktion nutzen.",
        ]} />
        <p>Eine darüber hinausgehende Weitergabe an Dritte erfolgt nur, wenn dies gesetzlich zulässig oder verpflichtend ist. Soweit einzelne Dienstleister Daten außerhalb der EU/des EWR verarbeiten, erfolgt dies auf Grundlage geeigneter Garantien (insbesondere EU-Standardvertragsklauseln).</p>
      </Sec>

      <Sec title="7. Speicherdauer und Löschkonzept">
        <p>Wir speichern personenbezogene Daten nur so lange, wie es für die genannten Zwecke erforderlich ist. Für Bewerbungsdaten gelten automatisierte Löschfristen:</p>
        <List items={[
          "Abgelehnte Bewerbungen: Löschung spätestens nach 6 Monaten.",
          "Inaktive Bewerbungen / Konten: Löschung nach bis zu 12 Monaten Inaktivität.",
          "Erfolgreich abgeschlossene Vermietungen: Löschung nach bis zu 24 Monaten.",
        ]} />
        <p>Gesetzliche Aufbewahrungspflichten (z. B. handels- und steuerrechtliche Fristen für Rechnungen) bleiben unberührt. Sie können die Löschung Ihres Kontos jederzeit veranlassen.</p>
      </Sec>

      <Sec title="8. Cookies und Einwilligungsverwaltung">
        <p>Wir verwenden technisch notwendige Cookies, die für den Betrieb der Plattform erforderlich sind (z. B. zur Anmeldung). Optionale Cookies (Statistik/Marketing) setzen wir nur mit Ihrer Einwilligung ein, die Sie über unser Cookie-Banner erteilen und jederzeit widerrufen können. Details finden Sie in unserer <Link className="text-primary hover:underline" to="/cookies">Cookie-Richtlinie</Link>.</p>
      </Sec>

      <Sec title="9. Datensicherheit">
        <p>Wir treffen technische und organisatorische Maßnahmen, um Ihre Daten zu schützen: Transportverschlüsselung (TLS/HTTPS), verschlüsselte Ablage von Dokumenten, Zugriffsbeschränkungen nach dem Need-to-know-Prinzip, Rollen- und Rechtekonzepte sowie Protokollierung sicherheitsrelevanter Vorgänge.</p>
      </Sec>

      <Sec title="10. Automatisierte Entscheidungsfindung">
        <p>Eine automatisierte Entscheidungsfindung einschließlich Profiling mit rechtlicher Wirkung im Sinne des Art. 22 DSGVO findet nicht statt. Der auf der Plattform angezeigte „Matching-Score" ist lediglich eine unverbindliche, transparente Entscheidungshilfe. Die Auswahl von Mietern trifft ausschließlich der jeweilige Vermieter.</p>
      </Sec>

      <Sec title="11. Ihre Rechte">
        <p>Sie haben nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch (Art. 21). Erteilte Einwilligungen können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Wenden Sie sich hierzu an support@mietgate.de.</p>
      </Sec>

      <Sec title="12. Beschwerderecht bei der Aufsichtsbehörde">
        <p>Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist insbesondere die Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW), Kavalleriestraße 2–4, 40213 Düsseldorf.</p>
      </Sec>

      <Sec title="13. Pflicht zur Bereitstellung">
        <p>Bestimmte Daten (z. B. E-Mail-Adresse) sind für die Nutzung der Plattform erforderlich. Das Hochladen von Bewerbungsunterlagen ist stets freiwillig; ohne bestimmte Angaben kann eine Bewerbung jedoch für Vermieter weniger aussagekräftig sein.</p>
      </Sec>
    </LegalShell>
  );
}

export function AGB() {
  return (
    <LegalShell title="Allgemeine Geschäftsbedingungen (AGB)" subtitle="Bedingungen für die Nutzung der MietGate-Plattform">
      <Sec title="§ 1 Geltungsbereich und Anbieter">
        <p>Diese AGB gelten für die Nutzung der Plattform „MietGate" (nachfolgend „Plattform"), betrieben von der BORK Solutions UG (haftungsbeschränkt) i. Gr., Fährstraße 217, 40221 Düsseldorf (nachfolgend „MietGate", „wir"). Sie gelten gegenüber Vermietern, Maklern, Hausverwaltungen (nachfolgend „Vermieter") sowie gegenüber Mietinteressenten und Bewerbern (nachfolgend „Mieter"). Abweichende Bedingungen der Nutzer finden keine Anwendung.</p>
      </Sec>
      <Sec title="§ 2 Leistungsgegenstand">
        <p>MietGate stellt eine technische Plattform bereit, die insbesondere folgende Funktionen ermöglicht: Erstellung von Wohnungsinseraten durch Vermieter, Erstellung von Such- und Bewerbungsprofilen durch Mieter, Upload von Bewerbungsunterlagen, gebündelte Verwaltung eingehender Bewerbungen, Kommunikation zwischen den Parteien sowie die digitale Organisation des Vermietungsprozesses.</p>
        <p><strong>MietGate wird nicht Vertragspartner des Mietvertrags.</strong> Ein etwaiger Mietvertrag kommt ausschließlich zwischen Vermieter und Mieter zustande. MietGate ist kein Makler und schuldet keine Vermittlung von Wohnraum.</p>
      </Sec>
      <Sec title="§ 3 Registrierung und Nutzerkonto">
        <p>Die Nutzung setzt eine Registrierung voraus. Der Nutzer ist verpflichtet, wahrheitsgemäße und vollständige Angaben zu machen und diese aktuell zu halten. Zugangsdaten sind geheim zu halten und dürfen nicht an Dritte weitergegeben werden. Der Nutzer ist für Aktivitäten unter seinem Konto verantwortlich.</p>
      </Sec>
      <Sec title="§ 4 Mindestalter">
        <p>Die Nutzung der Plattform ist ausschließlich volljährigen Personen (mindestens 18 Jahre) gestattet. Mit der Registrierung bestätigt der Nutzer, das 18. Lebensjahr vollendet zu haben.</p>
      </Sec>
      <Sec title="§ 5 Pflichten der Vermieter">
        <List items={[
          "Nur wahrheitsgemäße Angaben zu Objekten; keine Fake- oder Lockinserate.",
          "Rechtmäßige Verarbeitung der von Bewerbern bereitgestellten Daten und Dokumente unter Beachtung des Datenschutzrechts.",
          "Keine diskriminierenden Auswahlkriterien (insb. Verstöße gegen das Allgemeine Gleichbehandlungsgesetz).",
          "Vertrauliche Behandlung sensibler Bewerbungsunterlagen sowie deren Löschung, sobald sie nicht mehr benötigt werden.",
        ]} />
      </Sec>
      <Sec title="§ 6 Pflichten der Mieter">
        <List items={[
          "Nur wahrheitsgemäße Angaben in Profilen und Bewerbungen; keine gefälschten oder fremden Dokumente.",
          "Hochladen ausschließlich eigener Unterlagen bzw. solcher, zu deren Weitergabe der Nutzer berechtigt ist.",
          "Keine missbräuchliche Nutzung, kein Identitätsdiebstahl.",
        ]} />
      </Sec>
      <Sec title="§ 7 Zulässige Inhalte und Verbot falscher Angaben">
        <p>Nutzer dürfen keine rechtswidrigen, beleidigenden, diskriminierenden, irreführenden oder die Rechte Dritter verletzenden Inhalte einstellen. Falsche Angaben, Fake-Inserate und Fake-Bewerbungen sind untersagt und können zur Sperrung führen (siehe § 12 sowie unsere Plattformregeln).</p>
      </Sec>
      <Sec title="§ 8 Dokumentenupload">
        <p>Der Upload von Dokumenten erfolgt freiwillig. Dokumente werden verschlüsselt gespeichert und ausschließlich dem jeweiligen Vermieter sowie autorisierten MietGate-Administratoren zugänglich gemacht. Der Nutzer versichert, zur Weitergabe der hochgeladenen Unterlagen berechtigt zu sein.</p>
      </Sec>
      <Sec title="§ 9 Kommunikationsregeln">
        <p>Die Kommunikationsfunktionen dürfen nur für die Anbahnung und Abwicklung von Mietverhältnissen genutzt werden. Spam, Werbung, automatisierte Anfragen sowie die Umgehung der Plattform (z. B. gezielte Abwerbung außerhalb des vorgesehenen Prozesses) sind unzulässig.</p>
      </Sec>
      <Sec title="§ 10 Preise und Zahlungsbedingungen">
        <p>MietGate bietet kostenpflichtige Abonnements für Vermieter (u. a. Starter, Plus, Makler) sowie kostenpflichtige Zusatzfunktionen (z. B. White-Label-Add-on) und ein optionales Mieter-Premium (verifiziertes Profil) an. Die jeweils aktuellen Preise, Leistungsumfänge und Abrechnungsintervalle (monatlich/jährlich) werden vor Vertragsschluss auf der Plattform angezeigt.</p>
        <p>Der Einstieg ist kostenlos möglich. Eine Zahlungsmethode wird erst erforderlich, wenn kostenpflichtige Funktionen gebucht bzw. Bewerbungslinks veröffentlicht werden. Die Zahlungsabwicklung erfolgt über den Dienstleister Stripe. Zahlungen sind mit Vertragsschluss bzw. zu Beginn des jeweiligen Abrechnungszeitraums fällig.</p>
      </Sec>
      <Sec title="§ 11 Laufzeit und Kündigung von Abonnements">
        <p>Abonnements werden für das gewählte Intervall abgeschlossen und verlängern sich automatisch um die jeweilige Laufzeit, sofern sie nicht zum Ende des laufenden Abrechnungszeitraums gekündigt werden. Die Kündigung ist jederzeit über das Nutzerkonto möglich und wird zum Ende der laufenden Periode wirksam. Kostenlose Konten können jederzeit gelöscht werden. Das Widerrufsrecht für Verbraucher (siehe <Link className="text-primary hover:underline" to="/widerruf">Widerrufsbelehrung</Link>) bleibt unberührt.</p>
      </Sec>
      <Sec title="§ 12 Sperrung von Nutzerkonten">
        <p>Bei Verstößen gegen diese AGB, gegen unsere Plattformregeln oder gegen geltendes Recht können wir – abgestuft nach Schwere – Inhalte entfernen, Konten verwarnen, temporär oder dauerhaft sperren. Bei schwerwiegenden Verstößen (z. B. Identitätsdiebstahl, Dokumentenmissbrauch) ist eine sofortige Sperrung ohne Vorwarnung möglich.</p>
      </Sec>
      <Sec title="§ 13 Haftungsbeschränkung">
        <p>MietGate stellt lediglich die technische Plattform bereit und überprüft die von Nutzern eingestellten Angaben, Inserate und Dokumente nicht auf Richtigkeit, Vollständigkeit oder Rechtmäßigkeit. Für Inhalte und Handlungen der Nutzer übernehmen wir keine Gewähr.</p>
        <p>Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit. Bei einfacher Fahrlässigkeit haften wir nur bei Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht) und begrenzt auf den vertragstypischen, vorhersehbaren Schaden. Eine weitergehende Haftung ist ausgeschlossen. Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.</p>
      </Sec>
      <Sec title="§ 14 Keine Garantie für Vermittlung / kein Anspruch auf Mietvertrag">
        <p>Ein Erfolg der Vermietung wird nicht geschuldet. Nutzer haben keinen Anspruch darauf, über die Plattform eine Wohnung zu finden, einen Bewerber zugewiesen zu bekommen oder einen Mietvertrag abzuschließen.</p>
      </Sec>
      <Sec title="§ 15 Freistellung">
        <p>Der Nutzer stellt MietGate von sämtlichen Ansprüchen Dritter frei, die aufgrund einer von ihm zu vertretenden Rechtsverletzung (insb. durch eingestellte Inhalte, hochgeladene Dokumente oder unwahre Angaben) geltend gemacht werden, einschließlich angemessener Kosten der Rechtsverteidigung.</p>
      </Sec>
      <Sec title="§ 16 Änderungen der AGB">
        <p>Wir können diese AGB mit Wirkung für die Zukunft ändern, sofern dies aus triftigem Grund erforderlich ist. Über Änderungen informieren wir rechtzeitig. Widerspricht der Nutzer nicht innerhalb der genannten Frist, gelten die geänderten Bedingungen als angenommen; hierauf wird gesondert hingewiesen.</p>
      </Sec>
      <Sec title="§ 17 Anwendbares Recht und Gerichtsstand">
        <p>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Zwingende verbraucherschützende Vorschriften des Staates, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, bleiben unberührt. Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand Düsseldorf.</p>
      </Sec>
      <Sec title="§ 18 Salvatorische Klausel">
        <p>Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. An die Stelle der unwirksamen Regelung tritt die gesetzlich zulässige Regelung, die dem wirtschaftlichen Zweck der unwirksamen am nächsten kommt.</p>
      </Sec>
    </LegalShell>
  );
}

export function Widerruf() {
  return (
    <LegalShell title="Widerrufsbelehrung" subtitle="Für Verbraucher bei kostenpflichtigen digitalen Diensten und Abonnements">
      <Sec title="Widerrufsrecht">
        <p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses.</p>
        <p>Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (BORK Solutions UG (haftungsbeschränkt) i. Gr., Fährstraße 217, 40221 Düsseldorf, E-Mail: support@mietgate.de) mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.</p>
        <p>Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.</p>
      </Sec>
      <Sec title="Folgen des Widerrufs">
        <p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.</p>
      </Sec>
      <Sec title="Vorzeitiger Beginn der Dienstleistung / Erlöschen des Widerrufsrechts">
        <p>Bei einem Vertrag über die Erbringung digitaler Dienstleistungen erlischt das Widerrufsrecht, wenn wir mit der Ausführung des Vertrags begonnen haben, nachdem Sie</p>
        <List items={[
          "ausdrücklich zugestimmt haben, dass wir mit der Ausführung der Dienstleistung vor Ablauf der Widerrufsfrist beginnen, und",
          "Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre Zustimmung mit Beginn der Ausführung des Vertrags Ihr Widerrufsrecht verlieren, und",
          "wir die Dienstleistung vollständig erbracht haben.",
        ]} />
        <p>Mit der aktiven Buchung einer kostenpflichtigen Funktion und der entsprechenden Bestätigung auf der Plattform erklären Sie diese ausdrückliche Zustimmung und nehmen zur Kenntnis, dass Ihr Widerrufsrecht mit vollständiger Vertragserfüllung erlischt.</p>
      </Sec>
      <Sec title="Muster-Widerrufsformular">
        <p>(Wenn Sie den Vertrag widerrufen wollen, füllen Sie bitte dieses Formular aus und senden Sie es zurück.)</p>
        <div className="rounded-xl border border-border bg-card p-5 text-sm space-y-2">
          <p>An: BORK Solutions UG (haftungsbeschränkt) i. Gr., Fährstraße 217, 40221 Düsseldorf, E-Mail: support@mietgate.de</p>
          <p>Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung (*):</p>
          <p>________________________________________________</p>
          <p>Bestellt am (*) / erhalten am (*): ____________________</p>
          <p>Name des/der Verbraucher(s): ____________________</p>
          <p>Anschrift des/der Verbraucher(s): ____________________</p>
          <p>Datum: ____________________</p>
          <p>Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ____________________</p>
          <p className="text-muted-foreground">(*) Unzutreffendes streichen.</p>
        </div>
      </Sec>
    </LegalShell>
  );
}

export function Cookies() {
  return (
    <LegalShell title="Cookie-Richtlinie" subtitle="Informationen zu Cookies und Ihrer Einwilligung">
      <Sec title="Was sind Cookies?">
        <p>Cookies sind kleine Textdateien, die auf Ihrem Gerät gespeichert werden. Wir verwenden Cookies und vergleichbare Technologien, um die Plattform bereitzustellen, sie sicher zu machen und – mit Ihrer Einwilligung – zu verbessern.</p>
      </Sec>
      <Sec title="Cookie-Banner">
        <p>Beim ersten Besuch informiert Sie unser Banner: „Wir verwenden nur technisch notwendige Cookies. Optionale Analyse-Cookies helfen uns, MietGate zu verbessern." Sie können „Alle akzeptieren" oder „Nur notwendige" wählen. Ihre Auswahl wird gespeichert und kann jederzeit geändert werden.</p>
      </Sec>
      <Sec title="Kategorien">
        <List items={[
          "Notwendig: Für den Betrieb erforderlich (z. B. Anmeldung/Session, Sicherheit, Speicherung Ihrer Cookie-Auswahl). Diese Cookies sind nicht abwählbar und werden auf Grundlage von § 25 Abs. 2 TDDDG gesetzt.",
          "Statistik: Helfen uns, die Nutzung anonymisiert bzw. pseudonymisiert zu verstehen und die Plattform zu verbessern. Nur mit Ihrer Einwilligung.",
          "Marketing: Ermöglichen relevante Inhalte und Reichweitenmessung. Nur mit Ihrer Einwilligung.",
        ]} />
      </Sec>
      <Sec title="Einwilligungsverwaltung">
        <p>Optionale Cookies (Statistik/Marketing) werden erst gesetzt, nachdem Sie eingewilligt haben (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Sie können Ihre Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie die Cookie-Auswahl über den Link im Banner bzw. in Ihrem Browser zurücksetzen. Weitere Informationen finden Sie in unserer <Link className="text-primary hover:underline" to="/datenschutz">Datenschutzerklärung</Link>.</p>
      </Sec>
    </LegalShell>
  );
}

export function Plattformregeln() {
  return (
    <LegalShell title="Community- und Plattformregeln" subtitle="Für ein sicheres, faires und respektvolles Miteinander auf MietGate">
      <Sec title="Grundsatz">
        <p>MietGate soll ein vertrauenswürdiger Ort für Vermieter und Mieter sein. Die folgenden Regeln ergänzen unsere <Link className="text-primary hover:underline" to="/agb">AGB</Link> und sind für alle Nutzer verbindlich.</p>
      </Sec>
      <Sec title="Verbotene Verhaltensweisen">
        <List items={[
          "Fake-Inserate: Wohnungsanzeigen, die nicht existieren, irreführend sind oder nur der Datensammlung dienen.",
          "Fake-Bewerbungen: Bewerbungen mit falscher Identität, erfundenen Angaben oder gefälschten Unterlagen.",
          "Diskriminierung: Benachteiligung aufgrund von Herkunft, Geschlecht, Religion, Behinderung, Alter, sexueller Identität o. Ä. (u. a. AGG).",
          "Belästigung: beleidigende, bedrohliche, sexuell übergriffige oder herabwürdigende Kommunikation.",
          "Missbrauch von Dokumenten: unbefugte Nutzung, Weitergabe, Speicherung oder Veröffentlichung fremder Unterlagen.",
          "Identitätsdiebstahl: Auftreten unter fremdem Namen oder Verwendung fremder Ausweis-/Nachweisdokumente.",
          "Umgehung der Plattform: gezielte Verlagerung des Prozesses, um Gebühren zu umgehen oder Schutzmechanismen auszuhebeln.",
          "Spam und Automatisierung: unerwünschte Werbung, Massennachrichten, Bots oder automatisierte Anfragen.",
        ]} />
      </Sec>
      <Sec title="Umgang mit Dokumenten">
        <p>Bewerbungsunterlagen dürfen ausschließlich für die Prüfung der konkreten Bewerbung verwendet werden. Vermieter sind verpflichtet, Dokumente vertraulich zu behandeln, nicht weiterzugeben und nach Abschluss des Auswahlprozesses zu löschen, sofern keine gesetzliche Grundlage die weitere Speicherung erfordert.</p>
      </Sec>
      <Sec title="Sanktionsstufen">
        <p>Bei Verstößen gehen wir – je nach Schwere – abgestuft vor:</p>
        <List items={[
          "Stufe 1 – Warnung: Hinweis auf den Verstoß mit der Aufforderung, das Verhalten zu unterlassen oder Inhalte zu korrigieren.",
          "Stufe 2 – Temporäre Sperre: vorübergehende Einschränkung oder Sperrung des Kontos und/oder Entfernung betroffener Inhalte.",
          "Stufe 3 – Dauerhafte Sperre: endgültige Sperrung des Kontos bei schweren oder wiederholten Verstößen.",
        ]} />
        <p>Bei besonders schwerwiegenden Verstößen (z. B. Identitätsdiebstahl, Dokumentenmissbrauch, strafbaren Handlungen) behalten wir uns eine sofortige dauerhafte Sperrung ohne vorherige Warnung sowie ggf. die Einschaltung der zuständigen Behörden vor.</p>
      </Sec>
      <Sec title="Meldung von Verstößen">
        <p>Verstöße können Sie jederzeit an support@mietgate.de melden. Wir prüfen jede Meldung sorgfältig und vertraulich.</p>
      </Sec>
    </LegalShell>
  );
}
