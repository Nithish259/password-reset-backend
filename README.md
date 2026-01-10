# 🔐 MERN Authentication Backend

This is the backend service for a MERN stack application that provides:
- User authentication using JWT (Authorization Header)
- Secure password reset using OTP (Brevo Email API)
- Protected routes
- MVC architecture

---

## 🚀 Tech Stack

- Node.js
- Express.js
- MongoDB + Mongoose
- JWT (JSON Web Token)
- bcryptjs
- Brevo (Sendinblue) Email API
- Axios

---
## 🔑 Authentication Flow

1. User logs in / registers
2. Backend generates JWT
3. JWT is returned in API response
4. Frontend stores token in `localStorage`
5. Token sent via `Authorization: Bearer <token>`
6. Protected routes verify token using middleware

PostMan Documentation
https://documenter.getpostman.com/view/21383297/2sBXVeGD9B

