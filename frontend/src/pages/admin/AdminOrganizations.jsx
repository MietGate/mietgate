import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export default function AdminOrganizations() {
  const [orgs, setOrgs] = useState(null);
  useEffect(() => { api.get("/admin/organizations").then((r) => setOrgs(r.data)); }, []);
  if (!orgs) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="font-display text-3xl font-bold">Organisationen</h1>
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Typ</TableHead><TableHead>Mitglieder</TableHead><TableHead>Objekte</TableHead><TableHead>Paket</TableHead><TableHead>White-Label</TableHead></TableRow></TableHeader>
          <TableBody>
            {orgs.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium">{o.name}</TableCell>
                <TableCell className="capitalize">{o.type}</TableCell>
                <TableCell>{o.member_count}</TableCell>
                <TableCell>{o.property_count}</TableCell>
                <TableCell className="capitalize">{o.plan || "—"}</TableCell>
                <TableCell>{o.white_label?.enabled ? <Badge>Aktiv</Badge> : "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
