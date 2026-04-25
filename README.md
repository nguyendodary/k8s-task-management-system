# Task Management System (Jira Mini)

A production-ready task management application with React frontend, Node.js backend, PostgreSQL database, Redis caching, and full Kubernetes deployment support.

## Project Structure

```
.
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts (Auth)
│   │   ├── pages/           # Page components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
├── backend/                  # Node.js + Express backend
│   ├── config/              # Database & Redis config
│   ├── middleware/          # Auth middleware
│   ├── routes/              # API routes
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
│
├── k8s/                     # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── postgres-*.yaml
│   ├── redis-*.yaml
│   ├── backend-*.yaml
│   ├── frontend-*.yaml
│   └── ingress.yaml
│
├── monitoring/              # Prometheus + Grafana
│   ├── prometheus-install.md
│   ├── grafana-install.md
│   ├── grafana-dashboard.json
│   └── prometheus-values.yaml
│
├── backup/                   # Velero backup docs
│   └── velero-setup.md
│
└── .github/
    └── workflows/
        └── ci-cd.yaml        # GitHub Actions CI/CD
```

## Tech Stack

### Frontend
- React 18 + Vite
- React Router DOM
- Axios for API calls
- CSS for styling

### Backend
- Node.js + Express
- JWT authentication (bcryptjs + jsonwebtoken)
- PostgreSQL (pg driver)
- Redis caching
- Joi validation
- Helmet security headers

### Infrastructure
- Kubernetes (EKS/GKE/AKS or on-premises)
- Docker containers
- Nginx Ingress Controller
- Horizontal Pod Autoscaling
- Prometheus + Grafana monitoring
- Velero for backups

## Quick Start (Local Development)

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 16
- Redis 7
- Docker (optional)

### 2. Backend Setup

```bash
cd backend

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Install dependencies
npm install

# Start development server
npm run dev
```

Backend will be available at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Docker Deployment

### Build Images

```bash
# Backend
cd backend
docker build -t task-management-backend:latest .

# Frontend
cd frontend
docker build -t task-management-frontend:latest .
```

### Run with Docker Compose

```bash
# Create docker-compose.yml
docker-compose up -d
```

## Kubernetes Deployment

### 1. Prerequisites
- Kubernetes cluster (1.25+)
- kubectl configured
- Nginx Ingress Controller installed
- Helm (optional, for monitoring)

### 2. Update Configuration

Edit `k8s/secret.yaml` and `k8s/configmap.yaml` with your values:

```bash
# Generate a secure JWT secret
openssl rand -base64 32

# Update secrets
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
```

### 3. Deploy Application

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Deploy infrastructure
kubectl apply -f k8s/postgres-pvc.yaml
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/postgres-service.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml

# Deploy application
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/backend-hpa.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/ingress.yaml
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n task-management

# Check services
kubectl get svc -n task-management

# Check ingress
kubectl get ingress -n task-management

# View logs
kubectl logs -n task-management -l app=backend --tail=100
kubectl logs -n task-management -l app=frontend --tail=100
```

## CI/CD Pipeline

The project includes a complete GitHub Actions workflow in `.github/workflows/ci-cd.yaml`:

1. **Test**: Runs backend and frontend tests
2. **Build**: Builds Docker images
3. **Push**: Pushes images to Docker Hub
4. **Deploy**: Deploys to Kubernetes cluster

### Required Secrets

Configure these secrets in your GitHub repository:

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_REGION` | AWS region |
| `EKS_CLUSTER_NAME` | EKS cluster name |

## Monitoring

### Install Prometheus

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  -f monitoring/prometheus-values.yaml
```

### Install Grafana

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

helm install grafana grafana/grafana \
  --namespace monitoring \
  --set adminPassword='admin123'
```

See `monitoring/` directory for detailed setup instructions and dashboards.

## Backup with Velero

See `backup/velero-setup.md` for complete backup setup.

Quick backup command:
```bash
velero backup create task-management-manual \
  --include-namespaces task-management \
  --wait
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/profile | Get user profile |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List all tasks (cached) |
| GET | /api/tasks/:id | Get single task |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/users | List all users |
| GET | /api/users/:id | Get single user |

## Database Schema

### Users Table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | User ID |
| email | VARCHAR(255) UNIQUE | User email |
| password | VARCHAR(255) | Hashed password |
| created_at | TIMESTAMP | Creation time |

### Tasks Table
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL PK | Task ID |
| title | VARCHAR(200) | Task title |
| description | TEXT | Task description |
| status | VARCHAR(20) | todo/in-progress/done |
| assigned_to | INTEGER FK | Assigned user |
| created_by | INTEGER FK | Creator |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

## Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=5000
DB_HOST=postgres
DB_PORT=5432
DB_NAME=taskmanagement
DB_USER=postgres
DB_PASSWORD=password
REDIS_HOST=redis
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Helmet security headers
- Rate limiting (100 requests/15min)
- CORS configuration
- Input validation with Joi
- SQL injection prevention (parameterized queries)

## Scaling

The application supports horizontal scaling:

- **Backend HPA**: Scales 2-10 pods based on CPU (70%) and memory (80%)
- **Frontend**: 2 replicas by default
- **Database**: Single instance StatefulSet (consider read replicas for heavy read loads)
- **Redis**: Single instance (consider Redis Cluster for production)

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n task-management
kubectl logs <pod-name> -n task-management
```

### Database connection issues
```bash
# Check if PostgreSQL is ready
kubectl exec -it postgres-0 -n task-management -- pg_isready

# Check connection from backend
kubectl exec -it <backend-pod> -n task-management -- nc -zv postgres 5432
```

### Redis connection issues
```bash
# Test Redis connection
kubectl exec -it <backend-pod> -n task-management -- nc -zv redis 6379
```

## License

MIT
