# VLOGE — Blog Platform

VLOGE is a blogging platform where anyone can create and share their own blog. Write articles, manage your profile, save bookmarks and discover content from other authors.

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** SQLite
- **Frontend:** HTML, CSS, JavaScript

## Features

- 📝 Create, edit and delete articles
- 👤 User registration and authentication
- 🔖 Bookmarks — save articles for later
- 👤 User profiles with settings
- 📋 Personal article management ("My Articles")
- 📚 Resources and useful links pages
- 🎨 Responsive design

## Project Structure

```
site/
├── public/
│   ├── css/
│   │   ├── about.css
│   │   ├── article.css
│   │   ├── auth.css
│   │   ├── bookmarks.css
│   │   ├── home.css
│   │   ├── profile-layout.css
│   │   └── ...
│   ├── js/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── bookmarks.js
│   │   ├── edit-article.js
│   │   ├── main.js
│   │   ├── my-articles.js
│   │   └── profile.js
│   └── img/
│       └── logo/
├── views/
│   ├── index.html
│   ├── article.html
│   ├── create-article.html
│   ├── edit-article.html
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── bookmarks.html
│   ├── my-articles.html
│   ├── settings.html
│   ├── about.html
│   ├── resources.html
│   └── useful-links.html
├── server.js
├── package.json
└── .gitignore
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+

### Installation

```bash
# Clone the repository
git clone https://github.com/zhkaa/VLOGE.git
cd VLOGE

# Install dependencies
npm install

# Start the server
node server.js
```

The app will be running at `http://localhost:3000`

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
```
