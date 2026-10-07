package com.college.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) public Long id;
    public String name;
    @Column(unique = true) public String email;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) public String password;
    public String role;          // ORGANISER or STUDENT
    public String gender;
    public String department;
    public String academicYear;
}
