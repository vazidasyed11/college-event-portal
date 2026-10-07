package com.college.events;

import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {
    private final UserRepo users;
    private final EventRepo events;
    private final RegRepo regs;

    public ApiController(UserRepo users, EventRepo events, RegRepo regs) {
        this.users = users; this.events = events; this.regs = regs;
    }

    record LoginReq(String email, String password) {}
    record EventReq(String title, String description, LocalDate eventDate, String venue, Integer seatLimit, Long organiserId) {}
    record EventView(Long id, String title, String description, LocalDate eventDate, String venue,
                     int seatLimit, long registered, boolean open, String organiserName, boolean registeredByMe) {}

    private ResponseStatusException bad(String m) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, m); }

    private EventView view(Event e, Long userId) {
        long c = regs.countByEventId(e.id);
        boolean mine = userId != null && regs.findByEventIdAndUserId(e.id, userId).isPresent();
        boolean open = c < e.seatLimit && !e.eventDate.isBefore(LocalDate.now());
        return new EventView(e.id, e.title, e.description, e.eventDate, e.venue, e.seatLimit, c, open, e.organiser.name, mine);
    }

    // ---------- Auth (simple, no tokens) ----------
    @PostMapping("/auth/register")
    public User register(@RequestBody User u) {
        if (blank(u.name) || blank(u.email) || blank(u.password) || u.password.length() < 4)
            throw bad("Name, email and a password (min 4 characters) are required");
        u.email = u.email.trim().toLowerCase();
        if (users.findByEmail(u.email).isPresent()) throw bad("This email is already registered");
        u.id = null;
        u.role = "ORGANISER".equals(u.role) ? "ORGANISER" : "STUDENT";
        if (!"STUDENT".equals(u.role)) u.academicYear = null;
        return users.save(u);
    }

    @PostMapping("/auth/login")
    public User login(@RequestBody LoginReq r) {
        User u = r.email() == null ? null : users.findByEmail(r.email().trim().toLowerCase()).orElse(null);
        if (u == null || u.password == null || !u.password.equals(r.password()))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        return u;
    }

    // ---------- Events ----------
    @GetMapping("/events")
    public List<EventView> upcoming(@RequestParam(required = false) Long userId) {
        return events.findByEventDateGreaterThanEqualOrderByEventDate(LocalDate.now())
                .stream().map(e -> view(e, userId)).toList();
    }

    @GetMapping("/events/organiser/{id}")
    public List<EventView> byOrganiser(@PathVariable Long id) {
        return events.findByOrganiserIdOrderByEventDateDesc(id).stream().map(e -> view(e, null)).toList();
    }

    @PostMapping("/events")
    public EventView create(@RequestBody EventReq r) {
        User o = r.organiserId() == null ? null : users.findById(r.organiserId()).orElse(null);
        if (o == null || !"ORGANISER".equals(o.role)) throw bad("Only organisers can create events");
        if (blank(r.title()) || blank(r.venue()) || r.eventDate() == null || r.seatLimit() == null || r.seatLimit() < 1)
            throw bad("Title, date, venue and a seat limit of at least 1 are required");
        Event e = new Event();
        e.title = r.title().trim(); e.description = r.description(); e.eventDate = r.eventDate();
        e.venue = r.venue().trim(); e.seatLimit = r.seatLimit(); e.organiser = o;
        return view(events.save(e), null);
    }

    @DeleteMapping("/events/{id}")
    @Transactional
    public void delete(@PathVariable Long id) {
        regs.deleteByEventId(id);
        events.deleteById(id);
    }

    // ---------- Registration ----------
    @PostMapping("/events/{id}/register")
    public synchronized EventView join(@PathVariable Long id, @RequestParam Long userId) {
        Event e = events.findById(id).orElseThrow(() -> bad("Event not found"));
        User u = users.findById(userId).orElseThrow(() -> bad("User not found"));
        if (!"STUDENT".equals(u.role)) throw bad("Only students can register for events");
        if (e.eventDate.isBefore(LocalDate.now())) throw bad("This event has already taken place");
        if (regs.findByEventIdAndUserId(id, userId).isPresent()) throw bad("You are already registered");
        if (regs.countByEventId(id) >= e.seatLimit) throw bad("Registrations are closed - all seats are taken");
        Registration r = new Registration();
        r.event = e; r.user = u;
        regs.save(r);
        return view(e, userId);
    }

    @DeleteMapping("/events/{id}/register")
    public EventView leave(@PathVariable Long id, @RequestParam Long userId) {
        regs.findByEventIdAndUserId(id, userId).ifPresent(regs::delete);
        return view(events.findById(id).orElseThrow(() -> bad("Event not found")), userId);
    }

    @GetMapping("/students/{id}/registrations")
    public List<EventView> myRegistrations(@PathVariable Long id) {
        return regs.findByUserIdOrderByRegisteredAtDesc(id).stream().map(r -> view(r.event, id)).toList();
    }

    // ---------- Participants ----------
    private List<Map<String, Object>> rows(Long eventId) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Registration r : regs.findByEventIdOrderByRegisteredAt(eventId)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("name", nz(r.user.name)); m.put("email", nz(r.user.email));
            m.put("gender", nz(r.user.gender)); m.put("department", nz(r.user.department));
            m.put("academicYear", nz(r.user.academicYear));
            m.put("registeredAt", r.registeredAt.toString().replace('T', ' ').substring(0, 16));
            out.add(m);
        }
        return out;
    }

    @GetMapping("/events/{id}/participants")
    public List<Map<String, Object>> participants(@PathVariable Long id) { return rows(id); }

    @GetMapping("/events/{id}/participants/download")
    public ResponseEntity<String> csv(@PathVariable Long id) {
        StringBuilder sb = new StringBuilder("Name,Email,Gender,Department,Academic Year,Registered At\n");
        for (Map<String, Object> r : rows(id))
            sb.append(r.values().stream().map(v -> "\"" + String.valueOf(v).replace("\"", "\"\"") + "\"")
                    .collect(Collectors.joining(","))).append("\n");
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=participants-event-" + id + ".csv")
                .contentType(MediaType.parseMediaType("text/csv")).body(sb.toString());
    }

    private static boolean blank(String s) { return s == null || s.isBlank(); }
    private static String nz(String s) { return s == null ? "" : s; }
}
