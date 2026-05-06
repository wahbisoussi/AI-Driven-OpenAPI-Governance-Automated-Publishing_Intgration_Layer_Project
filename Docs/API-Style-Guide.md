# BIAT API Style Guide
### OpenAPI Governance Standards for the Integration Layer

**Version:** 1.0.0  
**Issued by:** BIAT Innovation & Technology — Integration Layer Team  
**Applies to:** All REST API specifications submitted to the BIAT API catalog  
**Enforcement:** Automated via the AI-Driven Governance Pipeline (Spectral + Qwen 2.5)

---

## Introduction

This document defines the mandatory standards and best practices that every OpenAPI specification must satisfy before being admitted to the BIAT production API catalog. These rules are enforced automatically by the governance pipeline. A specification that violates any **Error-level** rule will be **rejected** and cannot proceed to publication.

The rules in this guide are derived from:
- **Microsoft REST API Guidelines** (azure/azure-api-style-guide)
- **OpenAPI Specification 3.x best practices** (spectral:oas)
- **BIAT internal IT governance policies**

---

## Severity Levels

| Level | Code | Effect |
|---|---|---|
| **Error** | `error` | Blocks publication — must be fixed |
| **Warning** | `warn` | Degrades governance score — should be fixed |

A specification must achieve a **structural score ≥ 80%** with **zero errors** to pass the governance gate.

---

## Rule Categories

- [1. Versioning](#1-versioning)
- [2. Security](#2-security)
- [3. Documentation](#3-documentation)
- [4. Naming Conventions](#4-naming-conventions)
- [5. BIAT Organizational Rules](#5-biat-organizational-rules)

---

## 1. Versioning

### Rule: `biat-version-format`
**Severity:** Error  
**Category:** Microsoft REST Guidelines

All APIs must declare their version in the `info.version` field using the `YYYY-MM-DD` date format.

**Rationale:** Consistent versioning allows consumers and gateway systems to manage API lifecycle transitions predictably across the BIAT catalog.

**✅ Correct:**
```yaml
info:
  title: BIAT Payment Service
  version: "2024-06-01"
```

**❌ Incorrect:**
```yaml
info:
  title: BIAT Payment Service
  version: "1.0"        # Not a date format
  version: "v2"         # Not a date format
  version: "1.0.0"      # Not a date format
```

---

## 2. Security

### Rule: `no-http`
**Severity:** Error  
**Category:** Security

All server URLs defined in the `servers` array must use HTTPS. Plain HTTP is not permitted.

**Rationale:** All BIAT APIs handle sensitive financial data. Unencrypted HTTP transmission is a compliance violation under BIAT security policy.

**✅ Correct:**
```yaml
servers:
  - url: https://api.biat.com.tn/v1
```

**❌ Incorrect:**
```yaml
servers:
  - url: http://api.biat.com.tn/v1   # HTTP not allowed
```

---

### Rule: `require-security-schemes`
**Severity:** Error  
**Category:** Security

Every operation (path + method combination) must explicitly declare a `security` field.

**Rationale:** Security must be intentional, not implicit. Every operation must declare its authentication requirements to prevent accidental exposure of unprotected endpoints.

**✅ Correct:**
```yaml
paths:
  /accounts:
    get:
      summary: List accounts
      security:
        - OAuth2: [read:accounts]
      responses:
        "200":
          description: OK
```

**❌ Incorrect:**
```yaml
paths:
  /accounts:
    get:
      summary: List accounts
      # No security field — REJECTED
```

---

### Rule: `no-api-key-in-query`
**Severity:** Error  
**Category:** Security

API keys and authentication tokens must not be passed as query parameters.

**Rationale:** Query parameters are logged in server access logs, browser history, and proxy caches. Passing credentials as query parameters exposes them to unintended disclosure.

**Blocked parameter names:** `api_key`, `apikey`, `auth_key`

**✅ Correct:**
```yaml
# Pass credentials in headers using Authorization
security:
  - ApiKeyAuth: []
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
```

**❌ Incorrect:**
```yaml
parameters:
  - name: api_key
    in: query    # Credentials in query string — REJECTED
```

---

## 3. Documentation

### Rule: `biat-info-description`
**Severity:** Warning  
**Category:** Documentation

The `info.description` field must be present and contain at least **20 characters**.

**Rationale:** A meaningful description allows API consumers to understand the purpose of an API without reading its full specification. This is required for the BIAT Developer Portal catalog entries.

**✅ Correct:**
```yaml
info:
  description: "Manages BIAT customer account balances and transaction history."
```

**❌ Insufficient:**
```yaml
info:
  description: "API"          # Too short
  description: "My service"   # Too short
```

---

### Rule: `require-operation-summary`
**Severity:** Error  
**Category:** Documentation

Every operation must include a `summary` field.

**Rationale:** Operation summaries are used by the WSO2 Developer Portal, API documentation generators, and the governance dashboard. Missing summaries make the API catalog unusable for consumers.

**✅ Correct:**
```yaml
paths:
  /transfers:
    post:
      summary: Initiate a fund transfer
      description: Creates a new transfer request between two BIAT accounts.
```

**❌ Incorrect:**
```yaml
paths:
  /transfers:
    post:
      # No summary — REJECTED
      description: Creates a transfer.
```

---

### Rule: `require-error-responses`
**Severity:** Error  
**Category:** Documentation

Every operation must define a `400` (Bad Request) response in its `responses` object.

**Rationale:** Consumer applications must be able to handle validation errors. An API that does not document its error responses forces consumers to guess error formats, leading to integration failures.

**✅ Correct:**
```yaml
responses:
  "200":
    description: Transfer created successfully.
  "400":
    description: Invalid request payload.
  "500":
    description: Internal server error.
```

**❌ Incorrect:**
```yaml
responses:
  "200":
    description: OK
  # No 400 or 500 — REJECTED
```

---

## 4. Naming Conventions

### Rule: `property-case-camel`
**Severity:** Error  
**Category:** Microsoft REST Guidelines

All schema property names defined in `components.schemas` must use **camelCase** formatting.

**Rationale:** camelCase is the BIAT standard for JSON property naming, aligned with Microsoft REST API Guidelines. Consistent casing prevents integration issues across consumer applications and mobile clients.

**✅ Correct:**
```yaml
components:
  schemas:
    TransferRequest:
      properties:
        fromAccountId:
          type: string
        transferAmount:
          type: number
```

**❌ Incorrect:**
```yaml
components:
  schemas:
    TransferRequest:
      properties:
        from_account_id:   # snake_case — REJECTED
        TransferAmount:    # PascalCase — REJECTED
        transfer-amount:   # kebab-case — REJECTED
```

---

### Rule: `no-generic-paths`
**Severity:** Warning  
**Category:** Microsoft REST Guidelines

API paths must not use generic or placeholder names that carry no semantic meaning.

**Blocked path segments:** `/test`, `/data`, `/sample`, `/temp`

**Rationale:** Generic paths suggest incomplete API design and pollute the production catalog with non-functional or placeholder endpoints.

**✅ Correct:**
```yaml
paths:
  /transfers:
  /accounts/{accountId}/statements:
```

**❌ Incorrect:**
```yaml
paths:
  /test:      # Generic — WARNING
  /data:      # Generic — WARNING
  /sample:    # Generic — WARNING
```

---

## 5. BIAT Organizational Rules

### Rule: `biat-contact-info`
**Severity:** Error  
**Category:** BIAT Internal Policy

Every API specification must include a contact `email` in the `info.contact` block pointing to the responsible BIAT IT team.

**Rationale:** The API catalog must have an accountable owner for every published API. This enables the BIAT IT governance team to route issues, deprecation notices, and security alerts to the correct team.

**✅ Correct:**
```yaml
info:
  title: BIAT Card Management API
  version: "2024-06-01"
  contact:
    name: BIAT Integration Team
    email: it-integration@biat.com.tn
```

**❌ Incorrect:**
```yaml
info:
  title: BIAT Card Management API
  version: "2024-06-01"
  # No contact block — REJECTED

info:
  contact:
    name: Integration Team
    # No email field — REJECTED
```

---

## Scoring Model

The governance pipeline calculates a **structural score** based on the violations found:

```
score = 100 - (errors × 10) - (warnings × 2)
```

| Score | Decision |
|---|---|
| ≥ 80% with 0 errors | ✅ **APPROVED** → proceeds to WSO2 publication |
| < 80% or any errors | ❌ **REJECTED** → AI auto-fix attempted, then resubmitted |

---

## Compliance Checklist

Before submitting a specification to the governance pipeline, verify:

- [ ] `info.version` is in `YYYY-MM-DD` format
- [ ] `info.description` is at least 20 characters
- [ ] `info.contact.email` is set to the responsible BIAT team email
- [ ] All `servers[].url` values use `https://`
- [ ] Every operation has a `security` declaration
- [ ] No `api_key`, `apikey`, or `auth_key` query parameters are used
- [ ] Every operation has a `summary` field
- [ ] Every operation defines a `400` response
- [ ] All schema properties use `camelCase`
- [ ] No generic path segments (`/test`, `/data`, `/sample`, `/temp`)

---

## Automated Enforcement

This style guide is enforced automatically by the BIAT governance pipeline:

```
Spec Submitted
      │
      ▼
Spectral Linter (these rules)
      │
      ├─ Violations found → AI auto-fix (Qwen 2.5) → Resubmit
      │
      └─ Score ≥ 80%, 0 errors → WSO2 Import → Deployed → Published
```

Manual review is only triggered for edge cases flagged by the AI semantic analysis stage (duplicate detection, logical inconsistencies).

---

*BIAT Innovation & Technology — Integration Layer*  
*AI-Driven OpenAPI Governance & Automated Publishing — PFE 2025/2026*
