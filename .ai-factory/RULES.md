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

## NEVER log sensitive data

Email addresses, tokens, OTP codes, passwords, payment details, and any PII must never appear in logs — not even at DEBUG level. Log IDs and outcomes only.

```typescript
// WRONG
this.logger.log(`sendCode: email=${email} code=${code}`);

// CORRECT
this.logger.log(`sendCode: sent codeId=${savedCode.id}`);
```

## Keep logs lean

Do NOT log function entry/exit or intermediate state. Log errors and key business outcomes only.
