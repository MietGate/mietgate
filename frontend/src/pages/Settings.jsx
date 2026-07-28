import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { validateFile } from "@/lib/validateFile";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Mail } from "lucide-react";
import Billing from "@/pages/landlord/Billing";

function NotificationSettings() {
  const [categories, setCategories] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/me/notification-settings")
      .then((r) => setCategories(r.data.categories))
      .catch(() => toast.error("Einstellungen konnten nicht geladen werden"));
  }, []);

  const toggle = (key, value) => setCategories(categories.map((c) => (c.key === key ? { ...c, enabled: value } : c)));

  const save = async () => {
    setSaving(true);
    try {
      const settings = Object.fromEntries(categories.map((c) => [c.key, c.enabled]));
      await api.put("/me/notification-settings", { settings });
      toast.success("Benachrichtigungen gespeichert");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  if (!categories) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div>
        <h2 className="font-display font-bold text-lg flex items-center gap-2"><Mail className="h-4 w-4" /> E-Mail-Benachrichtigungen</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Legen Sie fest, worüber wir Sie per E-Mail informieren. Im Postfach der Anwendung sehen Sie
          weiterhin alles — unabhängig von diesen Einstellungen.
        </p>
      </div>
      <div className="divide-y divide-border">
        {categories.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm">{c.label}</span>
            <Switch checked={c.enabled} onCheckedChange={(v) => toggle(c.key, v)} data-testid={`notif-${c.key}`} />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Nachrichten zu Zahlungen, Vertragslaufzeit und Ihrem Konto senden wir unabhängig davon immer.
      </p>
      <Button onClick={save} disabled={saving} data-testid="save-notifications">
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Speichern
      </Button>
    </div>
  );
}

function OrgEmailTemplates() {
  const [templates, setTemplates] = useState(null);
  const [saving, setSaving] = useState(null);

  const load = () => {
    api.get("/organization/email-templates").then((r) => setTemplates(r.data)).catch(() => toast.error("Vorlagen konnten nicht geladen werden"));
  };
  useEffect(load, []);

  const draftOf = (t) => t.override || { subject: t.subject, title: t.title, body_html: t.body_html };
  const setDraft = (key, patch) => setTemplates(templates.map((t) => (t.key === key
    ? { ...t, override: { ...draftOf(t), ...patch } } : t)));

  const save = async (t) => {
    setSaving(t.key);
    const draft = draftOf(t);
    try {
      await api.put(`/organization/email-templates/${t.key}`, draft);
      toast.success("Vorlage gespeichert");
    } catch (e) { toast.error(e.response?.data?.detail || "Fehler beim Speichern"); }
    finally { setSaving(null); }
  };

  const reset = async (t) => {
    setSaving(t.key);
    try {
      await api.delete(`/organization/email-templates/${t.key}`);
      toast.success("Auf Standard zurückgesetzt");
      load();
    } catch (e) { toast.error(e.response?.data?.detail || "Fehler"); }
    finally { setSaving(null); }
  };

  if (!templates) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 mt-6">
      <div>
        <h3 className="font-display font-bold flex items-center gap-2"><Mail className="h-4 w-4" /> E-Mail-Vorlagen</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Überschreiben Sie die Texte der E-Mails, die Bewerber im Namen Ihres Unternehmens erhalten. Ohne Anpassung gilt der MietGate-Standardtext.
        </p>
      </div>
      {templates.map((t) => {
        const draft = draftOf(t);
        return (
          <details key={t.key} className="rounded-lg border border-border overflow-hidden" data-testid={`org-template-${t.key}`}>
            <summary className="px-4 py-3 cursor-pointer font-medium flex items-center justify-between list-none">
              <span>{t.name}</span>
              {t.override && <span className="text-xs text-primary font-normal">Angepasst</span>}
            </summary>
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <div><Label>Betreff</Label><Input value={draft.subject} onChange={(e) => setDraft(t.key, { subject: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Überschrift im E-Mail-Text</Label><Input value={draft.title} onChange={(e) => setDraft(t.key, { title: e.target.value })} className="mt-1.5" /></div>
              <div>
                <Label>Inhalt (HTML)</Label>
                <Textarea rows={5} value={draft.body_html} onChange={(e) => setDraft(t.key, { body_html: e.target.value })} className="mt-1.5 font-mono text-sm" />
                <p className="text-xs text-muted-foreground mt-1.5">Platzhalter: {t.placeholders?.map((p) => `{{${p}}}`).join(", ")}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => save(t)} disabled={saving === t.key} data-testid={`save-org-template-${t.key}`}>
                  {saving === t.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Speichern
                </Button>
                {t.override && (
                  <Button size="sm" variant="ghost" onClick={() => reset(t)} disabled={saving === t.key}>
                    <RotateCcw className="h-4 w-4 mr-2" /> Zurücksetzen
                  </Button>
                )}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}

export default function Settings() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isLandlord = user?.role === "landlord";
  // "abo" is the historic alias for the billing tab; every other tab is addressable by
  // its own name so e-mails can link straight to the right one.
  const TAB_ALIASES = { abo: "billing" };
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState(requestedTab ? (TAB_ALIASES[requestedTab] || requestedTab) : "profile");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [profile, setProfile] = useState({ first_name: user?.first_name || "", last_name: user?.last_name || "", phone: user?.phone || "" });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [confirmPw, setConfirmPw] = useState("");
  const isGoogleUser = user?.auth_provider === "google";
  const [org, setOrg] = useState(null);
  const [wlAddon, setWlAddon] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isLandlord) {
      api.get("/organization").then((r) => setOrg(r.data)).catch(() => {});
      api.get("/subscription").then((r) => setWlAddon(!!r.data.white_label_addon)).catch(() => {});
    }
  }, [isLandlord]);

  const saveProfile = async () => {
    setSaving(true);
    try { await api.put("/me/profile", profile); await refresh(); toast.success("Profil gespeichert"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } finally { setSaving(false); }
  };
  const changePw = async () => {
    if (!isGoogleUser && !pw.current_password) { toast.error("Bitte geben Sie Ihr aktuelles Passwort ein."); return; }
    if (pw.new_password.length < 8) { toast.error("Das neue Passwort muss mindestens 8 Zeichen lang sein."); return; }
    if (pw.new_password !== confirmPw) { toast.error("Die Passwörter stimmen nicht überein."); return; }
    try {
      await api.post("/me/password", isGoogleUser ? { new_password: pw.new_password } : pw);
      toast.success("Passwort geändert"); setPw({ current_password: "", new_password: "" }); setConfirmPw("");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const saveOrg = async () => {
    try { await api.put("/organization", org); toast.success("Organisation gespeichert"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const setWL = (patch) => setOrg({ ...org, white_label: { ...(org.white_label || {}), ...patch } });
  const deleteAccount = async () => {
    if (!window.confirm("Konto und alle Bewerbungsdaten wirklich unwiderruflich löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    if (!window.confirm("Letzte Bestätigung: Alle Ihre Bewerbungen, Dokumente und Nachrichten werden endgültig gelöscht. Fortfahren?")) return;
    setDeletingAccount(true);
    try {
      await api.delete("/me/account");
      toast.success("Konto gelöscht");
      await logout();
      navigate("/");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); setDeletingAccount(false); }
  };
  const logoRef = useRef();
  const [logoPreview, setLogoPreview] = useState(null);
  useEffect(() => {
    const logoId = org?.white_label?.logo;
    if (!logoId) { setLogoPreview(null); return; }
    let url;
    api.get(`/documents/${logoId}/download`, { responseType: "blob" }).then((r) => {
      url = URL.createObjectURL(r.data); setLogoPreview(url);
    }).catch(() => setLogoPreview(null));
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [org?.white_label?.logo]);
  const uploadLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = validateFile(file, { maxMB: 15, extensions: ["png", "jpg", "jpeg", "webp"] });
    if (err) { toast.error(err); if (logoRef.current) logoRef.current.value = ""; return; }
    const fd = new FormData(); fd.append("file", file);
    try { const { data } = await api.post("/uploads/image", fd); setWL({ logo: data.id }); toast.success("Logo hochgeladen (Speichern nicht vergessen)"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { if (logoRef.current) logoRef.current.value = ""; }
  };

  return (
    <div className={`space-y-6 animate-fade-up ${isLandlord ? "max-w-4xl" : "max-w-2xl"}`}>
      <h1 className="font-display text-3xl font-bold">Einstellungen</h1>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profile" data-testid="tab-profile">Profil</TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">Benachrichtigungen</TabsTrigger>
          <TabsTrigger value="password">Passwort</TabsTrigger>
          {isLandlord && <TabsTrigger value="org" data-testid="tab-org">Organisation</TabsTrigger>}
          {isLandlord && <TabsTrigger value="billing" data-testid="tab-billing">Abo & Zahlungen</TabsTrigger>}
          {isLandlord && <TabsTrigger value="whitelabel">White-Label</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Vorname</Label><Input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} className="mt-1.5" data-testid="profile-firstname" /></div>
              <div><Label>Nachname</Label><Input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} className="mt-1.5" /></div>
            </div>
            <div><Label>E-Mail</Label><Input value={user?.email} disabled className="mt-1.5" /></div>
            <div><Label>Telefon</Label><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className="mt-1.5" /></div>
            <Button onClick={saveProfile} disabled={saving} data-testid="save-profile">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Speichern</Button>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="password" className="mt-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            {isGoogleUser ? (
              <p className="text-sm text-muted-foreground">Sie sind mit Google angemeldet. Hier können Sie zusätzlich ein Passwort für den direkten Login vergeben.</p>
            ) : (
              <div><Label>Aktuelles Passwort</Label><Input type="password" required value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} className="mt-1.5" data-testid="current-password" /></div>
            )}
            <div><Label>Neues Passwort</Label><Input type="password" minLength={8} value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} className="mt-1.5" data-testid="new-password" /><p className="text-xs text-muted-foreground mt-1">Mindestens 8 Zeichen.</p></div>
            <div><Label>Neues Passwort bestätigen</Label><Input type="password" minLength={8} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="mt-1.5" data-testid="confirm-password" /></div>
            <Button onClick={changePw} disabled={!pw.new_password || !confirmPw || (!isGoogleUser && !pw.current_password)}>Passwort ändern</Button>
          </div>

          {!isLandlord && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 space-y-3 mt-4">
              <div>
                <p className="font-medium">Konto löschen</p>
                <p className="text-sm text-muted-foreground mt-1">Löscht Ihr Konto sowie alle Bewerbungen, Dokumente und Nachrichten unwiderruflich (Art. 17 DSGVO — Recht auf Löschung).</p>
              </div>
              <Button variant="destructive" onClick={deleteAccount} disabled={deletingAccount} data-testid="delete-account-btn">
                {deletingAccount ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Konto endgültig löschen
              </Button>
            </div>
          )}

          {isLandlord && (
            <div className="rounded-xl border border-border bg-secondary/30 p-6 mt-4">
              <p className="font-medium">Konto löschen</p>
              <p className="text-sm text-muted-foreground mt-1">
                Da Ihr Konto Organisationsdaten (Objekte, Bewerbungen, Team-Mitglieder) verwaltet, ist eine
                automatische Selbstlöschung hier nicht möglich. Bitte kontaktieren Sie{" "}
                <a href="mailto:support@mietgate.de" className="text-primary hover:underline">support@mietgate.de</a>{" "}
                für die vollständige Löschung Ihres Kontos (Art. 17 DSGVO).
              </p>
            </div>
          )}
        </TabsContent>

        {isLandlord && org && (
          <TabsContent value="org" className="mt-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div><Label>Firmenname</Label><Input value={org.name || ""} onChange={(e) => setOrg({ ...org, name: e.target.value })} className="mt-1.5" data-testid="org-name" /></div>
              <div><Label>Beschreibung</Label><Textarea rows={3} value={org.description || ""} onChange={(e) => setOrg({ ...org, description: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Adresse</Label><Input value={org.address || ""} onChange={(e) => setOrg({ ...org, address: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Ansprechpartner / Kontakt</Label><Input value={org.contact || ""} onChange={(e) => setOrg({ ...org, contact: e.target.value })} className="mt-1.5" /></div>
              <Button onClick={saveOrg} data-testid="save-org">Speichern</Button>
            </div>
          </TabsContent>
        )}

        {isLandlord && (
          <TabsContent value="billing" className="mt-6">
            <Billing embedded />
          </TabsContent>
        )}

        {isLandlord && org && (
          <TabsContent value="whitelabel" className="mt-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              {!wlAddon && (
                <div className="rounded-lg border border-dashed border-primary/40 bg-accent/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3" data-testid="wl-upsell">
                  <div>
                    <p className="font-medium">White-Label Add-on erforderlich</p>
                    <p className="text-sm text-muted-foreground">Buchen Sie das White-Label Add-on (79 €/Monat), um eigenes Branding zu aktivieren.</p>
                  </div>
                  <Button size="sm" onClick={() => setTab("billing")}>Add-on buchen</Button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div><p className="font-medium">White-Label aktivieren</p><p className="text-sm text-muted-foreground">Eigenes Branding auf der Bewerbungsseite (Add-on).</p></div>
                <Switch checked={org.white_label?.enabled || false} disabled={!wlAddon} onCheckedChange={(v) => setWL({ enabled: v })} data-testid="wl-toggle" />
              </div>
              {org.white_label?.enabled && wlAddon && (
                <>
                  <div><Label>Anzeigename / Firma</Label><Input value={org.white_label?.company_name || ""} onChange={(e) => setWL({ company_name: e.target.value })} className="mt-1.5" /></div>
                  <div>
                    <Label>Logo</Label>
                    <div className="flex items-center gap-3 mt-1.5">
                      {logoPreview && <img src={logoPreview} alt="Logo" className="h-10 rounded border border-border bg-white p-1" />}
                      <input ref={logoRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={uploadLogo} className="hidden" data-testid="wl-logo-input" />
                      <Button type="button" variant="outline" size="sm" onClick={() => logoRef.current?.click()} data-testid="wl-logo-upload">Logo hochladen</Button>
                    </div>
                  </div>
                  <div>
                    <Label>Primärfarbe</Label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <input type="color" value={org.white_label?.colors?.primary || "#1b9e9e"} onChange={(e) => setWL({ colors: { ...(org.white_label?.colors || {}), primary: e.target.value } })} className="h-10 w-16 rounded border border-border cursor-pointer" data-testid="wl-color" />
                      <span className="font-mono text-sm text-muted-foreground">{org.white_label?.colors?.primary || "#1b9e9e"}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm">„Powered by MietGate" anzeigen</p>
                    <Switch checked={org.white_label?.show_powered_by !== false} onCheckedChange={(v) => setWL({ show_powered_by: v })} />
                  </div>
                </>
              )}
              <Button onClick={saveOrg} disabled={!wlAddon}>Speichern</Button>
            </div>
            {wlAddon && <OrgEmailTemplates />}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
