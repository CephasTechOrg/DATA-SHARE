# 📋 DATA-SHARE Platform - TODO List

## 🔴 Priority 0 (Critical - Must Fix Before Production)

- [ ] **Add authentication to admin routes**
  - Implement JWT or session-based auth
  - Protect all `/api/admin/*` endpoints
  - Add login page for admin portal
  - **Impact:** Security

- [ ] **Load config from `.env` file**
  - Install `python-dotenv` package
  - Update `db.py` to use `os.getenv("DATABASE_URL")`
  - Load Paystack keys from environment
  - Load SMS API credentials from environment
  - **Impact:** Security

- [ ] **Implement actual Paystack integration**
  - Initialize Paystack with secret key
  - Create payment initialization endpoint
  - Add webhook handler for payment verification
  - Pass public key to frontend
  - Update payment status based on webhook
  - **Impact:** Business-critical

---

## 🟠 Priority 1 (High - Important for Launch)

- [ ] **Add Africa's Talking SMS integration**
  - Implement actual SMS sending in `order_routes.py`
  - Use credentials from `.env`
  - Send order confirmation SMS
  - Send delivery notification SMS
  - **Impact:** User experience

- [ ] **Restrict CORS in production**
  - Replace `allow_origins=["*"]` with specific domains
  - Add environment-based CORS configuration
  - **Impact:** Security

- [ ] **Add payment transaction references**
  - Add `transaction_ref` field to Payment model
  - Add `paystack_reference` field for external ID
  - Store Paystack transaction details
  - **Impact:** Audit trail

---

## 🟡 Priority 2 (Medium - Should Have)

- [ ] **Add email field to orders**
  - Add `email` column to Order model
  - Update order schema and form
  - Enable email notifications
  - **Impact:** Communication

- [ ] **Add rate limiting**
  - Install `slowapi` or similar
  - Limit API requests per IP
  - Protect against abuse
  - **Impact:** Protection

- [ ] **Add input validation middleware**
  - Sanitize all user inputs
  - Prevent XSS attacks
  - Add request size limits
  - **Impact:** Security

- [ ] **Fix static file paths**
  - Use absolute paths or `pathlib`
  - Ensure server works from any directory
  - **Impact:** Reliability

---

## 🟢 Priority 3 (Low - Nice to Have)

- [ ] **Add accessibility (ARIA)**
  - Add ARIA labels to interactive elements
  - Ensure keyboard navigation
  - Add screen reader support
  - **Impact:** Compliance

- [ ] **Add unit/integration tests**
  - Set up pytest
  - Write tests for all API endpoints
  - Add frontend tests
  - **Impact:** Quality

- [ ] **Add bundle management features**
  - Add `is_active` field to bundles
  - Add `validity_days` field
  - Enable/disable bundles from admin
  - **Impact:** Admin flexibility

- [ ] **Add order tracking**
  - Generate unique order reference
  - Allow customers to track orders
  - Add order history page
  - **Impact:** User experience

- [ ] **Add reporting/analytics**
  - Daily/weekly/monthly sales reports
  - Revenue charts in admin dashboard
  - Export to CSV/Excel
  - **Impact:** Business insights

---

## 📊 Progress Tracker

| Category    | Total  | Completed | Progress |
| ----------- | ------ | --------- | -------- |
| P0 Critical | 3      | 0         | 0%       |
| P1 High     | 3      | 0         | 0%       |
| P2 Medium   | 4      | 0         | 0%       |
| P3 Low      | 5      | 0         | 0%       |
| **Total**   | **15** | **0**     | **0%**   |

---

## 🗓️ Suggested Timeline

| Week   | Tasks                       |
| ------ | --------------------------- |
| Week 1 | Complete all P0 items       |
| Week 2 | Complete all P1 items       |
| Week 3 | Complete P2 items           |
| Week 4 | Complete P3 items + testing |

---

_Last Updated: March 12, 2026_
