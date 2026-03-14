# WebSocket — Модель телеметрии

Телеметрия — это не метрики вовлечённости и не аналитика поведения. Это **лог инструкций**: запись того, что приложение говорило пользователю делать в каждый момент времени. Без этих меток биометрические данные датчиков теряют смысл — числа есть, но неизвестно, что в этот момент происходило.

## Сессия как контейнер

`LiveSession` — это контейнер с двумя временны́ми метками: когда пользователь нажал Play и когда закончил. Внутри контейнера лежит поток событий телеметрии.

```
LiveSession
├── startedAt   ← activity:start (пользователь нажал Play)
├── endedAt     ← activity:end (завершение или выход)
│
└── TelemetrySamples[]
    ├── { phase: "inhale",  durationMs: 4000, timestamp: T+0    }
    ├── { phase: "hold",    durationMs: 2000, timestamp: T+4000 }
    ├── { phase: "exhale",  durationMs: 6000, timestamp: T+6000 }
    └── { phase: "rest",    durationMs: 1000, timestamp: T+12000 }
```

Сервер, получив такую запись, знает: в момент `T+0` пользователю была дана команда вдыхать 4 секунды. Когда придут биометрические данные датчика — они будут сопоставлены с этой инструкцией по `sessionId` + `timestamp`.

## Момент activity:start

`activity:start` должен отправляться **когда пользователь нажал Play**, а не когда открыл экран. Это принципиальное требование: `startedAt` должен совпадать с реальным началом упражнения, иначе временна́я шкала сессии будет смещена, и корреляция с биометрическими данными станет некорректной.

Типичная ошибка — отправлять `activity:start` при инициализации экрана. Пользователь открыл экран, прочитал инструкцию, подождал 30 секунд и нажал Play — все эти 30 секунд попадут в сессию как «до первой фазы», замусорив данные.

## Two independent timelines

The telemetry stream and the future biometric stream are kept strictly separate:

```
Session timeline (telemetry / instruction log)
──────────────────────────────────────────────
session_started → breath_phase → … → paused → resumed → … → session_ended

Biometric timeline
──────────────────
HR sample → HR sample → SpO2 → respiration → …
```

Analytics performs a time-join on `sessionId` + `timestamp` to correlate the two. This means the telemetry stream must be **complete** — it must include lifecycle transitions (pause, resume, start, end) so any biometric gap can be explained without touching a separate table.

## Payload shape

Every sample uses the same envelope regardless of source or event type:

```
TelemetrySample
├── sessionId  — links to LiveSession
├── dataType   — discriminator: "breath_phase" | "session_event" | "audio_cue" | "haptic" | ...
├── payload    — JSONB, shape depends on dataType
└── timestamp  — UTC unix ms, moment the instruction was issued
```

### `breath_phase` (written by client)

```json
{ "phase": "exhale", "durationMs": 6000 }
```

Sent by the mobile app on each phase transition while the engine is running.

### `session_event` (written by server)

```json
{ "event": "session_started" }
{ "event": "paused" }
{ "event": "resumed" }
{ "event": "session_ended" }
```

Written by `ActivityEngine` when it processes `activity:start`, `activity:pause`, `activity:resume`, and `activity:end`. **Server is the authoritative source** for lifecycle events — no race conditions, no dropped markers.

### Future instruction types (deferred)

| dataType | payload example | When |
|----------|-----------------|------|
| `audio_cue` | `{ file: "calm_exhale.ogg", durationMs: 3200 }` | App played an audio instruction |
| `haptic` | `{ pattern: "long_pulse" }` | Vibration as phase-change signal |

All types share the same `session_stream_samples` table (`payload` is JSONB). New types require no schema changes.

## Gate logic during pause

When a session is paused, `TelemetryGateway` blocks only `breath_phase` events — lifecycle events must always pass through:

```
if (session.isPaused && sample.dataType === 'breath_phase') → drop, return data:ack { error: 'session_paused' }
else → accept
```

This ensures the `paused` marker is followed by a clean gap in breath_phase samples, and the `resumed` marker closes the gap — without losing the markers themselves.

## Роль в биометрической платформе

Телеметрия — это **метки синхронизации**, а не самостоятельные биометрические данные. Движок приложения и так знает параметры упражнения: они лежат в статической записи `BreathSession`. Ценность телеметрии в том, что она создаёт временну́ю шкалу того, что происходило в конкретной сессии с конкретным пользователем.

Когда биометрические потоки (дыхательный пояс, ЭЭГ) будут добавлены, система будет сопоставлять их с инструкционной шкалой:

```
T+6000ms: инструкция — exhale 6s
T+6000ms–T+12000ms: биосигнал дыхания → соответствует ли реальный паттерн инструкции?
```

Это позволит давать пользователю объективный фидбэк: "во время фазы выдоха твоё дыхание совпадало с инструкцией на X%".

Биометрические потоки будут идти через отдельный namespace `/biometric` и отдельную таблицу, но привязываться к той же `LiveSession` по `sessionId`. Подробнее — в `BIOMETRIC_PLATFORM_VISION.md`.

## Backpressure и потери

При высокочастотной отправке сервер управляет нагрузкой через `data:ack`:

```json
{
  "receivedCount": 10,
  "droppedCount": 0,
  "maxSamplesPerSecond": 5
}
```

Клиент обязан соблюдать `maxSamplesPerSecond`. Для фаз дыхания это некритично — фаза меняется раз в несколько секунд, не чаще. Для будущих биометрических потоков (256 Hz ЭЭГ) это станет ключевым механизмом.

## See Also

- [Protocol](protocol.md) — полный список событий и форматы payload
- [Session Lifecycle](session-lifecycle.md) — жизненный цикл LiveSession, reconnect, grace period
- [Database](database.md) — схема таблицы `session_stream_samples`
