package com.college.events;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.*;

interface UserRepo extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
}

interface EventRepo extends JpaRepository<Event, Long> {
    List<Event> findByEventDateGreaterThanEqualOrderByEventDate(LocalDate d);
    List<Event> findByOrganiserIdOrderByEventDateDesc(Long organiserId);
}

interface RegRepo extends JpaRepository<Registration, Long> {
    long countByEventId(Long eventId);
    Optional<Registration> findByEventIdAndUserId(Long eventId, Long userId);
    List<Registration> findByEventIdOrderByRegisteredAt(Long eventId);
    List<Registration> findByUserIdOrderByRegisteredAtDesc(Long userId);
    void deleteByEventId(Long eventId);
}
