# Data Flow: Bank → App → Reminders → Reconciliation

This document describes the complete data flow for the South African Budget Tracker's scheduled payments feature.

## High-Level Flow Diagram

```mermaid
flowchart TB
    %% ── BANKS (Data Sources) ──
    subgraph BANKS["🏦 Banks"]
        FNB["First National Bank<br/><small>CSV Export</small>"]
        ABSA["ABSA<br/><small>CSV Export</small>"]
        CAPITEC["Capitec<br/><small>CSV Export</small>"]
        NEDBANK["Nedbank<br/><small>CSV Export</small>"]
        STANDARD["Standard Bank<br/><small>CSV Export</small>"]
        INVESTEC["Investec<br/><small>API (OAuth2)</small>"]
        VAULT22["Vault22<br/><small>API (OAuth2)</small>"]
    end

    %% ── USER (Data Entry & Scheduling) ──
    subgraph USER_INPUT["👤 User Input"]
        MANUAL_ENTRY["Manual Transaction Entry<br/><small>UI Form</small>"]
        SCHEDULE_PAYMENT["Define Scheduled Payment<br/><small>RA, Medical Aid, Debit Orders</small>"]
        SET_REMINDERS["Configure Reminders<br/><small>Email / Push / SMS</small>"]
        SET_RULES["Set Reconciliation Rules<br/><small>Match Strategy, Text, Tolerance</small>"]
    end

    %% ── APP (Core Services) ──
    subgraph APP["📱 Budget Tracker App"]

        direction TB

        subgraph IMPORT["Import Layer"]
            CSV_PARSER["CSV Parser Service<br/><small>Normalizes FNB/ABSA/Capitec/Nedbank/Standard Bank formats</small>"]
            API_INGESTION["API Ingestion<br/><small>OAuth2 → fetch → normalize (Investec, Vault22)</small>"]
        end

        subgraph STORAGE["Storage Layer"]
            NORMALIZED_TX["Normalized Transactions<br/><small>{ date, amount, merchant, category }<br/>Firestore Collection</small>"]
            SCHEDULED_PAYMENTS["Scheduled Payments<br/><small>MongoDB / Mongoose<br/>{ name, amount, frequency, due_date,<br/>reminders, reconciliation }</small>"]
        end

        subgraph RECONCILIATION["Reconciliation Engine"]
            MATCH_TX["Match Transactions<br/>↕︎<br/>Scheduled Payments"]
            STRATEGIES["Match Strategies<br/><small>• description_contains<br/>• description_exact<br/>• amount_match<br/>• description_and_amount</small>"]
            ADVANCE_DATE["Advance Due Date<br/><small>Advance → Next Occurrence</small>"]
            UPDATE_RECON["Update Reconciled IDs<br/><small>Prevents duplicate matching</small>"]
        end

        subgraph REMINDER["Reminder Service"]
            CHECK_DUE["Check Due Payments<br/><small>Lookahead: 7 days</small>"]
            SEND_REMINDER["Send Reminder<br/><small>Email / Push / SMS</small>"]
            OVERDUE_ALERT["Overdue Alert<br/><small>If due_date passed unreconciled</small>"]
        end

        subgraph EXPORT["Output Layer"]
            RECONCILIATION_REPORT["Reconciliation Report<br/><small>Matched vs Unmatched</small>"]
            CASHFLOW_PROJECTION["Cash Flow Projection<br/><small>Upcoming Payments</small>"]
        end
    end

    %% ── EXTERNAL SERVICES ──
    subgraph EXTERNAL["📬 External Services"]
        EMAIL["Email (SendGrid)"]
        PUSH["Push (FCM)"]
        SMS["SMS (Twilio)"]
    end

    %% ── FLOWS ──

    %% Bank → CSV Parser
    FNB -->|CSV Upload| CSV_PARSER
    ABSA -->|CSV Upload| CSV_PARSER
    CAPITEC -->|CSV Upload| CSV_PARSER
    NEDBANK -->|CSV Upload| CSV_PARSER
    STANDARD -->|CSV Upload| CSV_PARSER

    %% Bank → API Ingestion
    INVESTEC -->|OAuth2 API| API_INGESTION
    VAULT22 -->|OAuth2 API| API_INGESTION

    %% CSV Parser → Normalized Transactions
    CSV_PARSER --> NORMALIZED_TX
    API_INGESTION --> NORMALIZED_TX

    %% User Input → Scheduled Payments
    MANUAL_ENTRY --> NORMALIZED_TX
    SCHEDULE_PAYMENT --> SCHEDULED_PAYMENTS
    SET_REMINDERS --> SCHEDULED_PAYMENTS
    SET_RULES --> SCHEDULED_PAYMENTS

    %% Reconciliation
    NORMALIZED_TX --> MATCH_TX
    SCHEDULED_PAYMENTS --> MATCH_TX
    MATCH_TX --> STRATEGIES
    STRATEGIES -->|Match Found| ADVANCE_DATE
    ADVANCE_DATE --> UPDATE_RECON
    UPDATE_RECON --> SCHEDULED_PAYMENTS
    MATCH_TX -->|No Match| UNMATCHED_POOL

    %% Reminders
    SCHEDULED_PAYMENTS --> CHECK_DUE
    CHECK_DUE --> SEND_REMINDER
    SEND_REMINDER -->|Email| EMAIL
    SEND_REMINDER -->|Push| PUSH
    SEND_REMINDER -->|SMS| SMS
    CHECK_DUE --> OVERDUE_ALERT
    OVERDUE_ALERT -->|Missed Payment Alert| EMAIL

    %% Output
    ADVANCE_DATE --> RECONCILIATION_REPORT
    UPDATE_RECON --> RECONCILIATION_REPORT
    RECONCILIATION_REPORT --> CASHFLOW_PROJECTION
    SCHEDULED_PAYMENTS --> CASHFLOW_PROJECTION

    %% Styling
    classDef bank fill:#e1f5fe,stroke:#0288d1,color:#01579b
    classDef input fill:#fff3e0,stroke:#f57c00,color:#e65100
    classDef service fill:#f3e5f5,stroke:#7b1fa2,color:#4a148c
    classDef storage fill:#e8f5e9,stroke:#2e7d32,color:#1b5e20
    classDef external fill:#fce4ec,stroke:#c62828,color:#b71c1c
    classDef output fill:#fff8e1,stroke:#f9a825,color:#f57f17

    class FNB,ABSA,CAPITEC,NEDBANK,STANDARD,INVESTEC,VAULT22 bank
    class MANUAL_ENTRY,SCHEDULE_PAYMENT,SET_REMINDERS,SET_RULES input
    class CSV_PARSER,API_INGESTION,MATCH_TX,STRATEGIES,ADVANCE_DATE,UPDATE_RECON,CHECK_DUE,SEND_REMINDER,OVERDUE_ALERT service
    class NORMALIZED_TX,SCHEDULED_PAYMENTS storage
    class EMAIL,PUSH,SMS external
    class RECONCILIATION_REPORT,CASHFLOW_PROJECTION,UNMATCHED_POOL output
```

## Sequence Diagram: End-to-End Flow

```mermaid
sequenceDiagram
    participant User as 👤 User
    participant UI as 📱 App UI
    participant API as 🔌 Backend API
    participant CSV as 📄 CSV Parser
    participant Recon as ⚖️ Reconciliation Engine
    participant Remind as 🔔 Reminder Service
    participant DB as 💾 Database
    participant Email as 📬 Email/Push/SMS

    %% ── 1. Define Scheduled Payment ──
    rect rgb(200, 240, 200)
        Note over User,DB: 1. USER DEFINES SCHEDULED PAYMENT
        User->>UI: Define "Old Mutual RA - R4,500/month"
        UI->>API: POST /api/scheduled-payments
        Note over API: { name, amount, frequency,<br/>due_date, category,<br/>reminders, reconciliation }
        API->>DB: Save to MongoDB
        DB-->>API: Confirmation
        API-->>UI: 201 Created
        UI-->>User: ✅ Payment scheduled
    end

    %% ── 2. Import Bank Transactions ──
    rect rgb(200, 220, 255)
        Note over User,DB: 2. IMPORT BANK TRANSACTIONS
        User->>UI: Upload FNB CSV statement
        UI->>API: POST /api/scheduled-payments/import/csv
        API->>CSV: parseCSV(csvData, 'fnb')
        CSV-->>API: Normalized transactions [{ date, amount, merchant }]
        API->>DB: Save to Firestore (batch)
        DB-->>API: Saved with IDs
        Note over API,Recon: Auto-reconcile against scheduled payments
        API->>Recon: reconcileTransactions(userId, transactions)
        Recon->>DB: Fetch active scheduled payments
        DB-->>Recon: [{ name, amount, due_date, reconciliation }]
        Note over Recon: Match using configured strategies<br/>(description + amount)
        Recon->>DB: Update matched payments (advance due_date)
        DB-->>Recon: Confirmation
        Recon-->>API: { matched: [...], unmatched: [...], summary }
        API-->>UI: { imported: 47, reconciliation: { matched: 5, unmatched: 42 } }
        UI-->>User: 📊 5 transactions reconciled
    end

    %% ── 3. Reminder Generation ──
    rect rgb(255, 220, 200)
        Note over Remind,Email: 3. REMINDER GENERATION (Cron job)
        Remind->>DB: findPaymentsDueForReminder()
        DB-->>Remind: Payments due within 7 days
        Note over Remind: Calculate days until due
        Remind->>Remind: Check reminder cooldown
        Remind->>Email: Send email reminder
        Email-->>User: 📧 "Old Mutual RA due in 3 days"
        Remind->>Email: Send push notification
        Email-->>User: 📱 Push: "R4,500 due on 1 July"
    end

    %% ── 4. Manual Reconciliation ──
    rect rgb(200, 200, 255)
        Note over User,DB: 4. MANUAL RECONCILIATION
        User->>UI: Mark "Old Mutual RA" as paid
        UI->>API: POST /api/scheduled-payments/:id/reconcile
        Note over API: { transactionId: "abc123" }
        API->>Recon: manualReconcile(id, transactionId)
        Recon->>DB: Update payment (add reconciled ID, advance date)
        DB-->>Recon: Updated payment
        Recon-->>API: { paymentId, newDueDate, status }
        API-->>UI: ✅ Payment reconciled
        UI-->>User: ✅ Old Mutual RA marked as paid
    end

    %% ── 5. Reconciliation Summary ──
    rect rgb(240, 240, 200)
        Note over User,DB: 5. VIEW RECONCILIATION STATUS
        User->>UI: View reconciliation dashboard
        UI->>API: GET /api/scheduled-payments/reconciliation/summary
        API->>DB: Fetch all user's payments
        DB-->>API: Payments with reconciliation data
        API-->>UI: { total: 12, overdue: 2, reconciled: 8 }
        UI-->>User: 📊 Dashboard with overdue alerts
    end
```

## Security Flow (POPIA & AES-256)

```mermaid
flowchart LR
    subgraph CLIENT["Client Browser"]
        HTTPS["HTTPS / TLS 1.3"]
        OAUTH2["OAuth2 Token<br/>Firebase Auth"]
    end

    subgraph SERVER["Backend Server"]
        AUTH_MW["Auth Middleware<br/><small>Verify Firebase JWT</small>"]
        ENCRYPT["AES-256-GCM<br/>Encryption Layer"]
        DB_STORE["Database<br/><small>Firestore + MongoDB</small>"]
    end

    HTTPS -->|Encrypted Request| AUTH_MW
    OAUTH2 -->|Bearer Token| AUTH_MW
    AUTH_MW -->|Authorized| ENCRYPT
    ENCRYPT -->|Encrypted Payload| DB_STORE
```

## Architecture Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React + TypeScript | UI for managing payments, importing CSVs, viewing reconciliation |
| **API** | Express.js | REST endpoints for CRUD, CSV import, reconciliation, reminders |
| **Database** | Firestore (transactions) + MongoDB (scheduled payments) | Persistent storage with proper indexing |
| **CSV Parsing** | Custom service | Normalizes FNB, ABSA, Capitec, Nedbank, Standard Bank formats |
| **Reconciliation** | Custom engine | Matches bank txns → scheduled payments via configurable strategies |
| **Reminders** | Custom service | Email (SendGrid), Push (FCM), SMS (Twilio) integration |
| **Security** | Firebase Auth + TLS + AES-256 | POPIA-compliant data protection |