# CropPrice - Smart Crop Price Prediction System

## About

CropPrice is an AI-powered crop price prediction system designed to help farmers make informed decisions about when to sell their produce. The system uses machine learning algorithms including Random Forest and TensorFlow to analyze market trends and predict future prices.

## Features

- **Real-time Price Tracking**: Monitor current market prices for various crops
- **AI-Powered Predictions**: Get accurate price forecasts using advanced ML algorithms
- **Regional Data**: View price variations across different regions
- **Profit Calculator**: Calculate potential profits based on predicted prices
- **Market Trends**: Analyze historical data and identify patterns
- **User Authentication**: Secure login and personalized dashboards

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **UI Components**: shadcn/ui, Radix UI
- **Charts**: Recharts
- **Backend**: Supabase (PostgreSQL, Authentication)
- **State Management**: React Query, React Context

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd crop-price-prediction

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Environment Variables

Create a `.env` file with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React Context providers
├── data/          # Static data and mock data
├── hooks/         # Custom React hooks
├── integrations/  # Third-party integrations
├── pages/         # Page components
└── types/         # TypeScript type definitions
```

## Database Schema

### Profiles Table
Stores user profile information including display name, farm name, and location.

## License

This project is developed as an academic project.

## Author

Developed for College Project - 2025
