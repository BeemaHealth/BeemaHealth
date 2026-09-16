# Submit questionnaire answers

> Source: Bask Headless API OpenAPI v2 (`https://headless-api.bask.ninja/api/headless/v2/openapi`), captured 2026-08-23.
>
> Official index: https://docs.bask.health/llms.txt

Saves patient responses for the current session. Each `X-Client-Correlation-Id` can only have one submission  -  re-submitting returns 409.

## Endpoint

`POST /api/headless/v1/questions-answers`

**Base URL:** `https://headless-api.bask.ninja`

## Authentication

Required (send together when both are listed):

- `x-api-key: pk_live_...` (public API key)
- `Authorization: Bearer {jwt}` (patient JWT from signup, login, or magic-code verification)
## Parameters

- `x-client-correlation-id` (header, required, string, uuid)
  - Required UUID to track related requests across the patient journey (questionnaire → checkout → payment). All operations with the same correlation ID are linked together.
## Request body

```yaml
type: object
properties:
  freeFormQuestions:
    type: array
    items:
      oneOf:
        - type: object
          properties:
            type:
              type: string
              enum:
                - text
            id:
              type: string
            text:
              type: string
            answer:
              type: string
          required:
            - type
            - id
            - text
            - answer
        - type: object
          properties:
            type:
              type: string
              enum:
                - boolean
            id:
              type: string
            text:
              type: string
            answer:
              type: boolean
          required:
            - type
            - id
            - text
            - answer
        - type: object
          properties:
            type:
              type: string
              enum:
                - number
            id:
              type: string
            text:
              type: string
            answer:
              type: number
          required:
            - type
            - id
            - text
            - answer
        - type: object
          properties:
            type:
              type: string
              enum:
                - multiple-choice
            id:
              type: string
            text:
              type: string
            options:
              type: array
              items:
                type: string
            answer:
              type: array
              items:
                type: string
          required:
            - type
            - id
            - text
            - options
            - answer
  metadata:
    type: object
    additionalProperties:
      nullable: true
  medicationData:
    type: object
    properties:
      currentDose:
        type: string
        enum:
          - 0.25mg
          - 0.5mg
          - 1mg
          - 1.75mg
          - 2.5mg
          - 2.5mg
          - 5mg
          - 7.5mg
          - 10mg
          - 12.5mg
          - 15mg
      currentWeightLoss:
        type: string
        enum:
          - semaglutide
          - tirzepatide
          - neither
      dosePreference:
        type: string
        enum:
          - increase
          - decrease
          - same
      weightLossPreference:
        type: string
        enum:
          - increase
          - decrease
          - same
      protocol:
        type: string
  weightLoss:
    type: object
    properties:
      currentDose:
        type: string
      currentWeightLoss:
        type: string
      dosePreference:
        type: string
      weightLossPreference:
        type: string
      protocol:
        type: string
required:
  - freeFormQuestions
```

## Responses

### 200 - Answers submitted successfully

```yaml
type: object
properties:
  data:
    type: object
    properties:
      message:
        type: string
      warnings:
        type: array
        items:
          type: string
    required:
      - message
  requestId:
    type: string
  warnings:
    type: array
    items:
      type: string
required:
  - data
  - requestId
```

### 400 - Invalid request or missing required fields

```yaml
type: object
properties:
  error:
    type: object
    properties:
      code:
        type: string
      message:
        type: string
      details:
        type: object
        additionalProperties:
          nullable: true
    required:
      - code
      - message
  requestId:
    type: string
required:
  - error
  - requestId
```

### 401 - JWT Bearer token missing or invalid

```yaml
type: object
properties:
  error:
    type: object
    properties:
      code:
        type: string
      message:
        type: string
      details:
        type: object
        additionalProperties:
          nullable: true
    required:
      - code
      - message
  requestId:
    type: string
required:
  - error
  - requestId
```

### 409 - Answers already submitted for this X-Client-Correlation-Id

```yaml
type: object
properties:
  error:
    type: object
    properties:
      code:
        type: string
      message:
        type: string
      details:
        type: object
        additionalProperties:
          nullable: true
    required:
      - code
      - message
  requestId:
    type: string
required:
  - error
  - requestId
```

## Code samples

### cURL

```bash
curl -X POST https://headless-api.bask.ninja/api/headless/v1/questions-answers \
  -H "x-api-key: pk_live_..." \
  -H "Authorization: Bearer <patient-token>" \
  -H "X-Client-Correlation-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{"freeFormQuestions":[{"question":"What is your primary goal?","answer":"Weight loss"},{"question":"Do you have any allergies?","answer":"None"}]}'
```

### JavaScript

```javascript
const res = await fetch("https://headless-api.bask.ninja/api/headless/v1/questions-answers", {
  method: "POST",
  headers: {
    "x-api-key": "pk_live_...",
    "Authorization": `Bearer ${patientToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({"freeFormQuestions":[{"question":"What is your primary goal?","answer":"Weight loss"},{"question":"Do you have any allergies?","answer":"None"}]}),
})
const { data } = await res.json()
```

### Python

```python
import requests
res = requests.post(
  "https://headless-api.bask.ninja/api/headless/v1/questions-answers",
  headers={"x-api-key": "pk_live_...", "Authorization": f"Bearer {patient_token}"},
  json={"freeFormQuestions":[{"question":"What is your primary goal?","answer":"Weight loss"},{"question":"Do you have any allergies?","answer":"None"}]},
)
```

### TypeScript

```typescript
await bask.questionnaire.submit({"freeFormQuestions":[{"question":"What is your primary goal?","answer":"Weight loss"},{"question":"Do you have any allergies?","answer":"None"}]})
```

## OpenAPI

```yaml
method: post
path: /api/headless/v1/questions-answers
summary: Submit questionnaire answers
description: "Saves patient responses for the current session. Each `X-Client-Correlation-Id` can only have one submission \u2014 re-submitting returns 409."
tags:
  - Questionnaires
security:
  - ApiKeyAuth: []
  - BearerAuth: []
parameters:
  - schema:
      type: string
      format: uuid
      description: Required UUID to track related requests across the patient journey (questionnaire → checkout → payment). All operations with the same correlation ID are linked together.
    required: true
    name: x-client-correlation-id
    in: header
requestBody:
  content:
    application/json:
      schema:
        type: object
        properties:
          freeFormQuestions:
            type: array
            items:
              oneOf:
                - type: object
                  properties:
                    type:
                      type: string
                      enum:
                        - text
                    id:
                      type: string
                    text:
                      type: string
                    answer:
                      type: string
                  required:
                    - type
                    - id
                    - text
                    - answer
                - type: object
                  properties:
                    type:
                      type: string
                      enum:
                        - boolean
                    id:
                      type: string
                    text:
                      type: string
                    answer:
                      type: boolean
                  required:
                    - type
                    - id
                    - text
                    - answer
                - type: object
                  properties:
                    type:
                      type: string
                      enum:
                        - number
                    id:
                      type: string
                    text:
                      type: string
                    answer:
                      type: number
                  required:
                    - type
                    - id
                    - text
                    - answer
                - type: object
                  properties:
                    type:
                      type: string
                      enum:
                        - multiple-choice
                    id:
                      type: string
                    text:
                      type: string
                    options:
                      type: array
                      items:
                        type: string
                    answer:
                      type: array
                      items:
                        type: string
                  required:
                    - type
                    - id
                    - text
                    - options
                    - answer
          metadata:
            type: object
            additionalProperties:
              nullable: true
          medicationData:
            type: object
            properties:
              currentDose:
                type: string
                enum:
                  - 0.25mg
                  - 0.5mg
                  - 1mg
                  - 1.75mg
                  - 2.5mg
                  - 2.5mg
                  - 5mg
                  - 7.5mg
                  - 10mg
                  - 12.5mg
                  - 15mg
              currentWeightLoss:
                type: string
                enum:
                  - semaglutide
                  - tirzepatide
                  - neither
              dosePreference:
                type: string
                enum:
                  - increase
                  - decrease
                  - same
              weightLossPreference:
                type: string
                enum:
                  - increase
                  - decrease
                  - same
              protocol:
                type: string
          weightLoss:
            type: object
            properties:
              currentDose:
                type: string
              currentWeightLoss:
                type: string
              dosePreference:
                type: string
              weightLossPreference:
                type: string
              protocol:
                type: string
        required:
          - freeFormQuestions
responses:
  200:
    description: Answers submitted successfully
    content:
      application/json:
        schema:
          type: object
          properties:
            data:
              type: object
              properties:
                message:
                  type: string
                warnings:
                  type: array
                  items:
                    type: string
              required:
                - message
            requestId:
              type: string
            warnings:
              type: array
              items:
                type: string
          required:
            - data
            - requestId
  400:
    description: Invalid request or missing required fields
    content:
      application/json:
        schema:
          type: object
          properties:
            error:
              type: object
              properties:
                code:
                  type: string
                message:
                  type: string
                details:
                  type: object
                  additionalProperties:
                    nullable: true
              required:
                - code
                - message
            requestId:
              type: string
          required:
            - error
            - requestId
  401:
    description: JWT Bearer token missing or invalid
    content:
      application/json:
        schema:
          type: object
          properties:
            error:
              type: object
              properties:
                code:
                  type: string
                message:
                  type: string
                details:
                  type: object
                  additionalProperties:
                    nullable: true
              required:
                - code
                - message
            requestId:
              type: string
          required:
            - error
            - requestId
  409:
    description: Answers already submitted for this X-Client-Correlation-Id
    content:
      application/json:
        schema:
          type: object
          properties:
            error:
              type: object
              properties:
                code:
                  type: string
                message:
                  type: string
                details:
                  type: object
                  additionalProperties:
                    nullable: true
              required:
                - code
                - message
            requestId:
              type: string
          required:
            - error
            - requestId
```

---

Local copy of Bask Headless API reference. Live spec: `https://headless-api.bask.ninja/api/headless/v2/openapi`.
