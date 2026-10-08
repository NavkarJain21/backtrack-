# Backtrack 🚀

> Reverse-engineer any hyper-specific career goal into an interactive dependency-graph roadmap with personalized action packs, curated learning resources, and adaptive AI replanning.

---

## 🌟 Key Features

1. **Hyper-Specific Career Roadmap Generation**:
   - Enter any dream job (e.g. *Autonomous Drone Flight Software Engineer* or *Staff AI Infrastructure Engineer*).
   - Server-side Anthropic tool calling generates a 4–6 phase DAG (Directed Acyclic Graph) with structured prerequisites, study hours, and categorization tags.
2. **Interactive React Flow Canvas**:
   - Built with `@xyflow/react` v12.
   - Organized into phase columns / lanes.
   - Custom nodes reflecting dynamic statuses: `locked`, `available`, `in_progress`, `completed`, and `known`.
   - Topological dependency-based unlocking: when prerequisite nodes are marked completed or known, downstream nodes automatically unlock.
3. **Personalized Action Packs**:
   - Clicking any unlocked node opens a slide-over panel.
   - **Why This Skill**: Strategic rationale connecting the skill to the target role.
   - **Action Pack**: Interactive task checklist with persistent progress tracking.
   - **Curated Resources**: Vetted learning links (docs, tutorials, repos, courses) filtered through an allowed-hosts whitelist.
   - **Deep Dive Search**: Pre-crafted search query with one-click copy and direct search buttons.
4. **"I Already Know..." Adaptive Replanning**:
   - Provide statements about prior skills and experience.
   - AI maps statements to existing nodes, marks them as known, and replans the remaining graph with safe patch validation.
5. **Zero-Database Persistence**:
   - Zustand with `localStorage` persistence preserves roadmap, progress, checklist states, and node caches across browser reloads.
6. **Security & Production Hardening**:
   - Server-only API key handling.
   - In-memory rate limiting with 429 response codes.
   - Security headers: CSP, X-Frame-Options (DENY), nosniff, Referrer-Policy.
   - Domain whitelisting for safe resource navigation.
   - Mock/offline mode toggle via `DISABLE_AI=true`.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Graph Engine**: `@xyflow/react` (v12)
- **State & Persistence**: Zustand (`persist` middleware)
- **Schema & Validation**: Zod
- **AI Integration**: `@anthropic-ai/sdk` (tool-calling structured outputs)
- **Icons & Feedback**: `lucide-react`, `react-hot-toast`

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local`:

```env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-sonnet-4-5
DISABLE_AI=false
```

*(If `DISABLE_AI=true` or no key is provided, Backtrack automatically falls back to offline mode for local development and demos.)*

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Test Suite

```bash
npm test
```

Runs the built-in Node test runner for schemas, links, progress computations, and dependency unlocking.

### 5. Production Build

```bash
npm run build
npm start
```
