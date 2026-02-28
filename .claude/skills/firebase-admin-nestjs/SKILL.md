---
name: firebase-admin-nestjs
description: Firebase Admin SDK integration patterns for NestJS — module setup, ID Token verification, auth guards, and combined Firebase+JWT auth flow.
triggers:
  - keywords: ["firebase", "firebase admin", "id token", "firebase auth", "verifyidtoken", "firebase guard", "firebase module"]
---

# Firebase Admin NestJS

## Overview

This project uses Firebase Admin SDK (v13.5.0) as the **identity layer** and issues its own short-lived JWTs as the **session layer**. The flow is strictly one-directional:

1. Client authenticates with Firebase (Google, Apple, email/password, etc.) and receives a Firebase ID Token.
2. Client sends the Firebase ID Token to `POST /auth/login` in the `Authorization: Bearer <token>` header (or as `token` in the request body).
3. `FirebaseAuthGuard` calls `admin.auth().verifyIdToken()` — Firebase's cryptographically signed token is validated server-side.
4. `AuthService.login()` upserts the user in PostgreSQL (keyed on `firebaseUid`), then issues a project-owned JWT.
5. The project JWT is returned via the `Authorization` response header; subsequent API calls use that JWT, validated by `JwtAuthGuard`.

Firebase Admin SDK is initialized **once** as a NestJS `@Global()` module, exported as the DI token `'FIREBASE_ADMIN'`, and never re-initialized.

---

## Key Patterns

### 1. Firebase Module (Global)

The module lives at `src/firebase/firebase.module.ts`. It uses `admin.apps.length` to guard against double-initialization (relevant in hot-reload/test scenarios). The module is registered first in `AppModule` imports — before `ConfigModule` — because it reads env vars directly via `process.env` rather than through `ConfigService`.

```typescript
// src/firebase/firebase.module.ts
import { Global, Module } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              // Newlines in the private key are stored as literal \n in env vars.
              // Replace them before passing to the SDK.
              privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            }),
          });
        }
        return admin;
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}
```

Register it at the top of `AppModule.imports` (before `ConfigModule.forRoot`):

```typescript
// src/app.module.ts
@Module({
  imports: [
    FirebaseModule,           // must come first — reads process.env directly
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // ...rest of modules
  ],
})
export class AppModule {}
```

Because `FirebaseModule` is decorated with `@Global()`, its exported `'FIREBASE_ADMIN'` token is available in every module without explicit imports.

---

### 2. ID Token Verification

Inject the `'FIREBASE_ADMIN'` token and call `verifyIdToken()`. The method performs a network call to Google's public key endpoint on first invocation; subsequent calls use a cached key for ~1 hour.

```typescript
import { Inject, Injectable } from '@nestjs/common';
import type * as admin from 'firebase-admin';

@Injectable()
export class SomeService {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  async verifyToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    // Throws if token is expired, malformed, or from a different Firebase project.
    return this.firebaseAdmin.auth().verifyIdToken(idToken);
  }
}
```

The `DecodedIdToken` object contains:
- `uid` — Firebase UID (maps to `user.firebaseUid` in this project)
- `email` — verified email address
- `name` — display name (from Google/Apple profile)
- `email_verified` — boolean
- `exp`, `iat` — standard JWT claims

---

### 3. Firebase Auth Guard

The guard lives at `src/firebase/firebase-guard/firebase-auth.guard.ts`. It extracts the token from either the `Authorization: Bearer` header or the `token` field in the request body (to support the `LoginDto.token` pattern used in `POST /auth/login`). On success, it sets `request.user` to the `DecodedIdToken`, making it available to the controller and `AuthService`.

```typescript
// src/firebase/firebase-guard/firebase-auth.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type * as admin from 'firebase-admin';
import { RequestWithUser } from '../../users/interfaces/auth.interface';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseAdmin: typeof admin,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Firebase ID token not found');
    }

    try {
      // Attaches the DecodedIdToken to request.user for downstream use.
      request.user = await this.firebaseAdmin.auth().verifyIdToken(token);
      return true;
    } catch (error: any) {
      console.error('Firebase token verification failed:', error);
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }
  }

  private extractToken(request: RequestWithUser): string | undefined {
    const authHeader = request.headers?.authorization as string | undefined;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    // Fallback: token in request body (used by LoginDto)
    if (request.body && typeof request.body.token === 'string') {
      return request.body.token;
    }
    return undefined;
  }
}
```

Apply the guard to a route:

```typescript
@Post('login')
@UseGuards(FirebaseAuthGuard)
@HttpCode(HttpStatus.OK)
async login(@Body() loginDto: LoginDto): Promise<UserResponseDto> {
  // At this point request.user is admin.auth.DecodedIdToken
  const authResponse = await this.authService.login(loginDto);
  // ...
}
```

Note: `FirebaseAuthGuard` is NOT provided globally in `AppModule`. It is applied per-route with `@UseGuards(FirebaseAuthGuard)`. The guard is instantiated by NestJS's DI container because it is declared as a `@Injectable()` class — no explicit provider registration is needed in the feature module as long as `FirebaseModule` (global) is loaded.

---

### 4. Combined Firebase -> JWT Auth Flow

This is the full auth flow implemented in this project:

```
Client                          Server
  |                               |
  |-- POST /auth/login ---------->|
  |   Authorization: Bearer       |
  |   <Firebase ID Token>         |
  |   Body: { email, name,        |
  |     token, firebaseUid }      |
  |                               |
  |                    [FirebaseAuthGuard]
  |                    verifyIdToken(token)
  |                    -> DecodedIdToken
  |                    request.user = DecodedIdToken
  |                               |
  |                    [AuthService.login()]
  |                    1. Lookup user by firebaseUid
  |                    2. If not found, lookup by email
  |                    3. Upsert: link firebaseUid to user
  |                    4. If brand new, INSERT user row
  |                    5. jwtService.sign({ sub, email, name })
  |                               |
  |<-- 200 OK --------------------|
  |   Authorization: Bearer       |
  |   <Project JWT>               |
  |   Body: { id, email, name,    |
  |     role }                    |
  |                               |
  |-- GET /breath-sessions ------>|
  |   Authorization: Bearer       |
  |   <Project JWT>               |
  |                               |
  |                    [JwtAuthGuard]
  |                    Check blacklist
  |                    jwtService.verifyAsync(token)
  |                    request.user = JwtPayload
  |                               |
  |<-- 200 OK --------------------|
```

**Key design decisions:**
- The `LoginDto.token` field carries the Firebase ID Token in the request body. The guard also checks the `Authorization` header, so both transport methods work. In practice the project sends both (header for guard, body for DTO validation).
- `firebaseUid` is the primary lookup key. Email is the fallback to link pre-existing accounts.
- A `23505` (unique constraint violation) race condition is handled explicitly in `AuthService.login()`.
- The project JWT is returned via the `Authorization` **response header** (`res.setHeader('Authorization', ...)`), not the body. Clients must read this header.
- Logout blacklists the project JWT in PostgreSQL. Firebase ID Tokens are short-lived (1 hour) and are not tracked server-side.

**Interfaces used across the flow:**

```typescript
// src/users/interfaces/auth.interface.ts
import type { Request as ExpressRequest } from 'express';
import type * as admin from 'firebase-admin';

export interface JwtPayload {
  sub: string;   // user.id (UUID)
  email: string;
  name: string;
}

export interface RequestWithUser extends ExpressRequest {
  // Set by FirebaseAuthGuard: DecodedIdToken
  // Set by JwtAuthGuard: JwtPayload
  user?: admin.auth.DecodedIdToken | JwtPayload;
}
```

---

### 5. Environment Variables

Three environment variables are required for Firebase Admin SDK initialization. All three must be set — the SDK will throw at startup if any are missing or malformed.

```dotenv
# .env

# From Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# The private key from the downloaded JSON, stored with literal \n for newlines.
# Wrap in double quotes in the .env file to prevent shell interpretation issues.
# The FirebaseModule replaces \n -> actual newlines before passing to the SDK.
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkq...\n-----END PRIVATE KEY-----\n"

# JWT for the project's own token issuance
JWT_SECRET=your-strong-random-secret-min-32-chars
JWT_EXPIRES_IN=24h
```

**Alternative: `GOOGLE_APPLICATION_CREDENTIALS`**

If running on Google Cloud (Cloud Run, GKE, App Engine), you can omit all three `FIREBASE_*` variables and instead rely on Application Default Credentials:

```typescript
// Simpler initialization for GCP-hosted environments
admin.initializeApp();  // ADC picked up automatically
```

Set the env var pointing to a local service account JSON for local dev:

```dotenv
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
```

The `admin.apps.length` guard in `FirebaseModule` ensures this works safely regardless of which credential strategy is used.

---

### 6. Error Handling

**Common errors from `verifyIdToken()` and their causes:**

| Error code / message | Cause | Fix |
|---|---|---|
| `auth/id-token-expired` | Firebase ID Token is older than 1 hour | Client must refresh token with `firebase.auth().currentUser.getIdToken(true)` |
| `auth/id-token-revoked` | Token was revoked via Firebase Console or Admin SDK | Inform user to re-login |
| `auth/argument-error` | Token string is malformed or empty | Check client-side token extraction |
| `auth/invalid-credential` | Wrong `FIREBASE_PRIVATE_KEY` or `FIREBASE_CLIENT_EMAIL` | Check env vars; ensure `\n` replacement is applied |
| `Service account object must contain a string 'project_id' property` | `FIREBASE_PROJECT_ID` is undefined | `.env` file not loaded or variable name typo |
| `Cannot parse service account key JSON` | Private key has unescaped newlines in env var | Wrap value in double quotes in `.env`; verify `replace(/\\n/g, '\n')` |
| `app/duplicate-app` | `initializeApp()` called more than once | The `admin.apps.length` guard prevents this — do not remove it |

**Guard-level error handling pattern used in this project:**

```typescript
try {
  request.user = await this.firebaseAdmin.auth().verifyIdToken(token);
  return true;
} catch (error: any) {
  // Log the underlying Firebase error for debugging, but expose only a generic
  // message to the client to avoid leaking implementation details.
  console.error('Firebase token verification failed:', error);
  throw new UnauthorizedException('Invalid or expired Firebase token');
}
```

For production, replace `console.error` with NestJS `Logger`:

```typescript
private readonly logger = new Logger(FirebaseAuthGuard.name);
// ...
this.logger.error('Firebase token verification failed', error?.stack ?? error);
```

---

## Common Pitfalls

- **Double initialization crash**: Calling `admin.initializeApp()` more than once throws `app/duplicate-app`. Always guard with `if (!admin.apps.length)` in the `useFactory`. This is especially important when Jest resets modules between tests — each test file that imports the module will trigger `useFactory` again.

- **Private key newline corruption**: `.env` files store the private key with literal `\n` characters. If you forget the `.replace(/\\n/g, '\n')` call, the SDK silently receives a malformed key and throws `auth/invalid-credential` only at the first `verifyIdToken()` call, not at startup. Always apply the replacement.

- **`@Global()` does not auto-provide the guard**: `FirebaseModule` is global and exports `'FIREBASE_ADMIN'`. This means `FirebaseAuthGuard` can be instantiated anywhere via DI without importing `FirebaseModule`. However, the guard class itself must either be declared as a provider in the consuming module or be instantiated by the NestJS DI container via `@UseGuards(FirebaseAuthGuard)` — NestJS will resolve it automatically if the dependency (`'FIREBASE_ADMIN'`) is available globally.

- **`request.user` type ambiguity**: After `FirebaseAuthGuard`, `request.user` is `admin.auth.DecodedIdToken`. After `JwtAuthGuard`, it is `JwtPayload`. The union type `admin.auth.DecodedIdToken | JwtPayload` in `RequestWithUser` means you must narrow the type before accessing guard-specific fields (e.g., `uid` vs `sub`). The `@FirebaseUser()` param decorator handles this for controllers.

- **Token transport in `POST /auth/login`**: The guard checks both the `Authorization` header and `request.body.token`. The `LoginDto` requires `token` as a body field, so the guard will find it regardless of whether the client sends the header. Sending both (header + body) is redundant but harmless.

- **JWT blacklist grows unbounded without cleanup**: `JwtBlacklistService` runs a `@Cron(CronExpression.EVERY_DAY_AT_3AM)` cleanup. This requires `ScheduleModule.forRoot()` to be registered in `AppModule`. Without it, the cron silently never fires and the `jwt_blacklist` table grows indefinitely.

- **`ConfigService` not available in `FirebaseModule`**: `FirebaseModule` reads `process.env` directly because it is imported before `ConfigModule.forRoot()` completes. If you refactor to use `ConfigService`, you must add `imports: [ConfigModule]` inside `FirebaseModule` and use `useFactory: async (config: ConfigService) => { ... }` with `inject: [ConfigService]`.

---

## References

- [Firebase Admin Node.js SDK — Setup](https://firebase.google.com/docs/admin/setup)
- [Firebase Admin — Verify ID Tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens)
- [Firebase Admin SDK — Error Codes](https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.autherrorcode)
- [NestJS — Custom Providers (`useFactory`)](https://docs.nestjs.com/fundamentals/custom-providers#factory-providers-usefactory)
- [NestJS — Guards](https://docs.nestjs.com/guards)
- [NestJS — Global Modules](https://docs.nestjs.com/modules#global-modules)
- [passport-jwt — ExtractJwt strategies](https://github.com/mikenicholson/passport-jwt#extracting-the-jwt-from-the-request)
- [`firebase-admin` npm package](https://www.npmjs.com/package/firebase-admin)
