# System Design

## 1. Main Flow

1. User creates an account and receives an API key.

2. User registers a destination endpoint.

3. Developer sends an event to our API using their API key.

4. Our API:

   * authenticates the API key
   * validates the request
   * stores the Event
   * creates a Delivery associated with the Event and destination Endpoint
   * marks the Delivery as `PENDING`

5. The Delivery Worker finds deliveries that are ready to be processed.

6. Before attempting delivery, the worker marks the Delivery as `PROCESSING`.

7. The worker sends the event payload to the destination endpoint.

8. If the attempt succeeds:

   * create a `DeliveryAttempt` record
   * mark the Delivery as `DELIVERED`
   * notify the developer according to the notification policy

9. If the attempt fails:

   * create a `DeliveryAttempt` containing the failure information
   * increment `attemptCount`
   * calculate `nextAttemptAt`
   * return the Delivery to `PENDING`

10. The system retries according to the retry policy.

11. If all retry attempts are exhausted:

* mark the Delivery as `FAILED`
* notify the developer

12. The developer can inspect the Delivery and its DeliveryAttempt history.

13. The developer can manually retry a failed Delivery.

## 2. Main Components

### API

Responsible for:

* authentication
* endpoint management
* event ingestion
* delivery inspection
* manual retries
* API key management

### PostgreSQL Database

Stores:

* users
* sessions
* endpoints
* events
* deliveries
* delivery attempts

### Delivery Worker

Responsible for:

* finding deliveries where `status = PENDING`
* checking whether `nextAttemptAt` is due
* claiming a delivery before processing it
* sending HTTP requests to destination endpoints
* recording delivery attempts
* updating delivery status
* scheduling retries

### Email Notification Service

Responsible for notifying developers when important delivery events occur.

For V1, notifications can be sent when a delivery:

* succeeds
* permanently fails after exhausting retries

## 3. Retry Policy

V1 retry policy:

* Maximum retries: 10
* Retry interval: 30 seconds
* HTTP request timeout: 30 seconds
* A timeout counts as a failed attempt

When an attempt fails:

```text
attemptCount += 1
```

If more attempts remain:

```text
status = PENDING
nextAttemptAt = current time + 30 seconds
```

If the maximum number of attempts has been reached:

```text
status = FAILED
nextAttemptAt = null
```

## 4. Delivery Status

```text
PENDING
PROCESSING
DELIVERED
FAILED
```

### PENDING

The delivery exists but is waiting for a worker.

This can mean:

* it has never been attempted
* a previous attempt failed and it is waiting for `nextAttemptAt`

### PROCESSING

A worker has claimed the delivery and is currently attempting it.

### DELIVERED

The destination successfully accepted the event.

### FAILED

The delivery exhausted the retry policy without succeeding.

## 5. Database Model

### User

```text
userId
email
hashedPassword
hashedApiKey
createdAt
```

Relationships:

```text
User
 ├── Endpoint[]
 ├── Event[]
 └── Session[]
```

### Endpoint

```text
endpointId
userId
url
createdAt
isActive
deletedAt
```

Purpose:

Represents a destination URL registered by a user.

An endpoint is not deleted immediately from the database because historical deliveries may still reference it.

`deletedAt` therefore supports soft deletion.

### Event

```text
eventId
userId
eventType
payload
createdAt
```

Purpose:

Represents the event received from the developer.

Example:

```json
{
  "eventType": "payment.completed",
  "payload": {
    "paymentId": "123"
  }
}
```

The Event represents what happened.

It does not represent whether delivery succeeded.

### Delivery

```text
deliveryId
eventId
endpointId
status
createdAt
attemptCount
nextAttemptAt
```

Purpose:

Represents the overall job of delivering an Event to one Endpoint.

Relationship:

```text
Event
  ↓
Delivery
  ↓
Endpoint
```

### DeliveryAttempt

```text
attemptId
deliveryId
statusCode?
error?
attemptedAt
```

Purpose:

Represents one individual HTTP attempt.

A Delivery may therefore contain:

```text
Delivery
 ├── DeliveryAttempt #1
 ├── DeliveryAttempt #2
 ├── DeliveryAttempt #3
 └── ...
```

`statusCode` is nullable because some failures do not return an HTTP response.

Examples:

```text
DNS failure
connection refused
TLS failure
timeout
```

`error` is nullable because successful requests may not have an error.

### Session

```text
sessionId
userId
tokenHash
createdAt
expiresAt
```

Purpose:

Stores database-backed authentication sessions for dashboard users.

## 6. Database Relationships

```text
User
 ├── Endpoint
 │      │
 │      └──────────────┐
 │                     │
 └── Event             │
       │                │
       └── Delivery ────┘
              │
              ├── DeliveryAttempt
              ├── DeliveryAttempt
              └── DeliveryAttempt
```

A useful distinction is:

```text
Event
= something happened

Delivery
= we need to send that event somewhere

DeliveryAttempt
= one attempt to send it
```

## 7. API Design

### Authentication

```http
POST /auth/register
POST /auth/login
```

Dashboard authentication uses database-backed sessions.

### API Key Management

```http
POST /api-key/rotate
```

API keys are used by developers to authenticate requests to the event ingestion API.

Only the hash of the API key is stored in the database.

Rotation invalidates the previous API key and generates a new one.

### Endpoint Management

```http
POST   /endpoints
GET    /endpoints
PATCH  /endpoints/:id
```

`POST /endpoints`

Registers a destination URL.

`GET /endpoints`

Lists the user's registered endpoints.

`PATCH /endpoints/:id`

Allows properties such as:

```text
url
isActive
```

to be changed.

### Event Ingestion

```http
POST /events
GET  /events
```

`POST /events`

Receives an event from the developer.

Conceptually:

```text
Request
   ↓
Authenticate API key
   ↓
Validate event
   ↓
Store Event
   ↓
Create Delivery
   ↓
status = PENDING
   ↓
Return response
```

The API does not synchronously wait for the destination endpoint to process the webhook.

Actual delivery is handled asynchronously by the Delivery Worker.

### Delivery Inspection

```http
GET /deliveries
GET /deliveries/:id
```

`GET /deliveries`

Lists deliveries and their current status.

`GET /deliveries/:id`

Returns detailed information about a particular delivery, including its attempt history.

### Manual Retry

```http
POST /deliveries/:id/retry
```

Allows a developer to manually retry a failed delivery.

A manual retry does not create a new Event.

The original Event remains unchanged.

The Delivery becomes eligible for processing again, while previous DeliveryAttempt records remain available as history.

# Design Decisions and Corrections

## 1. Originally: API stores endpoint when an event arrives

Original flow:

```text
Developer sends event
↓
Our API stores endpoint
```

Changed to:

```text
Developer registers endpoint beforehand

Developer sends event
↓
API stores Event
↓
API creates Delivery referencing existing Endpoint
```

Why:

An Endpoint is configuration owned by the user. It should not be recreated every time an Event arrives.

The Delivery connects an existing Event to an existing Endpoint.

## 2. Originally: Event could represent the delivery process

We separated:

```text
Event
Delivery
DeliveryAttempt
```

Why:

These represent three different concepts.

```text
Event
"What happened?"

Delivery
"Where are we sending it and what is its overall state?"

DeliveryAttempt
"What happened during this specific HTTP request?"
```

Without this separation, retry history and delivery state become difficult to model.

## 3. Originally: delivery history could be represented by multiple Delivery records

Changed to:

```text
one Delivery
+
multiple DeliveryAttempt records
```

Why:

Retrying does not create a new delivery job.

It is another attempt at completing the same delivery.

Example:

```text
Delivery abc
status: DELIVERED
attemptCount: 3

Attempts:
1. timeout
2. HTTP 500
3. HTTP 200
```

This gives us both the current state and the complete history.

## 4. Added PROCESSING status

Originally we mainly discussed:

```text
PENDING
DELIVERED
FAILED
```

We added:

```text
PROCESSING
```

Why:

With multiple workers, two workers could otherwise select the same `PENDING` delivery.

A worker needs to claim a delivery before performing the HTTP request.

Conceptually:

```text
PENDING
↓
PROCESSING
↓
DELIVERED
```

or:

```text
PENDING
↓
PROCESSING
↓
PENDING
```

when another retry is required.

## 5. Added nextAttemptAt

Originally retries were simply:

```text
attempt failed
↓
retry
```

Changed to storing:

```text
nextAttemptAt
```

Why:

The worker needs to know when a failed delivery becomes eligible for another attempt.

This allows a query conceptually similar to:

```sql
WHERE status = 'PENDING'
AND nextAttemptAt <= NOW()
```

rather than keeping retry timers inside application memory.

## 6. Worker concurrency

We discussed having multiple workers.

The workers must not independently process the same Delivery.

Therefore a worker must atomically claim a Delivery before processing it.

Conceptually:

```text
Worker A ─┐
          ├── Delivery 123
Worker B ─┘
```

Only one should successfully change:

```text
PENDING → PROCESSING
```

The other worker should move on to another delivery.

This becomes important as the system scales.

## 7. Retry scheduler

Instead of creating an in-memory timer for every failed webhook, retry timing is persisted in PostgreSQL using:

```text
nextAttemptAt
```

The worker periodically checks for deliveries that are due.

This means retries survive:

```text
server restart
worker crash
deployment
temporary outage
```

because the retry information lives in the database.

## 8. Retry policy

We chose a simple V1 retry policy:

```text
10 retries
30-second retry interval
30-second request timeout
```

A timeout counts as a failed attempt.

This is intentionally simple for V1.

More advanced strategies such as exponential backoff can be introduced later.

## 9. DeliveryAttempt statusCode became nullable

Originally:

```text
statusCode Int
```

Changed to:

```text
statusCode Int?
```

Why:

Not every HTTP attempt produces an HTTP response.

For example:

```text
timeout
DNS failure
connection refused
TLS error
```

have no HTTP status code.

## 10. DeliveryAttempt error became nullable

Originally:

```text
error String
```

Changed to:

```text
error String?
```

Why:

A successful delivery may have:

```text
statusCode = 200
error = null
```

## 11. Endpoint and Delivery relationship

Originally `Delivery` contained:

```text
endpointId
```

but Prisma did not define the actual Endpoint relationship.

Changed to:

```text
Delivery
  ↓
Endpoint
```

with a foreign key relationship.

Why:

The database should guarantee that every Delivery references a real Endpoint.

## 12. Soft deletion for endpoints

We kept:

```text
deletedAt
```

instead of permanently deleting endpoints.

Why:

An old Delivery may reference an Endpoint that the user later removes.

Hard deleting the Endpoint would either:

* break historical references
* require cascading deletion of delivery history

Soft deletion preserves historical data.

## 13. Added isActive

`isActive` allows a user to temporarily disable an Endpoint without deleting it.

Example:

```text
isActive = false
```

means new deliveries should not be sent to that endpoint.

## 14. Database-backed sessions

We decided dashboard authentication would use database-backed sessions.

Therefore:

```text
Session
```

belongs to:

```text
User
```

This is separate from API-key authentication.

There are effectively two authentication contexts:

```text
Dashboard
User session

Developer API
API key
```

## 15. API keys are hashed

Originally we referred simply to:

```text
apiKey
```

Changed to:

```text
hashedApiKey
```

Why:

API keys are credentials.

Like passwords, the plaintext API key should not normally be stored permanently.

The plaintext value is shown to the developer when generated, while the database stores its hash.

## 16. API key rotation

API key rotation was added to the API:

```http
POST /api-key/rotate
```

Why:

If an API key is exposed, the developer needs a way to invalidate it without creating a new account.

For V1, rotation can simply:

```text
generate new key
↓
hash new key
↓
replace hashedApiKey
↓
return new plaintext key once
```

The previous key immediately becomes invalid.

## 17. Indexing decisions

We originally placed indexes on fields such as:

```text
userId
eventId
endpointId
```

even when they were primary keys.

Those indexes were removed.

Why:

PostgreSQL already indexes primary keys.

Instead, indexes should be added to fields used frequently for lookup or worker scheduling, such as:

```text
Endpoint.userId
Event.userId
Delivery.eventId
Delivery.endpointId
DeliveryAttempt.deliveryId
Session.userId
```

Most importantly for the worker:

```text
(status, nextAttemptAt)
```

because workers repeatedly search for due deliveries.

## 18. Architecture organization

Instead of organizing the entire application globally as:

```text
controllers/
services/
routes/
validators/
```

we decided to organize primarily by feature.

Example:

```text
src/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.routes.ts
      auth.schema.ts

    endpoints/
      endpoint.controller.ts
      endpoint.service.ts
      endpoint.routes.ts
      endpoint.schema.ts

    events/
      event.controller.ts
      event.service.ts
      event.routes.ts
      event.schema.ts

    deliveries/
      delivery.controller.ts
      delivery.service.ts
      delivery.routes.ts

  workers/
    delivery.worker.ts

  lib/
    prisma.ts

  middleware/
    auth.middleware.ts
    error.middleware.ts

  app.ts
  server.ts
```

Why:

In a larger codebase, organizing everything only by technical layer causes one feature to be spread across many unrelated folders.

Feature-based organization keeps the code required to understand one feature close together.

We are intentionally not introducing repositories, domain layers, interfaces, or full clean architecture unless the project later grows enough to justify them.

# V1 Architecture Summary

```text
Developer
   │
   │ API Key
   ▼
┌──────────────┐
│     API      │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  PostgreSQL  │
│              │
│ Event        │
│ Delivery     │
│ Attempt      │
└──────┬───────┘
       │
       │ due deliveries
       ▼
┌─────────────────┐
│ Delivery Worker │
└───────┬─────────┘
        │
        │ HTTP POST
        ▼
┌─────────────────┐
│ User's Endpoint │
└─────────────────┘

        │
        └──── success/final failure
                    │
                    ▼
           ┌─────────────────┐
           │ Email Service   │
           └─────────────────┘
```

The core principle of V1 is:

```text
The API accepts events quickly.

The database stores durable delivery state.

The worker performs delivery asynchronously.

DeliveryAttempt preserves the history of every attempt.
```
