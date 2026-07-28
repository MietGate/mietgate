import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("mg_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* Opens the document in a new tab so PDFs/images render inline instead of forcing a save
   dialog. The tab is opened synchronously (before the await) so browsers still recognise
   it as a direct result of the click and don't block it as a popup. */
export async function previewDocument(docId) {
  const win = window.open("", "_blank");
  try {
    const { data } = await api.get(`/documents/${docId}/download`, { responseType: "blob" });
    const url = URL.createObjectURL(data);
    if (win) win.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    win?.close();
    throw e;
  }
}

export async function downloadDocument(docId, filename) {
  const { data } = await api.get(`/documents/${docId}/download`, { responseType: "blob" });
  const url = URL.createObjectURL(data);
  const a = document.createElement("a");
  a.href = url;
  if (filename) a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function formatApiError(detail) {
  if (detail == null) return "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default api;
