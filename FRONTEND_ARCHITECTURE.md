# RevClear Frontend - Next.js Architecture

## 🎨 Frontend Technology Stack

### **Framework & Build Tool**

| Technology | Version | Purpose | Why Chosen |
|------------|---------|---------|------------|
| **Next.js** | 14+ (App Router) | React framework with SSR/SSG | SEO, performance, built-in routing |
| **React** | 18+ | UI library | Industry standard, component-based |
| **TypeScript** | 5+ | Type safety | Catch errors early, better IDE support |
| **Tailwind CSS** | 3+ | Utility-first CSS | Rapid styling, consistent design |

**Build Tool:** Next.js (instead of Vite)
- ✅ Built-in server-side rendering (SSR)
- ✅ API routes for backend proxy
- ✅ Automatic code splitting
- ✅ Image optimization
- ✅ Better SEO for marketing pages

---

## 🎭 UI Components & Theming

### **Theme & Accessibility**

| Library | Purpose | Features |
|---------|---------|----------|
| **next-themes** | Dark/light mode | System preference detection, theme persistence |
| **Radix UI Primitives** | Accessible components | WCAG 2.1 compliant, keyboard navigation, ARIA labels |
| **Radix Colors** | Color system | Semantic colors, dark mode support |

**Accessibility Features:**
- ✅ Supports dark/light mode toggle
- ✅ High contrast ratios (WCAG AA/AAA)
- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Screen reader support (ARIA labels)
- ✅ Focus indicators
- ✅ Semantic HTML

**Example Theme Configuration:**
```tsx
// app/providers.tsx
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  )
}
```

---

## 🔗 Front-End Integration with Backend

The React front end connects **securely** to backend services hosted on Google Cloud:

### **1. Traffic Flow (HTTPS Only)**

```
User Browser
    ↓ HTTPS (TLS 1.3)
Global Load Balancer (Cloud Armor WAF)
    ↓ DDoS protection + rate limiting
Next.js Frontend (Cloud Run)
    ↓ API calls
Cloud Run API Service
    ↓ Queries
Cloud SQL + Vertex AI + Cloud Storage
```

**Security:**
- ✅ **All traffic passes through Global Load Balancer**
- ✅ **Cloud Armor WAF** protects against attacks (SQL injection, XSS)
- ✅ **HTTPS only** - HTTP redirects to HTTPS
- ✅ **Modern TLS 1.3** encryption

---

### **2. User Authentication (Identity Platform + IAM)**

| Component | Technology | Flow |
|-----------|-----------|------|
| **Authentication** | Identity Platform (Firebase Auth) | SSO, MFA, email/password |
| **Authorization** | Cloud IAM | Role-based access control (RBAC) |
| **Tokens** | JWT (JSON Web Tokens) | Secure session management |

**Authentication Flow:**
```typescript
// lib/auth.ts
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

export async function loginUser(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    const idToken = await userCredential.user.getIdToken()
    
    // Store JWT token (secure httpOnly cookie)
    document.cookie = `auth_token=${idToken}; Secure; HttpOnly; SameSite=Strict`
    
    return { success: true, user: userCredential.user }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

**JWT Token Usage:**
- ✅ User logs in → Identity Platform issues JWT token
- ✅ Frontend stores token securely (httpOnly cookie)
- ✅ Every API request includes token in `Authorization` header
- ✅ Backend validates token with Identity Platform
- ✅ Token expires after 1 hour (auto-refresh)

**HIPAA Compliance:**
- ✅ MFA (Multi-Factor Authentication) enforced for all users
- ✅ Session timeout after 15 minutes of inactivity
- ✅ Audit logging of all login attempts

---

### **3. API Calls to Cloud Run Backend**

**Base API Configuration:**
```typescript
// lib/api.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.revclear.health'

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = await getCurrentUserToken() // Get JWT from Identity Platform
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
  
  return response.json()
}

// Example: Fetch claims data
export async function getClaims(filters: ClaimFilters) {
  return fetchWithAuth('/api/claims', {
    method: 'POST',
    body: JSON.stringify(filters),
  })
}

// Example: Submit new claim
export async function submitClaim(claimData: ClaimData) {
  return fetchWithAuth('/api/claims/submit', {
    method: 'POST',
    body: JSON.stringify(claimData),
  })
}

// Example: Get AI code suggestions
export async function getCodeSuggestions(transcriptText: string) {
  return fetchWithAuth('/api/ai/suggest-codes', {
    method: 'POST',
    body: JSON.stringify({ text: transcriptText }),
  })
}
```

**Backend Services Accessed:**
- ✅ **Cloud SQL** - Retrieve CPT codes, patient records, claim history
- ✅ **Vertex AI** - Get AI-suggested CPT/ICD codes
- ✅ **BigQuery** - Analytics queries (approval rates, revenue trends)
- ✅ **Cloud Storage** - Retrieve processed documents

---

### **4. File Uploads (Audio & PDFs) - Signed URLs**

**Security:** Frontend does NOT upload directly to Cloud Storage. Backend generates **signed URLs**.

**Flow:**
```
1. User selects file in browser
2. Frontend requests signed URL from backend
3. Backend generates time-limited signed URL (expires in 5 minutes)
4. Frontend uploads file directly to Cloud Storage using signed URL
5. Upload triggers Pub/Sub → Document AI processing
```

**Implementation:**
```typescript
// lib/upload.ts
import { uploadFileToSignedUrl } from '@/lib/storage'

export async function uploadAudioFile(file: File, claimId: string) {
  // Step 1: Request signed URL from backend
  const { signedUrl, fileUrl } = await fetchWithAuth('/api/storage/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      claimId: claimId,
      bucket: 'audio_files',
    }),
  })
  
  // Step 2: Upload file directly to Cloud Storage
  const response = await fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  })
  
  if (!response.ok) {
    throw new Error('Upload failed')
  }
  
  // Step 3: Notify backend that upload completed
  await fetchWithAuth('/api/storage/upload-complete', {
    method: 'POST',
    body: JSON.stringify({
      fileUrl: fileUrl,
      claimId: claimId,
    }),
  })
  
  return { success: true, fileUrl }
}

// Usage in component
export function AudioUploadForm({ claimId }: { claimId: string }) {
  const [uploading, setUploading] = useState(false)
  
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      await uploadAudioFile(file, claimId)
      toast.success('Audio uploaded successfully!')
    } catch (error) {
      toast.error('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <input
      type="file"
      accept="audio/*"
      onChange={handleFileUpload}
      disabled={uploading}
    />
  )
}
```

**Supported File Types:**
- **Audio:** `.mp3`, `.wav`, `.m4a`, `.ogg` (for Speech-to-Text)
- **Documents:** `.pdf`, `.png`, `.jpg`, `.tiff` (for Document AI)

**File Size Limits:**
- Audio: 100MB max
- Documents: 20MB max per file

**HIPAA Compliance:**
- ✅ Files encrypted in transit (HTTPS)
- ✅ Files encrypted at rest (Cloud KMS)
- ✅ Signed URLs expire after 5 minutes
- ✅ Audit logging of all uploads

---

### **5. Real-Time Updates (Processed Results)**

**Frontend displays AI processing results as they become available:**

**Polling (Simple Approach):**
```typescript
// hooks/useClaimStatus.ts
import { useEffect, useState } from 'react'

export function useClaimStatus(claimId: string) {
  const [status, setStatus] = useState<ClaimStatus | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    // Poll every 3 seconds
    const interval = setInterval(async () => {
      const data = await fetchWithAuth(`/api/claims/${claimId}/status`)
      setStatus(data.status)
      setLoading(false)
      
      // Stop polling when processing complete
      if (data.status === 'completed' || data.status === 'failed') {
        clearInterval(interval)
      }
    }, 3000)
    
    return () => clearInterval(interval)
  }, [claimId])
  
  return { status, loading }
}

// Usage in component
export function ClaimProcessingView({ claimId }: { claimId: string }) {
  const { status, loading } = useClaimStatus(claimId)
  
  return (
    <div>
      {status === 'transcribing' && <Spinner>Transcribing audio...</Spinner>}
      {status === 'extracting' && <Spinner>Extracting medical codes...</Spinner>}
      {status === 'reviewing' && <Alert>Ready for human review</Alert>}
      {status === 'completed' && <Success>Claim ready for submission!</Success>}
    </div>
  )
}
```

**WebSocket (Advanced Approach):**
```typescript
// lib/websocket.ts
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function connectWebSocket(token: string) {
  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token },
  })
  
  return socket
}

// Usage
export function useRealtimeUpdates(claimId: string) {
  const [updates, setUpdates] = useState<ClaimUpdate[]>([])
  
  useEffect(() => {
    const token = getCurrentUserToken()
    const ws = connectWebSocket(token)
    
    ws.emit('subscribe', { claimId })
    
    ws.on('claim_update', (update: ClaimUpdate) => {
      setUpdates((prev) => [...prev, update])
    })
    
    return () => {
      ws.emit('unsubscribe', { claimId })
      ws.disconnect()
    }
  }, [claimId])
  
  return updates
}
```

---

## 🏗️ Frontend Architecture

### **Project Structure (Next.js 14 App Router)**

```
revclear-frontend/
├── app/                          # App Router (Next.js 14+)
│   ├── (auth)/                   # Auth routes
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/              # Protected routes
│   │   ├── claims/
│   │   │   ├── page.tsx          # Claims list
│   │   │   ├── [id]/page.tsx    # Claim detail
│   │   │   └── new/page.tsx     # Create claim
│   │   ├── analytics/page.tsx   # Analytics dashboard
│   │   └── layout.tsx           # Dashboard layout
│   ├── api/                      # API routes (Next.js backend)
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── proxy/[...path]/route.ts  # Proxy to Cloud Run
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Homepage
│   └── providers.tsx             # Theme + Auth providers
├── components/                   # React components
│   ├── ui/                       # Radix UI + Tailwind
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown.tsx
│   │   └── ...
│   ├── claims/                   # Claim-specific components
│   │   ├── ClaimCard.tsx
│   │   ├── ClaimForm.tsx
│   │   └── ClaimStatusBadge.tsx
│   └── layout/                   # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Footer.tsx
├── lib/                          # Utility functions
│   ├── api.ts                    # API client
│   ├── auth.ts                   # Authentication
│   ├── upload.ts                 # File uploads
│   ├── firebase.ts               # Firebase config
│   └── utils.ts                  # Helpers
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useClaims.ts
│   └── useClaimStatus.ts
├── types/                        # TypeScript types
│   ├── claim.ts
│   ├── user.ts
│   └── api.ts
├── public/                       # Static assets
│   ├── images/
│   └── fonts/
├── .env.local                    # Environment variables
├── next.config.js                # Next.js config
├── tailwind.config.js            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies
```

---

## 🎨 UI Component Library (Radix UI)

### **Installed Components:**

```bash
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select
npm install @radix-ui/react-tabs
npm install @radix-ui/react-tooltip
npm install @radix-ui/react-alert-dialog
npm install @radix-ui/react-progress
npm install @radix-ui/react-switch
npm install @radix-ui/react-avatar
npm install @radix-ui/react-badge
```

### **Example: Accessible Dialog**

```tsx
// components/ui/dialog.tsx
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

export function Dialog({ children, ...props }: DialogPrimitive.DialogProps) {
  return <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>
}

export function DialogContent({ className, children, ...props }: DialogPrimitive.DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-lg rounded-lg bg-white p-6 shadow-lg",
          "dark:bg-gray-900",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

// Usage
export function CreateClaimDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create New Claim</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Create New Claim</DialogTitle>
        <DialogDescription>Fill in the claim details below.</DialogDescription>
        <ClaimForm />
      </DialogContent>
    </Dialog>
  )
}
```

**Accessibility Features:**
- ✅ Keyboard navigation (Tab, Escape)
- ✅ Focus trap (can't tab outside dialog)
- ✅ ARIA labels (aria-labelledby, aria-describedby)
- ✅ Screen reader announcements

---

## 🌓 Theme Implementation (next-themes)

### **Setup:**

```tsx
// app/providers.tsx
'use client'

import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}

// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### **Theme Toggle Component:**

```tsx
// components/ThemeToggle.tsx
'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

### **Tailwind Dark Mode:**

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // Use class-based dark mode
  theme: {
    extend: {
      colors: {
        // Light mode
        background: '#ffffff',
        foreground: '#0a0a0a',
        primary: '#2563eb',
        
        // Dark mode (using CSS variables)
        'dark-background': '#0a0a0a',
        'dark-foreground': '#fafafa',
        'dark-primary': '#3b82f6',
      },
    },
  },
}
```

**Usage:**
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  Content adapts to theme
</div>
```

---

## 📊 Data Flow Summary

### **AI Processing Flow:**

```
1. User uploads audio → Frontend requests signed URL
2. Frontend uploads to Cloud Storage → Triggers Pub/Sub
3. Backend: Speech-to-Text → Transcript
4. Frontend polls /api/claims/{id}/status → Shows "Transcribing..."
5. Backend: Vertex AI → Suggests CPT/ICD codes
6. Frontend displays suggestions → User reviews (HITL Gate 2)
7. User approves codes → Backend saves to Cloud SQL
8. Backend: Generate EDI 837 → Healthcare API
9. Frontend shows final claim → User submits (HITL Gate 3)
10. Backend submits to clearinghouse → Updates status
11. Frontend displays success → BigQuery analytics updated
```

**Key Points:**
- ✅ **AI and data handling occur on the backend** (secure, HIPAA-compliant)
- ✅ **Frontend displays processed results** (read-only until human review)
- ✅ **Human-in-the-Loop (HITL)** gates require user approval
- ✅ **All sensitive data stays in Google Cloud** (never exposed to frontend)

---

## 🔒 Security Best Practices

### **Frontend Security Checklist:**

- ✅ **Never store PHI in browser localStorage** (use secure httpOnly cookies)
- ✅ **Never log sensitive data to console** (remove console.log in production)
- ✅ **Validate all user inputs** (client-side + server-side)
- ✅ **Use Content Security Policy (CSP)** headers
- ✅ **Enable CORS only for trusted origins**
- ✅ **Sanitize user-generated content** (prevent XSS)
- ✅ **Use HTTPS only** (no mixed content)
- ✅ **Implement rate limiting** (prevent abuse)
- ✅ **Session timeout after 15 minutes** (HIPAA requirement)
- ✅ **Audit all user actions** (send to Cloud Logging)

**Next.js Security Headers:**
```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}
```

---

## 📦 Dependencies

### **Core:**
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "typescript": "^5.0.0"
  }
}
```

### **UI & Styling:**
```json
{
  "dependencies": {
    "next-themes": "^0.2.1",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

### **Authentication:**
```json
{
  "dependencies": {
    "firebase": "^10.0.0",
    "next-auth": "^4.24.0"
  }
}
```

### **API & Data Fetching:**
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "swr": "^2.2.0"
  }
}
```

### **Utilities:**
```json
{
  "dependencies": {
    "date-fns": "^2.30.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "sonner": "^1.2.0",
    "lucide-react": "^0.292.0"
  }
}
```

---

## 🚀 Deployment to Cloud Run

### **Dockerfile for Next.js:**

```dockerfile
FROM node:20-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Build
FROM base AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

# Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080
ENV PORT 8080

CMD ["node", "server.js"]
```

### **Deploy to Cloud Run:**

```bash
# Build Docker image
docker build -t gcr.io/PROJECT_ID/revclear-frontend:latest .

# Push to Container Registry
docker push gcr.io/PROJECT_ID/revclear-frontend:latest

# Deploy to Cloud Run
gcloud run deploy revclear-frontend \
  --image gcr.io/PROJECT_ID/revclear-frontend:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "NEXT_PUBLIC_API_URL=https://api.revclear.health"
```

---

## 🎯 Summary

### **Frontend Stack:**

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14+ | SSR, routing, API routes |
| **Language** | TypeScript | Type safety |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Components** | Radix UI | Accessible primitives |
| **Theming** | next-themes | Dark/light mode |
| **Auth** | Identity Platform | JWT tokens |
| **API** | fetch + React Query | Data fetching |
| **Upload** | Signed URLs | Secure file uploads |

### **Backend Integration:**

✅ **Global Load Balancer** - All traffic passes through Cloud Armor WAF  
✅ **Identity Platform** - JWT tokens for authentication  
✅ **Cloud Run API** - REST endpoints for Cloud SQL + Vertex AI  
✅ **Signed URLs** - Secure uploads to Cloud Storage  
✅ **Real-time Updates** - Polling or WebSocket for AI processing status  

### **Security & Compliance:**

✅ **HTTPS only** - TLS 1.3 encryption  
✅ **No PHI in frontend** - All sensitive data stays in backend  
✅ **Session timeout** - 15 minutes (HIPAA)  
✅ **MFA required** - Multi-factor authentication  
✅ **Audit logging** - All user actions logged  

---

**Status:** ✅ Next.js frontend architecture ready for implementation  
**Build Tool:** Next.js (not Vite) for better SSR and SEO  
**Theme:** next-themes + Radix UI for accessibility  
**Integration:** Secure connection to Google Cloud backend via HTTPS + JWT
