# Murli Startup App

Full stack application comprising of:
- **Backend**: Node.js, Express, PostgreSQL, JSON Web Token (JWT)
- **Frontend**: React (Vite), React Router, Axios, Glassmorphism CSS styling

## Getting Started

### Database
1. Make sure you have PostgreSQL running.
2. Create a database called `murli_startup`.
3. Run the SQL provided in `backend/schema.sql`.

### Backend Configuration
1. Navigate to the `backend` folder.
2. The `db.js` file expects default postgres configuration: user `postgres`, db `"murli_startup"`, password `"password"`. You can override this using a `.env` file in the `backend/` directory:
   ```env
   DB_USER=your_user
   DB_HOST=localhost
   DB_NAME=murli_startup
   DB_PASSWORD=your_password
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret
   ```
3. Start the server with `node server.js` (runs on port 5000).

### Frontend Configuration
1. Navigate to the `frontend` folder.
2. The Axios endpoints are currently looking at `http://localhost:5000`.
3. Run `npm run dev` to start the development server.
