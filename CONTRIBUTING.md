# Contributing to Noteece

Thank you for your interest in contributing to Noteece! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and collaborative environment. Please be considerate of others and their contributions.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/noteece.git
   cd noteece
   ```
3. **Add the upstream repository**:
   ```bash
   git remote add upstream https://github.com/AmirrezaFarnamTaheri/noteece.git
   ```

## Development Setup

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable version)
- [Node.js](https://nodejs.org/) (v18 or later)
- [pnpm](https://pnpm.io/installation) (v8.15.6 or later)
- [Tauri Prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites) (platform-specific)

### Installation

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Run the development server**:

   ```bash
   cd apps/desktop
   pnpm dev:tauri
   ```

3. **Run tests**:

   ```bash
   # React tests
   pnpm test

   # Rust tests
   cd packages/core-rs
   cargo test
   ```

4. **Lint and format**:
   ```bash
   pnpm lint
   pnpm format
   ```

## Project Structure

```
noteece/
├── apps/
│   ├── desktop/              # Tauri v2 desktop app
│   │   ├── src/             # React components
│   │   │   ├── components/  # UI components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   └── utils/       # Utility functions
│   │   └── src-tauri/       # Rust Tauri backend
│   └── mobile/              # React Native mobile app (WIP)
├── packages/
│   ├── core-rs/             # Rust core library
│   ├── editor/              # Lexical editor wrapper
│   ├── ui/                  # Shared UI components
│   ├── types/               # Shared TypeScript types
│   ├── modes/               # Mode system definitions
│   └── automation-dsl/      # Automation language (WIP)
└── docs/                    # Documentation
```

## Development Workflow

### Creating a New Feature

1. **Create a feature branch**:

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes**:

   ```bash
   pnpm test
   cargo test
   ```

4. **Commit your changes** (see [Commit Guidelines](#commit-guidelines))

5. **Push to your fork**:

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request** on GitHub

### Keeping Your Fork Updated

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

## Coding Standards

### TypeScript/React

- **Use TypeScript** for all new code
- **Follow React best practices**:
  - Use functional components with hooks
  - Extract reusable logic into custom hooks
  - Keep components focused and single-purpose
- **Use Mantine v7+ components** for UI
- **Add JSDoc comments** for exported functions and components
- **Use meaningful variable names** (descriptive over concise)

#### Example:

```typescript
/**
 * Displays a user's profile information
 * @param userId - The unique identifier for the user
 * @param onUpdate - Callback fired when profile is updated
 */
export function UserProfile({ userId, onUpdate }: UserProfileProps) {
  // Component implementation
}
```

### Rust

- **Follow Rust naming conventions**:
  - `snake_case` for functions and variables
  - `PascalCase` for types and structs
- **Add documentation comments** for public APIs:
  ```rust
  /// Creates a new encrypted vault
  ///
  /// # Arguments
  /// * `path` - The file system path for the vault
  /// * `password` - The master password for encryption
  ///
  /// # Errors
  /// Returns an error if the vault already exists or encryption fails
  pub fn create_vault(path: &Path, password: &str) -> Result<Vault>
  ```
- **Write tests** for all public functions
- **Use `Result` for error handling** (never `panic!` in library code)
- **Run `cargo fmt` and `cargo clippy`** before committing

### CSS/Styling

- **Use Mantine's theme system** for colors, spacing, and typography
- **Create CSS modules** for component-specific styles
- **Use semantic naming** for CSS classes
- **Prefer Mantine components** over custom CSS when possible

## Testing Guidelines

### React Component Tests

- Use **Jest** and **React Testing Library**
- Write tests for:
  - Component rendering
  - User interactions
  - Edge cases and error states
- Mock external dependencies (Tauri API, React Query)

#### Example:

```typescript
describe('UserProfile', () => {
  it('renders user name', () => {
    render(<UserProfile userId="123" />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('calls onUpdate when save button clicked', () => {
    const onUpdate = jest.fn();
    render(<UserProfile userId="123" onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(onUpdate).toHaveBeenCalled();
  });
});
```

### Rust Tests

- Write **unit tests** for individual functions
- Write **integration tests** for API contracts
- Use **test fixtures** for complex setup

#### Example:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vault_creation() {
        let vault = Vault::create("/tmp/test.vault", "password123").unwrap();
        assert!(vault.is_locked());
    }
}
```

### Test Coverage

- Aim for **>80% code coverage** for new code
- Run coverage reports:

  ```bash
  # TypeScript
  pnpm test:coverage

  # Rust
  cargo tarpaulin --out Html
  ```

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples

```
feat(dashboard): add goals tracker widget

Add a new goals tracker widget to the dashboard that allows users
to set and track progress toward long-term goals.

Closes #123
```

```
fix(sync): resolve conflict detection issue

Fix bug where sync conflicts were not properly detected when
notes were modified on multiple devices simultaneously.
```

### Commit Message Guidelines

- **Use the imperative mood** ("Add feature" not "Added feature")
- **Keep subject line under 72 characters**
- **Capitalize the subject line**
- **Do not end subject line with a period**
- **Separate subject from body with a blank line**
- **Wrap body at 72 characters**
- **Explain what and why, not how**

## Pull Request Process

1. **Update documentation** if needed (README, CHANGELOG, etc.)

2. **Ensure all tests pass**:

   ```bash
   pnpm test
   cargo test
   ```

3. **Run linters**:

   ```bash
   pnpm lint
   cargo clippy
   ```

4. **Update CHANGELOG.md** with your changes

5. **Fill out the PR template** completely

6. **Request review** from maintainers

7. **Address review feedback** promptly

8. **Squash commits** if requested before merge

### PR Title Format

Use the same format as commit messages:

```
feat(scope): add new feature
fix(scope): resolve bug
docs: update contributing guide
```

### PR Description Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Added unit tests
- [ ] Added integration tests
- [ ] Manual testing performed

## Screenshots (if applicable)

Add screenshots here

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] CHANGELOG.md updated
```

## Reporting Bugs

### Before Submitting a Bug Report

- **Check existing issues** to avoid duplicates
- **Test on the latest version** to ensure the bug still exists
- **Collect relevant information**:
  - Operating system and version
  - Noteece version
  - Steps to reproduce
  - Expected vs. actual behavior
  - Error messages or logs

### Bug Report Template

```markdown
**Describe the bug**
A clear description of the bug

**To Reproduce**
Steps to reproduce:

1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen

**Screenshots**
If applicable, add screenshots

**Environment:**

- OS: [e.g., macOS 13.0]
- Noteece Version: [e.g., 0.1.0]
- Tauri Version: [e.g., 2.0.0]

**Additional context**
Any other relevant information
```

## Suggesting Enhancements

### Before Submitting an Enhancement

- **Check existing feature requests** to avoid duplicates
- **Clearly define the problem** you're trying to solve
- **Describe the solution** you'd like to see
- **Consider alternatives** and explain why your solution is best

### Enhancement Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem

**Describe the solution you'd like**
A clear description of what you want to happen

**Describe alternatives you've considered**
Other solutions or features you've considered

**Additional context**
Screenshots, mockups, or examples
```

## Development Tips

### Debugging

- **Use browser DevTools** for frontend debugging
- **Use `console.log`** strategically (remove before committing)
- **Use Rust `dbg!` macro** for backend debugging
- **Check Tauri logs** in the terminal

### Performance

- **Profile before optimizing** (use browser profiler)
- **Use React.memo** for expensive components
- **Virtualize long lists** with react-window
- **Optimize Rust with `cargo flamegraph`**

### Accessibility

- **Add ARIA labels** to interactive elements
- **Test keyboard navigation**
- **Ensure sufficient color contrast**
- **Use semantic HTML elements**

## Resources

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [Mantine UI Documentation](https://mantine.dev/)
- [Rust Book](https://doc.rust-lang.org/book/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Questions?

If you have questions not covered in this guide:

1. Check the [documentation](https://github.com/AmirrezaFarnamTaheri/Noteece)
2. Search [existing issues](https://github.com/AmirrezaFarnamTaheri/Noteece/issues)
3. Ask in [discussions](https://github.com/AmirrezaFarnamTaheri/Noteece/discussions)

## License

By contributing to Noteece, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to Noteece! 🎉
