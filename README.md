# Ample Global Dashboard — Complete Phases 1, 2 & 3

Premium HTML/CSS/Vanilla JS frontend backed by Django REST Framework. Development uses SQLite; PostgreSQL is supported through `.env`.

## Run locally

Requirements: Python 3.11+, Redis, and Tesseract OCR.

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
# Windows: copy .env.example .env
# Linux/macOS: cp .env.example .env
cd backend
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

In terminal 2 start Redis (`redis-server`). In terminal 3:

```bash
cd backend
celery -A config worker -l info
```

On Windows use `celery -A config worker -l info --pool=solo`. In terminal 4, from the project root, run `python -m http.server 5500`, then open `http://127.0.0.1:5500`.

API: `http://127.0.0.1:8000/api/`; admin: `http://127.0.0.1:8000/admin/`.

Demo accounts created by `seed_demo` are `admin@ampleglobal.com` (`AmpleAdmin@2026`) and `staff@ampleglobal.com` (`StaffUpload@2026`). Manager accounts are disabled.

## Features

- Phase 1: roles/auth, customers, quotations, conversion, invoices, totals, PDF/email.
- Security: Admin/Staff permission separation, dashboard employee management, secure password change with token rotation, login throttling, 12-hour server-side token expiry, last-admin protection, and automatic logout on unauthorized access.
- FBR control preparation: invoice type selection (HR/Payroll, Normal, FBR Sales Tax), FBR actions visible only for selected FBR invoices, local pre-check, duplicate guard, and backend rejection of HR/Normal submissions. Real FBR API submission remains disabled until credentials and official mapping are configured.
- FBR readiness: Admin-only settings screen for seller NTN/STRN, registered address, province, bPOS ID, sale type, HS/product/UOM codes and sandbox/production choice; FBR-format JSON mapping; validation/blocked-attempt history; payload, response and error audit logs. API token is read only from `.env` and is never returned to the browser.
- Accounting: complete 119-account Ample Global Chart of Accounts; automatic accrual journals for invoices, payments and expenses; selectable revenue/expense/cash accounts; manual balanced journals; account ledgers; Trial Balance; Profit & Loss; Balance Sheet; and immutable posted transaction history. Accounting is Admin-only.
- Phase 2: partial/full payments and receipt PDFs; expenses/categories/attachments; projects/tasks and linked finance; dashboard, P&L, sales, aging and profitability; PDF/Excel reports.
- Phase 3: image/PDF uploads up to 15 MB; enhanced OCR for transaction date/time, reference and invoice numbers, vendor, sender/receiver names and banks, description, amount, purpose and category; Google Drive upload; structured Google Sheets automatic/manual row sync with review status.
- Premium A4 tax invoice PDF with Ample logo, issue/due/generated date-time, customer tax details, itemized tax table, totals, signatures, page number and “Powered by Ample Global” footer.
- Dashboard alerts for overdue invoices, invoices due in seven days, OCR attention and top customer.
- Premium Ample Global logo, invoice watermark and “Powered by Ample Global” footer remain intact.

## Google Drive setup

Create a Google Cloud OAuth Web Client, enable both **Google Drive API** and **Google Sheets API**, and authorize `http://127.0.0.1:8000/api/drive/callback/` as a redirect URI. Create a spreadsheet with a tab named `Invoices`, then copy the spreadsheet ID from its URL. Set `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI`, `GOOGLE_SHEETS_SPREADSHEET_ID`, and optionally `GOOGLE_SHEETS_TAB` in `.env`. Connect Google again after changing scopes. OAuth tokens are stored in the database; production should encrypt sensitive fields and use a managed secret store.

## OCR setup

Install native Tesseract in addition to the Python package. Ubuntu/Debian: `sudo apt install tesseract-ocr poppler-utils`; Windows: install Tesseract and Poppler and add both to PATH. Redis and Celery should run for background OCR; if Redis is unavailable, upload falls back to immediate local processing. `CELERY_TASK_ALWAYS_EAGER=True` is a development-only shortcut.

## Configuration and tests

All settings are documented in `.env.example`: Django, CORS, PostgreSQL, SMTP, Redis/Celery, and Google OAuth. Never commit the real `.env`.

For production set `ALLOW_PUBLIC_REGISTRATION=False`. Change `TOKEN_EXPIRY_HOURS` if the default 12-hour login duration is not suitable. Staff can upload and manage their own OCR documents, customers, quotations and projects; invoices, payments, expenses, financial reports, company settings and employee management remain Admin-only.

```bash
cd backend
python manage.py check
python manage.py test
```

After upgrading an existing copy, always run `python manage.py migrate`. Migration `0009` imports the bundled Chart of Accounts and creates balanced journals for existing invoice, payment and expense records; migration `0010` enables optional transaction-to-account mapping.

Production needs PostgreSQL, HTTPS, Redis persistence, real SMTP, protected media storage, backups, and `DEBUG=False`.

## FBR Digital Invoicing — token-ready connector

The connector is configured with the official PRAL/FBR sandbox validation and submission endpoints. Complete FBR Settings once, then paste the official sandbox token in `backend/.env` as `FBR_API_TOKEN=...` and restart Django. A token automatically enables sandbox calls unless `FBR_SUBMISSION_ENABLED=False` is explicitly set. Validate FBR performs local checks followed by official FBR validation; Submit FBR validates again, posts only the selected GST/FBR invoice, saves the returned FBR invoice number and records the complete audit response. The token is never returned to the browser. Production requires selecting Production in FBR Settings, using the production token, and completing FBR/PRAL approval and IP whitelisting.
