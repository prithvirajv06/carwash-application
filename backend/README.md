# CarWash Backend API

Node.js + TypeScript REST API for a mobile car wash service operating in apartment parking lots.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: Firebase OTP (customers) + JWT (all roles)
- **Payments**: Razorpay
- **Email**: Nodemailer (SMTP)
- **PDF**: PDFKit (invoice generation)
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting, bcryptjs

---

## Setup

```bash
# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env

# Run in development
npm run dev

# Build for production
npm run build
npm start
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT signing |
| `JWT_EXPIRES_IN` | JWT expiry (e.g. `7d`) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `RAZORPAY_ID` | Razorpay key ID |
| `RAZORPAY_SECRET` | Razorpay secret key |
| `FRONTEND_URL` | Frontend URL for CORS and email links |

---

## API Reference

Base URL: `http://localhost:3000/api`

All protected endpoints require: `Authorization: Bearer <token>`

All responses follow the standard envelope:
```json
{
  "success": true,
  "message": "...",
  "data": {},
  "meta": { "total": 0, "page": 1, "limit": 10, "totalPages": 0 }
}
```

---

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/customer/login` | — | Firebase OTP login (customer) |
| POST | `/auth/admin/login` | — | Username/password login (admin/employee) |
| POST | `/auth/forgot-password` | — | Send password reset email |
| POST | `/auth/reset-password` | — | Reset password with token |
| PUT | `/auth/change-password` | ✅ | Change own password |
| GET | `/auth/me` | ✅ | Get current user profile |

**Customer Login**
```json
POST /auth/customer/login
{
  "idToken": "<firebase_id_token>",
  "name": "John Doe",
  "phone": "9876543210",
  "apartmentId": "<apartment_id>"
}
```

**Admin Login**
```json
POST /auth/admin/login
{
  "email": "admin@example.com",
  "password": "Admin@123"
}
```

---

### Users (Admin only)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/users` | admin, superadmin | List all users (paginated) |
| POST | `/users` | admin, superadmin | Create admin/employee (sends temp password email) |
| GET | `/users/employees` | admin, superadmin | List active employees |
| GET | `/users/:id` | admin, superadmin | Get user by ID |
| PATCH | `/users/:id/toggle-status` | admin, superadmin | Activate/deactivate user |
| GET | `/users/profile` | ✅ any | Get own profile |
| PUT | `/users/profile` | ✅ any | Update own profile |

**Create Staff Account**
```json
POST /users
{
  "name": "Jane Smith",
  "email": "jane@carwash.com",
  "phone": "9876543210",
  "role": "employee"
}
```

---

### Apartments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/apartments` | — | List apartments (public) |
| GET | `/apartments/:id` | — | Get apartment details |
| POST | `/apartments` | admin | Create apartment |
| PUT | `/apartments/:id` | admin | Update apartment |
| DELETE | `/apartments/:id` | admin | Deactivate apartment |

---

### Cars

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/cars/my` | customer | Get own cars |
| POST | `/cars` | customer | Add a new car |
| GET | `/cars/:id` | ✅ any | Get car details |
| PUT | `/cars/:id` | customer | Update car info |
| DELETE | `/cars/:id` | customer | Remove car |
| GET | `/cars` | admin, employee | List all cars (paginated) |

**Add Car**
```json
POST /cars
{
  "nickname": "My Hatchback",
  "type": "Hatchback",
  "licensePlate": "TN01AB1234",
  "parkingLotInfo": "Block A, Slot 12"
}
```

Car types: `Hatchback | Sedan | SUV | MUV | Luxury | Van`

---

### Plans

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/plans` | — | List all active plans |
| GET | `/plans/:id` | — | Get plan details |
| GET | `/plans/:planId/price/car/:carId` | ✅ | Get price for a specific car |
| POST | `/plans` | admin | Create plan |
| PUT | `/plans/:id` | admin | Update plan |
| DELETE | `/plans/:id` | admin | Deactivate plan |

**Create Plan**
```json
POST /plans
{
  "name": "Monthly Basic",
  "description": "Daily exterior wash",
  "durationDays": 30,
  "attributes": ["Exterior Wash", "Tyre Cleaning", "Dashboard Wipe"],
  "priceMatrix": [
    { "carType": "Hatchback", "apartmentId": "<id>", "price": 999 },
    { "carType": "SUV", "apartmentId": "<id>", "price": 1299 }
  ]
}
```

---

### Subscriptions & Payments (Razorpay Flow)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/subscriptions/my` | customer | Get own subscriptions |
| POST | `/subscriptions` | customer | Initiate subscription + create Razorpay order |
| POST | `/subscriptions/verify-payment` | customer | Verify payment, activate subscription, generate invoice |
| POST | `/subscriptions/:id/renew` | customer | Renew subscription |
| GET | `/subscriptions` | admin | List all subscriptions |

**Payment Flow:**

1. Customer calls `POST /subscriptions` → receives `orderId` + `amount`
2. Frontend opens Razorpay checkout with that `orderId`
3. On success, frontend calls `POST /subscriptions/verify-payment` with the 3 Razorpay fields
4. Backend verifies HMAC signature → activates subscription → generates PDF invoice → sends confirmation email

**Initiate Subscription**
```json
POST /subscriptions
{
  "carId": "<car_id>",
  "planId": "<plan_id>"
}
```
Response:
```json
{
  "subscriptionId": "...",
  "orderId": "order_xxx",
  "amount": 999,
  "currency": "INR",
  "keyId": "rzp_test_xxx"
}
```

**Verify Payment**
```json
POST /subscriptions/verify-payment
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "signature_string",
  "subscriptionId": "<subscription_id>"
}
```

---

### Payments

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/payments/my` | customer | Own payment history |
| GET | `/payments/invoice/:id/download` | ✅ any | Download PDF invoice |
| GET | `/payments` | admin | All payments (filterable) |
| GET | `/payments/:id` | admin | Payment detail |

---

### Dropdown Configs

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/dropdowns` | — | List dropdowns (filter by `?category=&parentId=`) |
| GET | `/dropdowns/categories` | — | List all categories |
| GET | `/dropdowns/tree/:category` | — | Nested tree for a category |
| POST | `/dropdowns` | admin | Create dropdown option |
| PUT | `/dropdowns/:id` | admin | Update dropdown option |
| DELETE | `/dropdowns/:id` | admin | Deactivate dropdown option |

**Create Dropdown**
```json
POST /dropdowns
{
  "label": "Chennai",
  "value": "chennai",
  "category": "city",
  "parentId": null,
  "sortOrder": 1
}
```

Use `GET /dropdowns/tree/:category` to get a fully nested tree for building dependent selects in the UI.

---

### Service Tasks

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/tasks/my` | employee | Employee's own task list |
| GET | `/tasks` | admin, employee | All tasks (filter by status/date/employee) |
| POST | `/tasks` | admin | Create and assign task |
| PATCH | `/tasks/:id/status` | admin, employee | Update task status |
| PATCH | `/tasks/:id/assign` | admin | Reassign task to different employee |

**Create Task**
```json
POST /tasks
{
  "carId": "<car_id>",
  "employeeId": "<employee_user_id>",
  "subscriptionId": "<subscription_id>",
  "scheduledDate": "2025-01-15T08:00:00.000Z",
  "notes": "Customer prefers early morning"
}
```

Task statuses: `Pending | InProgress | Done | Rejected`

---

### Dashboard (Admin)

| Method | Endpoint | Roles | Description |
|---|---|---|---|
| GET | `/dashboard/stats` | admin | Full dashboard metrics |
| GET | `/dashboard/revenue?year=2025&month=1` | admin | Revenue report |
| GET | `/dashboard/info/:type` | — | Static content (faq/about/contact) |

**Dashboard Stats Response**
```json
{
  "customers": { "newWeekly": 12, "newMonthly": 47, "totalActive": 230 },
  "revenue": { "monthly": 45000, "yearly": 380000, "byMonth": [...] },
  "subscriptions": { "total": 310, "active": 230 },
  "tasks": { "pending": 18, "completedToday": 42 },
  "employeePerformance": [
    { "employeeName": "Ravi", "washesPerDay": 8, "washesPerWeek": 42, "washesPerMonth": 160 }
  ]
}
```

---

## RBAC Summary

| Role | Permissions |
|---|---|
| `superadmin` | Full access to everything |
| `admin` | Manage staff, plans, tasks, view all data |
| `employee` | View & update own assigned tasks |
| `customer` | Manage own cars, subscriptions, payments |

---

## Project Structure

```
src/
├── config/
│   ├── database.ts          # MongoDB connection
│   └── firebase.ts          # Firebase Admin SDK
├── controllers/
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── apartment.controller.ts
│   ├── car.controller.ts
│   ├── plan.controller.ts
│   ├── subscription.controller.ts
│   ├── dropdown.controller.ts
│   ├── task.controller.ts
│   ├── payment.controller.ts
│   └── dashboard.controller.ts
├── middlewares/
│   ├── auth.middleware.ts   # JWT verify + RBAC
│   ├── error.middleware.ts  # Global error handler
│   └── validate.middleware.ts # Zod request validator
├── models/
│   ├── User.model.ts
│   ├── Apartment.model.ts
│   ├── Car.model.ts
│   ├── Plan.model.ts
│   ├── Subscription.model.ts
│   ├── DropdownConfig.model.ts
│   ├── ServiceTask.model.ts
│   └── Payment.model.ts
├── routes/
│   ├── index.ts             # Route registry
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── apartment.routes.ts
│   ├── car.routes.ts
│   ├── plan.routes.ts
│   ├── subscription.routes.ts
│   ├── dropdown.routes.ts
│   ├── task.routes.ts
│   ├── payment.routes.ts
│   └── dashboard.routes.ts
├── services/
│   ├── mail.service.ts      # Nodemailer email sending
│   ├── razorpay.service.ts  # Razorpay order + verification
│   └── invoice.service.ts   # PDFKit invoice generation
├── types/
│   └── index.ts             # Shared TypeScript interfaces
├── utils/
│   ├── jwt.ts
│   ├── logger.ts            # Winston logger
│   ├── password.ts          # bcrypt + generators
│   └── response.ts          # Standardized API response helpers
├── validators/
│   ├── auth.validator.ts
│   ├── car.validator.ts
│   ├── dropdown.validator.ts
│   ├── plan.validator.ts
│   ├── subscription.validator.ts
│   ├── task.validator.ts
│   └── user.validator.ts
├── app.ts                   # Express app setup
└── index.ts                 # Server bootstrap
```



```json
final _sampleData = {
  'summary': DashboardSummary(
    totalCars: 2,
    activeSubscriptions: 1,
    totalSubscriptions: 4,
    pendingTasks: 2,
    completedWashesTotal: 31,
  ),
  'activeSubscriptions': [
    ActiveSubscription(
      id: '664f1a2b3c4d5e6f7a8b9c10',
      carNickname: 'My Swift',
      carType: 'Hatchback',
      licensePlate: 'TN09AB1234',
      planName: 'Premium Monthly',
      planAttributes: ['Exterior Wash', 'Interior Vacuum', 'Tyre Shine'],
      daysLeft: 3,
      completedWashes: 22,
      pendingWashes: 2,
      isExpiringSoon: true,
      progressPercent: 90,
      expiryDate: DateTime(2026, 4, 1),
      nextTaskDate: '2026-03-30T07:00:00.000Z',
      nextTaskStatus: 'Pending',
    ),
  ],
  'nextWash': NextWash(
    status: 'Pending',
    carNickname: 'My Swift',
    carType: 'Hatchback',
    licensePlate: 'TN09AB1234',
    employeeName: 'Suresh K',
    scheduledDate: DateTime(2026, 3, 30, 7),
  ),
  'recentPayments': [
    RecentPayment(
      id: '1',
      amount: 1299,
      currency: 'INR',
      status: 'captured',
      invoiceNumber: 'INV-202603-A1B2C3',
      invoiceUrl: '/uploads/invoices/INV-202603-A1B2C3.pdf',
      createdAt: DateTime(2026, 3, 1, 10, 22),
    ),
    RecentPayment(
      id: '2',
      amount: 999,
      currency: 'INR',
      status: 'captured',
      invoiceNumber: 'INV-202602-D4E5F6',
      invoiceUrl: '/uploads/invoices/INV-202602-D4E5F6.pdf',
      createdAt: DateTime(2026, 2, 1, 9, 15),
    ),
    RecentPayment(
      id: '3',
      amount: 1299,
      currency: 'INR',
      status: 'failed',
      invoiceNumber: 'INV-202601-G7H8I9',
      invoiceUrl: null,
      createdAt: DateTime(2026, 1, 5, 14, 30),
    ),
  ],
};
```