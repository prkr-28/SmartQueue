# SmartQueue — AWS Production Cloud Deployment Guide

> **Target Audience:** DevOps Engineers, Cloud Architects, and Capstone Evaluation Committees  
> **Architecture Target:** AWS Enterprise Cloud (High Availability, Auto-Scaling, Multi-AZ)  
> **Deployment Status:** Deployment Ready (Prepared for Self-Hosted Execution)

---

## 1. Cloud Architecture Overview

```
                        +--------------------------+
                        |      End Users & TV      |
                        |   (Desktop, iOS, Android)|
                        +-------------+------------+
                                      |
                           HTTPS (443) / WSS (443)
                                      |
                      +---------------v---------------+
                      |   Amazon CloudFront CDN       |
                      |  (Global Edge Caching & WAF)  |
                      +-------+---------------+-------+
                              |               |
              Static SPA Path |               | Dynamic API / WS
                 (/*)         |               | (/api/*, /socket.io/*)
                              |               |
              +---------------v---+   +-------v-----------------------+
              |   Amazon S3       |   | Application Load Balancer     |
              | (Encrypted Bucket |   | (ALB with Sticky Sessions     |
              |  with OAC)        |   |  & SSL Termination via ACM)   |
              +-------------------+   +---------------+---------------+
                                                      |
                                      +---------------v---------------+
                                      |  Amazon ECS Fargate / EC2     |
                                      |  Auto-Scaling Node.js Cluster |
                                      |  (Stateless Express Containers|
                                      |   Multi-AZ Private Subnets)   |
                                      +-------+---------------+-------+
                                              |               |
                         +--------------------+               +------------------+
                         |                                                       |
         +---------------v---------------+                       +---------------v---------------+
         | MongoDB Atlas Cloud (Shared/M10)                      | Amazon ElastiCache (Redis)    |
         | Multi-AZ Replica Set with TLS 1.3                     | (Socket.IO Cluster Adapter    |
         | (Encrypted at Rest, PrivateLink / IP)                 |  for horizontal scaling)      |
         +-------------------------------+                       +-------------------------------+
```

---

## 2. Prerequisites & AWS Account Setup

Before initiating provisioning:
1. **AWS Account** with administrative IAM privileges.
2. **Domain Name** registered in Route 53 or external registrar with nameservers pointing to Route 53.
3. **AWS CLI v2** configured locally:
   ```bash
   aws configure
   ```
4. **MongoDB Atlas Account** with an active M0 (Free Tier) or M10 cluster.

---

## 3. Step-by-Step Deployment Instructions

### Step 1: MongoDB Atlas Configuration & Network Security
1. Log in to [MongoDB Atlas Console](https://cloud.mongodb.com).
2. Create or select cluster: `smartqueue-cluster`.
3. Under **Security > Database Access**:
   - Create a database user `smartqueue_app` with role `readWriteAnyDatabase` or scoped to `smartqueue`.
   - Generate a cryptographically secure password (24+ characters).
4. Under **Security > Network Access**:
   - In production with AWS Elastic Beanstalk or ECS Fargate, obtain the **Elastic IP (EIP)** of your AWS NAT Gateway and add it to the IP Access List (`/32` CIDR).
   - For AWS VPC environments, configure **AWS PrivateLink** or **VPC Peering** for zero-public exposure.
5. Copy the SRV connection URI:
   ```
   mongodb+srv://smartqueue_app:<PASSWORD>@smartqueue-cluster.xxxx.mongodb.net/smartqueue?retryWrites=true&w=majority
   ```

---

### Step 2: Secrets Management via AWS Systems Manager (SSM) or Secrets Manager
Do NOT store environment secrets in plain text. Inject configuration using AWS SSM Parameter Store:

```bash
# Secure Strings for Sensitive Credentials
aws ssm put-parameter --name "/smartqueue/prod/MONGODB_URI" --value "mongodb+srv://..." --type SecureString
aws ssm put-parameter --name "/smartqueue/prod/JWT_ACCESS_SECRET" --value "$(openssl rand -hex 32)" --type SecureString
aws ssm put-parameter --name "/smartqueue/prod/JWT_REFRESH_SECRET" --value "$(openssl rand -hex 32)" --type SecureString

# Standard Parameters
aws ssm put-parameter --name "/smartqueue/prod/NODE_ENV" --value "production" --type String
aws ssm put-parameter --name "/smartqueue/prod/PORT" --value "5000" --type String
aws ssm put-parameter --name "/smartqueue/prod/CLIENT_URL" --value "https://smartqueue.yourdomain.com" --type String
aws ssm put-parameter --name "/smartqueue/prod/STORAGE_DRIVER" --value "s3" --type String
aws ssm put-parameter --name "/smartqueue/prod/S3_BUCKET" --value "smartqueue-patient-records-prod" --type String
aws ssm put-parameter --name "/smartqueue/prod/S3_REGION" --value "us-east-1" --type String
```

---

### Step 3: S3 Bucket Setup for Medical Records & Storage Service
Create an encrypted S3 bucket for patient file uploads:

```bash
# 1. Create S3 Bucket
aws s3api create-bucket --bucket smartqueue-patient-records-prod --region us-east-1

# 2. Block Public Access (Zero Trust)
aws s3api put-public-access-block --bucket smartqueue-patient-records-prod \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 3. Enable Server-Side Encryption (KMS / AES-256)
aws s3api put-bucket-encryption --bucket smartqueue-patient-records-prod \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# 4. Attach CORS Configuration
cat <<EOF > s3-cors.json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
      "AllowedOrigins": ["https://smartqueue.yourdomain.com"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}
EOF
aws s3api put-bucket-cors --bucket smartqueue-patient-records-prod --cors-configuration file://s3-cors.json
```

---

### Step 4: Backend Containerization & Deployment (Amazon ECS Fargate)

#### A. Build and Push Server Docker Image to Amazon ECR
```bash
# 1. Create ECR Repository
aws ecr create-repository --repository-name smartqueue-server --region us-east-1

# 2. Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# 3. Build & Tag Multi-Stage Docker Image
docker build -t smartqueue-server -f server/Dockerfile .
docker tag smartqueue-server:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smartqueue-server:latest

# 4. Push Image
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/smartqueue-server:latest
```

#### B. Configure Application Load Balancer (ALB) with Sticky Sessions
Socket.IO long-polling fallback and HTTP upgrade handshakes require cookie-based stickiness when running multiple backend replicas:
1. In EC2 Console, create an **Application Load Balancer** across 2+ Availability Zones.
2. In Target Group Settings:
   - Target Type: `IP` (for ECS Fargate) or `Instance` (for EC2).
   - Protocol: `HTTP` on port `5000`.
   - **Health Check Path:** `/api/health` (Checks Mongoose DB connectivity and memory).
   - **Attributes > Stickiness:**
     - Enable stickiness: `true`.
     - Stickiness type: `Load balancer generated cookie` (`AWSALB`).
     - Duration: `86400 seconds` (1 day).

#### C. SSL Certificate Provisioning (ACM)
1. In **AWS Certificate Manager (ACM)**, request a public certificate for `smartqueue.yourdomain.com` and `api.smartqueue.yourdomain.com`.
2. Validate ownership via Route 53 DNS records.
3. Attach certificate to the ALB HTTPS Listener (Port 443).

---

### Step 5: Frontend Hosting (Amazon S3 + CloudFront Distribution)

#### A. Build Frontend Production Bundle
```bash
# Set production environment variables
export VITE_API_URL="https://smartqueue.yourdomain.com/api"
export VITE_SOCKET_URL="https://smartqueue.yourdomain.com"

npm run build --workspace=client
```

#### B. S3 Static Web Hosting & Upload
```bash
aws s3api create-bucket --bucket smartqueue-frontend-prod --region us-east-1
aws s3 sync client/dist s3://smartqueue-frontend-prod/ --delete
```

#### C. CloudFront Distribution Configuration
1. Create a CloudFront Distribution pointing origin to `smartqueue-frontend-prod` with **Origin Access Control (OAC)**.
2. **Default Cache Behavior:**
   - Viewer Protocol Policy: `Redirect HTTP to HTTPS`.
   - Allowed HTTP Methods: `GET, HEAD, OPTIONS`.
3. **Custom Error Response (SPA Fallback):**
   - HTTP Error Code: `403` & `404`.
   - Response Page Path: `/index.html`.
   - HTTP Response Code: `200`.
4. **Second Origin for API & Socket.IO:**
   - Path Pattern `/api/*` -> Forward to ALB origin (Cache Policy: `CachingDisabled`, Origin Request Policy: `AllViewerAndCloudFrontHeaders`).
   - Path Pattern `/socket.io/*` -> Forward to ALB origin (Enable WebSockets, zero cache).

---

### Step 6: Health Checks & CloudWatch Observability

1. **API Health Endpoint:**
   - `GET /api/health` returns HTTP 200 with JSON payload `{ status: 'ok', database: 'connected', uptime: ... }`.
2. **CloudWatch Log Group:**
   - Create Log Group `/ecs/smartqueue-api`.
   - Stream Pino JSON structured logs with correlation `X-Request-Id`.
3. **CloudWatch Alarms:**
   - `HighCPUAlarm`: Trigger SNS alert when container CPU exceeds 80% for 3 evaluation periods.
   - `HealthCheckFailAlarm`: Trigger SNS alert when ALB healthy host count falls below 1.

---

## 4. Cost Estimation Table (Free Tier vs. Small Production)

| Component | AWS / Cloud Service | Free Tier / Dev Cost | Production (1,000 pts/day) |
| :--- | :--- | :--- | :--- |
| **Frontend CDN** | CloudFront + S3 | \$0.00 (1 TB transfer free) | \$2.50 / month |
| **Backend Compute** | ECS Fargate (2 tasks: 0.5 vCPU, 1 GB RAM) | \$0.00 (First 12 mo or EC2 t3.micro) | \$28.50 / month |
| **Load Balancer** | Application Load Balancer (ALB) | Free tier trial / \$18.00 | \$18.50 / month |
| **Database** | MongoDB Atlas (M0 Free Tier -> M10 Dedicated) | \$0.00 (Shared M0) | \$0.00 (M0) or \$57.00 (M10) |
| **Storage (Reports)**| Amazon S3 (AES-256 encrypted) | \$0.00 (5 GB free) | \$0.75 / month |
| **Domain & SSL** | Route 53 + ACM Certificate | \$0.50 (Hosted zone) | \$0.50 / month |
| **Total Estimated** | **Full Stack Architecture** | **~\$0.50 - \$18.00 / mo** | **~\$50.00 - \$107.00 / mo** |
