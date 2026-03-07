# Project Rules

## NEVER use non-null assertion operator (`!`)

`payload.email!` — forbidden. Always use an explicit check:

```typescript
// WRONG
email = payload.email!;

// CORRECT
if (!payload.email) {
  throw new Error('...');
}
email = payload.email;
```

Force-unwrapping silently pushes undefined downstream. Explicit checks fail loudly with a meaningful error message in the logs.
