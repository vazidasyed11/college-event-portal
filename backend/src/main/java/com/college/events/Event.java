package com.college.events;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "events")
public class Event {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String title;
    @Column(length = 2000) public String description;
    public LocalDate eventDate;
    public String venue;
    public int seatLimit;
    @ManyToOne(optional = false) public User organiser;
}
