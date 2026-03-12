# 📋 DATA-SHARE Platform - TODO List

## 🔴 Priority 0 (Critical - Must Fix Before Production)

- [x] **Add authentication to admin routes**
  - Implemented JWT-based auth
  - All `/api/admin/*` endpoints protected
  - Login page for admin portal added
  - **Impact:** Security

- [x] **Load config from `.env` file**
  - `python-dotenv` installed
  - `db.py` uses `os.getenv("DATABASE_URL")`
  - Paystack keys loaded from environment
  - SMS API credentials loaded from environment
  - **Impact:** Security

- [x] **Implement actual Paystack integration**
  - Paystack secret key used
  - Payment initialization endpoint created
  - Webhook handler for payment verification added
  - Public key passed to frontend
  - Payment status updates via webhook
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

- [x] **Add payment transaction references**
  - `transaction_ref` field added to Payment model
  - `paystack_reference` field for external ID
  - Paystack transaction details stored
  - **Impact:** Audit trail

---

## 🟡 Priority 2 (Medium - Should Have)

- [x] **Add email field to orders**
  - `email` column added to Order model
  - Order schema and form updated
  - Email notifications enabled
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

- [x] **Add reporting/analytics**
  - Daily/weekly/monthly sales reports
  - Revenue charts in admin dashboard
  - Export to CSV/Excel
  - Revenue reset and history clear controls added
  - **Impact:** Business insights

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

---

## 📊 Progress Tracker

| Category    | Total  | Completed | Progress |
| ----------- | ------ | --------- | -------- |
| P0 Critical | 3      | 3         | 100%     |
| P1 High     | 3      | 1         | 33%      |
| P2 Medium   | 4      | 1         | 25%      |
| P3 Low      | 5      | 1         | 20%      |
| **Total**   | **15** | **6**     | **40%**  |

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
