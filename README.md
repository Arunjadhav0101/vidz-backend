# vidz-backend

[![License](https://img.shields.io/github/license/sonu-shivcharan/vidz-backend)](LICENSE)
[![Issues](https://img.shields.io/github/issues/sonu-shivcharan/vidz-backend)](https://github.com/sonu-shivcharan/vidz-backend/issues)

## Overview

**vidz-backend** is the backend service for the Vidz platform, designed to provide robust, scalable, and efficient APIs for video sharing, streaming, and user management. This project exposes RESTful endpoints to support frontend applications and enables seamless integration with databases and cloud storage.

## Features

- User authentication and authorization (JWT-based)
- Video upload, streaming, and management
- Comments and likes on videos
- User profiles and social features
- Secure API endpoints
- Error handling and validation

## Technologies Used

- **Node.js** / **Express.js**
- **MongoDB** (or your database of choice)
- **Multer** (for file uploads)
- **Cloud Storage** (Cloudinary)
- **JWT** for authentication
- **dotenv** for environment variable management

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- npm or yarn
- MongoDB database (local or cloud)
- Cloud storage account (cloudinary)

### Installation

1. **Clone the repository:**
    ```bash
    git clone https://github.com/sonu-shivcharan/vidz-backend.git
    cd vidz-backend
    ```

2. **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```

3. **Configure environment variables:**
    - Copy `.env.sample` to `.env` and fill in your secrets.
    ```env
    PORT=8000
    MONGODB_URL=mongodb_uri
    CORS_ORIGIN=*
    ACCESS_TOKEN_SECRET=
    ACCESS_TOKEN_EXPIRY=1d
    REFRESH_TOKEN_SECRET=
    REFRESH_TOKEN_EXPIRY=10d
    CLOUDINARY_CLOUD_NAME=
    CLOUDINARY_API_KEY=
    CLOUDINARY_API_SECRET=
    ```

4. **Run the server:**
    ```bash
    npm dev
    # or
    yarn start
    ```

    The server will start on `http://localhost:3000` (default).

### Folder Structure

```
vidz-backend/
├── src/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── utils/
│   └── app.js
├── .env.sample
├── package.json
└── README.md
└── Dockerfile
```

## API Documentation

API endpoints are available under `/api`.  
For detailed API documentation, refer to the [API Docs](https://documenter.getpostman.com/view/40940571/2sB2xCfoir)

## Contributing

Contributions are welcome!  
Please open an issue or submit a pull request for improvements or bug fixes.

1. Fork the repo
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For questions, suggestions, or support, open an issue or contact [@sonu-shivcharan](https://github.com/sonu-shivcharan).

---

*Happy coding!*

## Dockerfile

To run mongodb 
docker run -d   --name mongo-db   --network backend-network   -p 27017:27017   mongo:6.0

To run backend
docker run -d --name backend-container --network backend-network -p 8000:8000 backend-app
