# CalTracker App

A comprehensive calorie tracking application with AI-powered meal management, built with React Native (Expo), Supabase, and AWS Bedrock.

## 📱 Overview

CalTracker is a full-stack mobile application that helps users track their daily caloric intake, monitor macronutrients (protein, carbs, fat), and interact with an AI agent to manage meals. The app provides a seamless experience for logging meals, viewing daily and historical calorie data, and getting intelligent assistance through natural language conversations.

## ✨ Features

### Authentication
- Secure user authentication with Supabase
- Separate sign-in and sign-up pages
- Password confirmation for account creation
- User profile management with name storage

### Meal Tracking
- Add, edit, and delete meals
- Track calories and macronutrients (protein, carbs, fat)
- Real-time calorie calculation and display
- Automatic daily meal organization
- Clean, intuitive meal list interface

### Daily Tracking
- View today's total calories and macros
- Historical tracking (past 30 days)
- Daily calorie summaries saved to database
- Visual display of nutritional breakdown

### AI Agent Integration
- Natural language interaction with AWS Bedrock Agent
- Add meals via conversational interface
- Query meal data through chat
- Intelligent meal management assistance
- Session-based conversation continuity

### User Experience
- Modern, clean UI design
- Tab-based navigation
- Real-time data synchronization
- Automatic refresh mechanisms
- Smooth navigation transitions

## 🏗️ Architecture

### Frontend
- **Framework**: React Native with Expo
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Hooks with custom refresh hooks
- **Authentication**: Supabase Auth
- **Database Client**: Supabase JavaScript Client

### Backend
- **Database**: Supabase (PostgreSQL)
- **API Gateway**: AWS API Gateway (REST API)
- **Compute**: AWS Lambda
  - Agent Lambda: Handles user requests and invokes Bedrock Agent
  - Tools Lambda: Performs database operations (meal CRUD)
- **AI Agent**: AWS Bedrock Agent with custom action groups
- **Infrastructure**: Terraform (Infrastructure as Code)

### Data Flow
1. User interacts with React Native frontend
2. Frontend sends authenticated requests to API Gateway
3. API Gateway routes to Agent Lambda
4. Agent Lambda verifies JWT and invokes Bedrock Agent
5. Bedrock Agent processes request and calls Tools Lambda when needed
6. Tools Lambda performs database operations via Supabase
7. Results flow back through the chain to the frontend

## 🛠️ Tech Stack

### Frontend
- React Native 0.81.5
- Expo SDK 54
- TypeScript
- Expo Router
- Supabase JS Client

### Backend
- Python 3.11
- AWS Lambda
- AWS Bedrock Agent
- AWS API Gateway
- Supabase (PostgreSQL)
- PyJWT (JWT verification)
- Boto3 (AWS SDK)

### Infrastructure
- Terraform
- Docker (for Lambda package building)
- AWS Services:
  - Lambda
  - API Gateway
  - Bedrock Agent
  - IAM
  - CloudWatch

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- AWS Account with appropriate permissions
- Supabase Account
- Terraform (latest version)
- Docker Desktop
- Expo CLI (optional, can use npx)

## 🚀 Setup & Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CalTrackerApp
```

### 2. Frontend Setup

```bash
cd client
npm install
```

Create a `.env` file in the `client` directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_GATEWAY_URL=your_api_gateway_url
```

### 3. Backend Setup

#### Supabase Database Setup

1. Create a Supabase project
2. Create the following tables:

**Meals Table:**
```sql
CREATE TABLE Meals (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  meal_name TEXT NOT NULL,
  calories NUMERIC NOT NULL,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**CalTracker Table:**
```sql
CREATE TABLE CalTracker (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  calories NUMERIC NOT NULL,
  protein NUMERIC,
  carbs NUMERIC,
  fat NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

3. Set up Row Level Security (RLS) policies as needed
4. Get your JWT secret from Supabase project settings

#### AWS Setup

1. Configure AWS credentials:
```bash
aws configure
```

2. Set up Terraform variables. Create a `terraform/terraform.tfvars` file:
```hcl
supabase_jwt_secret = "your_supabase_jwt_secret"
supabase_url = "your_supabase_url"
supabase_key = "your_supabase_service_role_key"
bedrock_agent_id = "your_bedrock_agent_id"  # If agent already exists
```

### 4. Deploy Infrastructure

Build and deploy the Lambda functions and API Gateway:

```bash
./deploy.sh
```

This script will:
- Build the Tools Lambda package (with dependencies)
- Build the Agent Lambda package (with dependencies)
- Deploy all infrastructure using Terraform

### 5. Configure Bedrock Agent

1. Create a Bedrock Agent in AWS Console (or use Terraform)
2. Create an action group pointing to your Tools Lambda
3. Upload the OpenAPI schema from `terraform/agent-schemas/meal-tools-schema.yaml`
4. Prepare the agent version:
```bash
aws bedrock-agent prepare-agent --agent-id <your-agent-id>
```
5. Update the agent alias to point to the prepared version

### 6. Update Frontend Environment Variables

After deployment, update `client/.env` with the API Gateway URL from Terraform outputs:

```bash
cd terraform
terraform output
```

### 7. Run the Application

```bash
cd client
npm start
```

Use Expo Go app on your mobile device, or run on iOS simulator/Android emulator.

## 📸 Screenshots

### Authentication

#### Sign In Screen
<!-- Add screenshot: client/app/sign-in.tsx -->
![Sign In Screen](docs/screenshots/sign-in.png)

*Clean and simple sign-in interface with email and password fields.*

#### Sign Up Screen
<!-- Add screenshot: client/app/sign-up.tsx -->
![Sign Up Screen](docs/screenshots/sign-up.png)

*User registration with name, email, password, and password confirmation fields.*

### Meal Tracking

#### Meals Tab
<!-- Add screenshot: client/app/(tabs)/meals.tsx -->
![Meals Tab](docs/screenshots/meals-tab.png)

*Main meal tracking interface showing the list of meals, total calories for today, and add meal button.*

#### Add/Edit Meal Modal
<!-- Add screenshot: client/components/AddMeals.tsx -->
![Add Meal Modal](docs/screenshots/add-meal.png)

*Modal interface for adding or editing meal entries with nutritional information.*

### Daily Tracking

#### Daily Tracker Tab
<!-- Add screenshot: client/app/(tabs)/daily-tracker.tsx -->
![Daily Tracker Tab](docs/screenshots/daily-tracker.png)

*Today's calorie summary and past 30 days history with visual breakdown of macros.*

### AI Agent Interaction

#### Agent Chat Tab
<!-- Add screenshot: client/app/(tabs)/agent.tsx -->
![Agent Chat Tab](docs/screenshots/agent-chat.png)

*AI-powered chat interface for natural language meal management and queries.*

## 📁 Project Structure

```
CalTrackerApp/
├── client/                          # React Native frontend
│   ├── app/                         # Expo Router pages
│   │   ├── (tabs)/                  # Tab navigation screens
│   │   │   ├── index.tsx           # Home screen
│   │   │   ├── meals.tsx           # Meal tracking screen
│   │   │   ├── daily-tracker.tsx   # Daily tracking screen
│   │   │   └── agent.tsx           # AI agent chat screen
│   │   ├── sign-in.tsx             # Sign in page
│   │   └── sign-up.tsx             # Sign up page
│   ├── components/                  # Reusable components
│   │   ├── AddMeals.tsx            # Add/Edit meal modal
│   │   ├── AgentChat.tsx           # AI chat interface
│   │   ├── MealsList.tsx           # Meal list display
│   │   ├── TotalCalCount.tsx       # Today's totals widget
│   │   ├── TdCalories.tsx          # Today's calories display
│   │   ├── PastCalories.tsx        # Historical calories
│   │   └── SignOutButton.tsx       # Sign out button
│   ├── context/                     # React context providers
│   │   └── AuthProvider.tsx        # Authentication context
│   ├── hooks/                       # Custom React hooks
│   │   ├── dailyCountRefresh.ts    # Daily refresh hook
│   │   └── mealsRefresh.ts         # Meals refresh hook
│   └── constants/                   # Constants and config
│       └── supabase.ts             # Supabase client
│
├── lambda-functions/                # AWS Lambda functions
│   ├── agent-lambda/                # Agent entry point
│   │   ├── agent.py                # Lambda handler for Bedrock Agent
│   │   └── requirements.txt        # Python dependencies
│   └── tools/                       # Tools Lambda
│       ├── meal_tools.py           # Meal CRUD operations
│       └── requirements.txt        # Python dependencies
│
├── terraform/                       # Infrastructure as Code
│   ├── agent.tf                    # Agent Lambda + API Gateway
│   ├── meal_tools.tf               # Tools Lambda + Bedrock Agent
│   └── agent-schemas/              # OpenAPI schemas
│       └── meal-tools-schema.yaml  # Meal tools schema
│
├── deploy.sh                        # Deployment script
├── destroy.sh                       # Teardown script
└── README.md                        # This file
```

## 🔐 Security

- **JWT Verification**: Local JWT verification in Agent Lambda using PyJWT
- **User Isolation**: All database operations filtered by `user_id`
- **Secure Secrets**: Environment variables for sensitive data
- **API Authentication**: Supabase access tokens required for API calls
- **Audience Validation**: JWT audience claims validated

## 🔄 Key Features Explained

### Real-time Data Synchronization
The app uses custom refresh hooks (`useDailyRefresh`, `useMealsRefresh`) to keep data synchronized across components. When meals are added via the agent chat or manual entry, all relevant components refresh automatically.

### Session Continuity
The AI agent maintains conversation context using deterministic session IDs based on user ID and date (UTC), ensuring continuity throughout the day.

### Race Condition Prevention
The `saveDailyTotals` function includes protection against concurrent saves using React refs, preventing duplicate daily calorie records.

## 🧪 Testing

### Frontend Testing
```bash
cd client
npm run lint
```

### Backend Testing
Test Lambda functions locally using AWS SAM or by invoking them directly through the AWS Console.

## 🗑️ Cleanup

To tear down all infrastructure:

```bash
./destroy.sh
```

This will:
- Destroy all Terraform-managed resources
- Clean up Lambda build artifacts
- Remove temporary build directories

**Note**: This will delete all deployed resources. Make sure you have backups if needed.

## 📝 Environment Variables

### Frontend (.env)
- `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `EXPO_PUBLIC_API_GATEWAY_URL`: API Gateway endpoint URL

### Backend (Lambda Environment Variables)
- `JWT_SECRET`: Supabase JWT secret for token verification
- `JWT_AUDIENCE`: Expected JWT audience (default: "authenticated")
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service role key
- `BEDROCK_AGENT_ID`: AWS Bedrock Agent ID
- `AWS_REGION`: AWS region (default: us-east-2)

---

**Built with ❤️ using React Native, Supabase, and AWS Bedrock**

