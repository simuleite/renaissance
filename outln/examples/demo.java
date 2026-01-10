package com.example.service;

import org.springframework.stereotype.Service;

@Service
public class UserService {
    private UserRepository repository;

    public User findById(Long id) {
        return repository.findById(id);
    }

    public void save(User user) {
        repository.save(user);
    }

    private void validate(User user) {
        // validation logic
    }
}
