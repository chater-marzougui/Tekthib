# server

A Node.js backend API built with Express, TypeScript, and modern development tools.

## Features

- 🚀 **Express.js** - Fast, minimalist web framework
- 📝 **TypeScript** - Type-safe JavaScript development
- 🔧 **Hot Reload** - Automatic server restart with nodemon
- 🛡️ **Error Handling** - Global error handling middleware
- 📦 **Environment Config** - Typed environment variables
- 🎯 **ESLint & Prettier** - Code linting and formatting
- 📁 **Organized Structure** - Clean project architecture

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Navigate to the project directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The server will start on http://localhost:3000

## Available Scripts

- npm run dev - Start development server with hot reload
- npm run build - Build the project for production
- npm start - Start the production server
- npm run lint - Run ESLint
- npm run format - Format code with Prettier

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── config.ts        # Environment configuration
│   ├── app.ts               # Express app setup
│   └── server.ts            # Server entry point
├── .env                     # Environment variables
├── .eslintrc.js            # ESLint configuration
├── .prettierrc             # Prettier configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Dependencies and scripts
```

## Environment Variables

Create a \.env\ file in the root directory:

```env
PORT=3000
NODE_ENV=development
```

## Contributing

1. Fork the repository
2. Create your feature branch (\git checkout -b feature/amazing-feature\)
3. Commit your changes (\git commit -m 'Add some amazing feature'\)
4. Push to the branch (\git push origin feature/amazing-feature\)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
