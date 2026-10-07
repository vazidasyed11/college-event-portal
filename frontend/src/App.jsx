import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

const DEPTS = ["Computer Science", "Information Technology", "Electronics", "Electrical", "Mechanical", "Civil", "Business Administration", "Arts & Humanities", "Other"];
const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const GENDERS = ["Female", "Male", "Other", "Prefer not to say"];
const PETALS = ["🌸", "🌼", "🌺", "🌷", "💮"];
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => new Date(d + "T00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user") || "null"));
  const [toast, setToast] = useState(null);
  const notify = (msg, type = "ok") => { setToast({ msg, type, k: Date.now() }); setTimeout(() => setToast(null), 3200); };
  const signIn = (u) => { localStorage.setItem("user", JSON.stringify(u)); setUser(u); };
  const signOut = () => { localStorage.removeItem("user"); setUser(null); };

  return (
    <>
      <div className="petals" aria-hidden>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={{ left: `${i * 7.2}%`, animationDelay: `${i * 1.1}s`, animationDuration: `${12 + (i % 5) * 3}s` }}>{PETALS[i % 5]}</span>
        ))}
      </div>
      {user ? <Dashboard user={user} signOut={signOut} notify={notify} /> : <Auth signIn={signIn} notify={notify} />}
      {toast && <div key={toast.k} className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Auth({ signIn, notify }) {
  const [mode, setMode] = useState("login");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", password: "", role: "STUDENT", gender: "", department: "", academicYear: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const student = f.role === "STUDENT";

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const u = mode === "login" ? await api.login({ email: f.email, password: f.password }) : await api.register(f);
      notify(`Welcome, ${u.name}! 🌸`); signIn(u);
    } catch (err) { notify(err.message, "err"); }
    setBusy(false);
  };

  return (
    <main className="auth">
      <form className="card auth-card pop" onSubmit={submit}>
        <div className="logo">🌸</div>
        <h1>Bloom Events</h1>
        <p className="muted">College Event Registration Portal</p>
        <div className="seg">
          <button type="button" className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>Register</button>
        </div>
        {mode === "register" && (
          <>
            <Field label="Full name"><input required value={f.name} onChange={set("name")} placeholder="Your name" /></Field>
            <Field label="I am an"><select value={f.role} onChange={set("role")}><option value="STUDENT">Student</option><option value="ORGANISER">Organiser</option></select></Field>
          </>
        )}
        <Field label="Email"><input required type="email" value={f.email} onChange={set("email")} placeholder="you@college.edu" /></Field>
        <Field label="Password"><input required type="password" minLength={4} value={f.password} onChange={set("password")} placeholder="••••••" /></Field>
        {mode === "register" && (
          <div className="grid2">
            <Field label="Gender"><select required value={f.gender} onChange={set("gender")}><option value="">Select</option>{GENDERS.map((g) => <option key={g}>{g}</option>)}</select></Field>
            <Field label="Department"><select required value={f.department} onChange={set("department")}><option value="">Select</option>{DEPTS.map((d) => <option key={d}>{d}</option>)}</select></Field>
            {student && <Field label="Academic year"><select required value={f.academicYear} onChange={set("academicYear")}><option value="">Select</option>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></Field>}
          </div>
        )}
        <button className="btn primary wide" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Login" : "Create account"}</button>
      </form>
    </main>
  );
}

function Dashboard({ user, signOut, notify }) {
  const student = user.role === "STUDENT";
  const [tab, setTab] = useState("browse");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(student ? (tab === "browse" ? await api.events(user.id) : await api.myRegs(user.id)) : await api.mine(user.id));
    } catch (e) { notify(e.message, "err"); }
    setLoading(false);
  }, [tab, user.id, student]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn, okMsg) => {
    try { await fn(); notify(okMsg); load(); } catch (e) { notify(e.message, "err"); load(); }
  };

  return (
    <div className="wrap">
      <header className="top card">
        <div><b>🌸 Bloom Events</b></div>
        <div className="who">
          <span className="badge lav">{student ? "Student" : "Organiser"}</span>
          <span className="name">{user.name}</span>
          <button className="btn ghost" onClick={signOut}>Logout</button>
        </div>
      </header>

      {student ? (
        <>
          <div className="seg wideseg">
            <button className={tab === "browse" ? "on" : ""} onClick={() => setTab("browse")}>Upcoming events</button>
            <button className={tab === "mine" ? "on" : ""} onClick={() => setTab("mine")}>My registrations</button>
          </div>
          <p className="muted profile">{user.department} · {user.academicYear} · {user.gender}</p>
        </>
      ) : (
        <CreateEvent user={user} notify={notify} onDone={load} />
      )}

      <h2 className="sect">{student ? (tab === "browse" ? "Upcoming events" : "Events you registered for") : "Your events"}</h2>
      {loading ? <div className="loader" /> : list.length === 0 ? <p className="empty">🌼 Nothing here yet.</p> : (
        <div className="grid">
          {list.map((e, i) => {
            const pct = Math.min(100, Math.round((e.registered / e.seatLimit) * 100));
            const past = e.eventDate < today();
            return (
              <article key={e.id} className="card ev" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="row">
                  <span className={`badge ${past ? "grey" : e.open ? "green" : "rose"}`}>{past ? "Ended" : e.open ? "Open" : "Full"}</span>
                  <span className="muted small">📅 {fmt(e.eventDate)}</span>
                </div>
                <h3>{e.title}</h3>
                <p className="desc">{e.description || "No description provided."}</p>
                <p className="small">📍 {e.venue}</p>
                <p className="small muted">Organised by {e.organiserName}</p>
                <div className="bar"><i style={{ width: pct + "%" }} /></div>
                <p className="small muted">{e.registered} / {e.seatLimit} seats taken</p>
                <div className="row actions">
                  {student ? (
                    e.registeredByMe ? (
                      <>
                        <span className="badge green">✓ Registered</span>
                        {!past && <button className="btn ghost" onClick={() => act(() => api.leave(e.id, user.id), "Registration cancelled")}>Cancel</button>}
                      </>
                    ) : (
                      <button className="btn primary" disabled={!e.open} onClick={() => act(() => api.join(e.id, user.id), "You're registered! 🎉")}>
                        {past ? "Ended" : e.open ? "Register" : "Seats full"}
                      </button>
                    )
                  ) : (
                    <>
                      <button className="btn primary" onClick={() => setPeople(e)}>👥 Participants</button>
                      <button className="btn ghost danger" onClick={() => window.confirm("Delete this event?") && act(() => api.remove(e.id), "Event deleted")}>Delete</button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {people && <Participants event={people} close={() => setPeople(null)} notify={notify} />}
    </div>
  );
}

function CreateEvent({ user, notify, onDone }) {
  const empty = { title: "", description: "", eventDate: "", venue: "", seatLimit: "" };
  const [f, setF] = useState(empty);
  const [open, setOpen] = useState(true);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.create({ ...f, seatLimit: Number(f.seatLimit), organiserId: user.id });
      notify("Event created 🌷"); setF(empty); onDone();
    } catch (err) { notify(err.message, "err"); }
  };
  return (
    <section className="card create pop">
      <div className="row"><h2>✨ Create an event</h2><button className="btn ghost" onClick={() => setOpen(!open)}>{open ? "Hide" : "Show"}</button></div>
      {open && (
        <form onSubmit={submit}>
          <div className="grid2">
            <Field label="Title"><input required value={f.title} onChange={set("title")} placeholder="Spring Fest 2026" /></Field>
            <Field label="Venue"><input required value={f.venue} onChange={set("venue")} placeholder="Main Auditorium" /></Field>
            <Field label="Date"><input required type="date" min={today()} value={f.eventDate} onChange={set("eventDate")} /></Field>
            <Field label="Seat limit"><input required type="number" min="1" value={f.seatLimit} onChange={set("seatLimit")} placeholder="100" /></Field>
          </div>
          <Field label="Description"><textarea rows="3" value={f.description} onChange={set("description")} placeholder="What is this event about?" /></Field>
          <button className="btn primary">Publish event</button>
        </form>
      )}
    </section>
  );
}

function Participants({ event, close, notify }) {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.people(event.id).then(setRows).catch((e) => notify(e.message, "err")); }, [event.id]);
  return (
    <div className="overlay" onClick={close}>
      <div className="card modal pop" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2>{event.title}</h2><button className="btn ghost" onClick={close}>✕</button></div>
        <p className="muted small">{rows ? rows.length : "…"} registered · {event.seatLimit} seats</p>
        {!rows ? <div className="loader" /> : rows.length === 0 ? <p className="empty">No registrations yet.</p> : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Gender</th><th>Department</th><th>Year</th><th>Registered</th></tr></thead>
              <tbody>{rows.map((r, i) => <tr key={i}><td>{i + 1}</td><td>{r.name}</td><td>{r.email}</td><td>{r.gender}</td><td>{r.department}</td><td>{r.academicYear}</td><td>{r.registeredAt}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        <a className="btn primary dl" href={api.csvUrl(event.id)}>⬇ Download list (CSV)</a>
      </div>
    </div>
  );
}
