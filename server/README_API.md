# Team-Rep API Reference

This folder contains a small Express + Mongoose API for the Team Rep project. It exposes a simple Message Board and data models for Project, User, and Task.

## Setup

1. Create a MongoDB Atlas account and database:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free account and new project
   - Build a database (free tier)
   - Add your IP to the allowlist
   - Create a database user
   - Get your connection string from "Connect" button

2. Set up environment:
   - Copy `.env.example` to `.env`
   - Replace MONGODB_URI with your Atlas connection string
   - Set PORT (default: 5000)

3. Install and run:
   ```bash
   # Install dependencies
   npm install

   # Start development server
   npm run dev
   ```

## API Endpoints

### Messages API
Base URL: `/api/messages`

#### Create Message
- **POST** `/api/messages`
- Body: 
  ```json
  {
    "author": "string",
    "text": "string"
  }
  ```
- Returns: Created message object

#### List Messages
- **GET** `/api/messages`
- Returns: Array of message objects, sorted by creation date

#### Get Single Message
- **GET** `/api/messages/:id`
- Returns: Message object or 404

#### Update Message
- **PUT** `/api/messages/:id`
- Body: Any message fields to update
- Returns: Updated message object

#### Delete Message
- **DELETE** `/api/messages/:id`
- Returns: `{ success: true }` or 404

## Testing with Thunder Client
1. Install Thunder Client VSCode extension
2. Import the `thunder-collection.json` file
3. Set your base URL in the collection variables
4. Run the requests to test endpoints

## Notes
- Uses MongoDB Atlas for database (free tier works fine)
- Stores credentials in `.env` (never commit this file)
- Add proper authentication in production
