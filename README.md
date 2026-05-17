# IndiaMart Clone — MERN Stack B2B Marketplace

A full-stack clone of India Mart built with MongoDB, Express, React (Vite), and Node.js.

## Project Structure

```
├── backend/       # Express + MongoDB API → Deploy on Render
└── frontend/      # React + Vite SPA     → Deploy on Vercel
```

## Features

- **Product catalog** with full-text search, category/price filters, pagination
- **Supplier profiles** with product listings
- **Buyer/Seller auth** (JWT) with role-based access
- **Inquiry system** — buyers send inquiries, sellers reply
- **Seller dashboard** — add/edit/delete products with image upload (Cloudinary)
- **Save products** to wishlist
- **Reviews & ratings**
- Fully responsive with Tailwind CSS

## Local Development

### Backend
```bash
cd backend
cp .env.example .env    # fill in your secrets
npm install
npm run dev             # runs on :5000
```

### Frontend
```bash
cd frontend
cp .env.example .env    # set VITE_API_URL=http://localhost:5000/api (for local)
npm install
npm run dev             # runs on :5173
```

## Deploy to Production

### Backend → Render
1. Create a **Web Service** on [render.com](https://render.com)
2. Connect this repo, set **Root Directory** to `backend`
3. Build: `npm install` | Start: `npm start`
4. Add environment variables from `backend/.env.example`

### Frontend → Vercel
1. Import this repo on [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Framework: **Vite** (auto-detected)
4. Add env var: `VITE_API_URL=https://<your-render-app>.onrender.com/api`

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random secret key |
| `CLOUDINARY_*` | Cloudinary credentials for image upload |
| `CLIENT_URL` | Your Vercel frontend URL (for CORS) |

### Frontend (`frontend/.env`)
| Variable | Description |
|---|---|
| `VITE_API_URL` | Your Render backend URL + `/api` |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/products` | List products (with filters) |
| GET | `/api/products/featured` | Featured products |
| GET | `/api/products/:slug` | Product detail |
| POST | `/api/products` | Create product (seller) |
| GET | `/api/categories` | All categories |
| GET | `/api/suppliers` | List suppliers |
| GET | `/api/suppliers/:id` | Supplier profile |
| POST | `/api/inquiries` | Send inquiry |
| GET | `/api/inquiries/buyer` | My sent inquiries |
| GET | `/api/inquiries/seller` | Received inquiries |
