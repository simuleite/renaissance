"""Example Python module."""

from dataclasses import dataclass


@dataclass
class User:
    """User data class."""
    name: str
    age: int

    def greet(self) -> str:
        """Return a greeting message."""
        return f"Hello, {self.name}!"


def main():
    """Main function."""
    user = User(name="Alice", age=30)
    print(user.greet())


if __name__ == "__main__":
    main()
