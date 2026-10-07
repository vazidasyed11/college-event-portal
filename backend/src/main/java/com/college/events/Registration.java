package com.college.events;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "registrations", uniqueConstraints = @UniqueConstraint(columnNames = {"event_id", "user_id"}))
public class Registration {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    @ManyToOne(optional = false) public Event event;
    @ManyToOne(optional = false) public User user;
    public LocalDateTime registeredAt = LocalDateTime.now();
}
