# Ample Global Dashboard — Frontend Audit and Architecture

## Existing screens

| Screen | Existing UI | Data expected | Previous dummy source |
|---|---|---|---|
| Sign in | Email, password, remember-me | User identity, token, role | Hardcoded JS users |
| Registration | Name, email, department, password | Staff user record | Browser localStorage |
| Password reset | Email recovery form | Secure reset token/email | Direct local password replacement |
| Dashboard | Invoice KPIs, finance bars, projects, activity | Invoices, payments, expenses, projects | Local arrays |
| Customers | Cards and create dialog | Contact, tax number, address | `if_customers` localStorage |
| Quotations | List, create form, PDF, conversion | Header, line items, totals, status | `if_quotations` localStorage |
| Invoices | Create form, items, status, PDF/list | Header, line items, totals, customer | `if_invoices` localStorage |
| Payments | List and record dialog | Invoice payment ledger | `if_payments` localStorage |
| Expenses | List and create dialog | Expense data | `if_expenses` localStorage |
| Projects | Project cards/create dialog | Customer, budget, status | `if_projects` localStorage |
| Reports | KPIs and monthly table | Aggregated finance data | Client-side calculations |
| Company settings | Company/tax/payment fields | Company profile | `if_company` localStorage |

## Framework decision

Django + Django REST Framework is selected because this system needs structured authentication, roles, Django Admin, ORM/migrations, nested business documents, email, PDFs, PostgreSQL, and future Celery integration. Flask would require substantially more custom plumbing for the same controls.

## Phase plan

- Phase 1: Django project, custom user/roles, token auth, password reset, users admin/CRUD, customers, quotations, invoices, PDFs, email, conversion, API wiring, tests.
- Phase 2: payments, expenses, projects/tasks, dashboard/report APIs, PDF/Excel exports and filters.
- Phase 3: generic documents, Google Drive OAuth/sync, Celery/Redis OCR and processing UI.

## Completion status

All three phases are implemented. Previous browser-only Phase 2 dummy flows are replaced by REST calls. Phase 3 includes upload/link relationships, OCR processing state and extracted data, Drive connection/status, automatic/manual upload, browsing, and linking an existing Drive item. External Google, Redis, Tesseract, SMTP, and PostgreSQL services require the credentials or installations documented in `README.md`.
