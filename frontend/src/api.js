const BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
export const API = BASE + "/api";

async function call(path, opts = {}) {
  let res;
  try {
    res = await fetch(API + path, { headers: { "Content-Type": "application/json" }, ...opts });
  } catch {
    throw new Error("Cannot reach the server. Is the backend running?");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || "Something went wrong");
  return data;
}
const post = (b) => ({ method: "POST", body: JSON.stringify(b) });

export const api = {
  register: (b) => call("/auth/register", post(b)),
  login: (b) => call("/auth/login", post(b)),
  events: (uid) => call(`/events?userId=${uid ?? ""}`),
  mine: (id) => call(`/events/organiser/${id}`),
  create: (b) => call("/events", post(b)),
  remove: (id) => call(`/events/${id}`, { method: "DELETE" }),
  join: (id, uid) => call(`/events/${id}/register?userId=${uid}`, { method: "POST" }),
  leave: (id, uid) => call(`/events/${id}/register?userId=${uid}`, { method: "DELETE" }),
  myRegs: (uid) => call(`/students/${uid}/registrations`),
  people: (id) => call(`/events/${id}/participants`),
  csvUrl: (id) => `${API}/events/${id}/participants/download`,
};
