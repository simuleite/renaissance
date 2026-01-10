package main

import "fmt"

// User represents a user in the system
type User struct {
	Name string
	Age  int
}

// Greet returns a greeting message
func (u *User) Greet() string {
	return fmt.Sprintf("Hello, %s", u.Name)
}

func main() {
	u := User{Name: "Alice", Age: 30}
	fmt.Println(u.Greet())
}
