# Spark ERP — School Portal

A web-based school management portal for handling students, attendance, fees, exams, and more.

## Tech Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express.js
- **Database:** MongoDB
- **Auth:** Firebase Authentication
- **Storage:** Cloudinary

## Project Structure

```
Intern1_SchoolPortal/
├── school portal/      # React frontend
└── backend/            # Node.js backend
```

## Getting Started

### 1. Backend

```bash
cd backend
```

Open `config.env` and fill in your credentials:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=any_random_secret_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

Open `config/firebase-admin.js` and replace the `serviceAccount` object with your Firebase service account JSON.  
Download it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key

```bash
npm install
node index.js
```

Server runs on `http://localhost:5000`

---

### 2. Frontend

```bash
cd "school portal"
```

Open `.env` and set:

```env
VITE_API_URL=http://localhost:5000/api
```

Open `src/config/firebase.ts` and add your Firebase web config.

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Free Accounts You'll Need

| Service | Link |
|---------|------|
| MongoDB Atlas | https://www.mongodb.com/atlas |
| Firebase | https://console.firebase.google.com |
| Cloudinary | https://cloudinary.com |
| Razorpay (Test) | https://razorpay.com |

## API Testing

Use [Postman](https://www.postman.com/downloads/) to test backend endpoints.  
Base URL: `http://localhost:5000/api`
