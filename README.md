# TextIT

🚀 **Live Demo:** [https://textitapp.vercel.app/](https://textitapp.vercel.app/)

TextIT is a minimal, fast, and feature-rich text sharing application built on the MERN stack. 

💡 **The Core Problem It Solves:** Ever needed to send a link, snippet, or image from your phone to your laptop? Using email is cumbersome, and messaging apps like WhatsApp force you to load your entire chat history just to paste a link. **TextIT acts as your secure, cross-device cloud clipboard.** Thanks to seamless JWT authentication, you log in once and have instant, centralized access to your links, notes, and files across all your devices without the bloat of traditional messaging apps.

## ✨ Features

- **Workspaces (Spaces)**: Organize your content into isolated spaces (Tabs).
- **Locked Spaces**: Create highly secure spaces protected by a lock key. Texts within a locked space are symmetrically encrypted (AES-256) on the server side and can only be accessed with the correct key.
- **Code Spaces**: Dedicated editor interfaces for sharing code snippets with syntax support.
- **Image & File Uploads**: Attach images, PDFs, or presentations to your shared text snippets.
- **Self-Destructing Messages**: Set expiration times (1 hour, 1 day, 7 days) on your snippets so they delete themselves automatically.
- **QR Code Sharing**: Quickly generate QR codes for any text to share across devices instantly.
- **Pinning**: Pin your most important snippets to the top of your workspace.
- **Click-to-Copy**: Quickly copy texts or snippets with a single click.

## 🛠 Tech Stack

- **Frontend**: React 19, Vite, React Router, CSS (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **Security**: bcrypt, AES-256-GCM encryption, express-rate-limit, Helmet
- **Deployment**:
  - Frontend: Vercel
  - Backend API: Render

## ⚙️ Running Locally

### Prerequisites
- Node.js installed
- A MongoDB cluster/URI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/PhaniBhaskarReddyPadala/TextIT.git
cd TextIT
```

2. Install dependencies for both server and client:
```bash
cd server
npm install
cd ../client
npm install
```

3. Setup environment variables:
Create a `.env` file in the `server` directory based on the following template:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development
CLIENT_URL=http://localhost:5173
ENCRYPTION_KEY=your_32_byte_hex_key
```

4. Start the development servers:

**Start the Backend:**
```bash
cd server
npm run dev
```

**Start the Frontend:**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173` to view the app!

## 📄 License
This project is open-source and available under the MIT License.
