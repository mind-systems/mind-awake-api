# Logging Requirements

Add logging when implementing code — but keep it lean and never log sensitive data.

## Security: Never log sensitive data

PII and secrets must NEVER appear in logs — not even at DEBUG level.

**Forbidden in logs:**
- Email addresses, phone numbers, usernames
- Passwords, tokens, API keys, OTP codes
- Payment details (card numbers, CVV)
- Any personally identifiable information

```typescript
// WRONG
this.logger.log(`sendCode: email=${email}`);
this.logger.log(`verifyCode: code=${code}`);
this.logger.log(`auth: token=${token}`);

// CORRECT — log IDs and outcomes, not content
this.logger.log(`sendCode: sent codeId=${savedCode.id} locale=${locale}`);
this.logger.log(`verifyCode: success userId=${user.id}`);
```

When logging objects, strip sensitive fields first:
```typescript
const safe = { id: user.id, role: user.role, language: user.language };
this.logger.log(`user updated: ${JSON.stringify(safe)}`);
```

## What to log

**Log:**
- Errors with context (IDs, not values)
- Key business outcomes (code sent, user created, payment processed)
- External call failures

**Do NOT log:**
- Function entry/exit ("START", "entry", "exit") — too noisy
- Successful trivial operations
- Internal variable state unless debugging a specific issue

```typescript
// WRONG — too noisy
this.logger.log(`sendCode: entry email=${email} rawLocale=${rawLocale}`);
this.logger.log(`sendCode: resolved locale=${locale} existingUser=${!!existingUser}`);

// CORRECT — one meaningful log on success
this.logger.log(`sendCode: sent codeId=${savedCode.id} locale=${locale}`);
```

## Log levels

| Level | When |
|-------|------|
| `error` | Unexpected failures, exceptions |
| `warn` | Expected edge cases (rate limit, invalid input) |
| `log` (info) | Key business events |
| `debug` | Verbose details — only at LOG_LEVEL=debug |

Logs must be configurable via `LOG_LEVEL` env var. NestJS Logger respects this automatically.
