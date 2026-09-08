/**
 * Master profile: every fact the tailoring step is allowed to use.
 *
 * The LLM may select, reorder, regroup and lightly rephrase bullets, but every
 * number, tool name and claim must already exist here. Nothing is invented.
 */

export type BulletBank = {
  id: string;
  /** Themes this bullet supports, used for selection. */
  tags: string[];
  text: string;
};

export type Role = {
  company: string;
  title: string;
  location?: string;
  start: string;
  end: string;
  bullets: BulletBank[];
};

export type Project = {
  name: string;
  stack: string;
  year: string;
  tags: string[];
  bullets: string[];
};

export const MASTER = {
  name: "Vikash Maddi",
  phone: "8374501729",
  email: "vikashmaddi@gmail.com",
  linkedin: "linkedin.com/in/vikashmaddi",
  github: "github.com/maddivikash",
  website: "vikashmaddi.vercel.app",
  location: "Gurugram, India",

  education: {
    school: "Indian Institute of Technology Madras",
    place: "Chennai, India",
    degree: "Bachelor of Technology in Mechanical Engineering",
    dates: "July 2018 – May 2022",
    gpa: "8.31/10"
  },

  roles: [
    {
      company: "VMock",
      title: "Full Stack Developer",
      start: "August 2022",
      end: "Present",
      bullets: [
        // Agents and LLM systems
        { id: "agent-prod", tags: ["agents", "llm", "platform", "scale"], text: "Built and operate a production LLM agent used by 5,000+ users, designed as a planning-first orchestration loop over a structured tool registry with Pydantic-validated schemas as guardrails at every tool boundary." },
        { id: "agent-k8s", tags: ["agents", "llm", "kubernetes", "infra"], text: "Run the agent containerized on Kubernetes with long-lived stateful sessions and secure egress for outbound tool calls." },
        { id: "mcp-server", tags: ["agents", "mcp", "platform", "security"], text: "Authored an MCP server and HTTP proxy that expose internal tools and data to agents safely, with schema-validated boundaries as the permission layer and no client-side changes required." },
        { id: "tool-framework", tags: ["agents", "reliability", "platform"], text: "Designed the agent tool-use framework over a structured registry, with retries, timeouts and rate-limit handling around model APIs, and guardrails enforced by schema validation rather than prompt instructions." },
        { id: "tool-registry-contract", tags: ["platform", "api", "developer-experience"], text: "Designed a structured tool registry as the single contract between the agent runtime and internal services: capabilities register once with a validated schema, every caller consumes them the same way, and anything outside the schema fails before it executes." },
        { id: "context-retry", tags: ["agents", "reliability"], text: "Improved workflow reliability with stateful context management, live document-diff injection after tool calls and a two-tier retry strategy, cutting incorrect tool executions by 40%." },
        // Evals and observability
        { id: "evals-gate", tags: ["evals", "llm", "quality"], text: "Built evaluation harnesses with LLM-as-judge graders and regression suites over representative cases, so model and prompt changes are gated before rollout." },
        { id: "observability", tags: ["observability", "llm", "reliability"], text: "Stood up LLM observability with Arize Phoenix, instrumenting span-level traces across the agent lifecycle so failures are attributable to the model, the prompt, the tool or the harness." },
        { id: "cost-tracking", tags: ["cost", "llm", "platform"], text: "Track token, cost and latency per session as first-class platform metrics, and built a context-management layer with prompt caching that cut inference cost on long-running sessions." },
        { id: "context-engineering", tags: ["llm", "developer-experience"], text: "Practice context engineering as a discipline, treating token budgets as a design constraint, and use Claude Code and Cursor daily as the default way I ship." },
        // Platform, backend, data
        { id: "latency", tags: ["backend", "performance", "sql", "data"], text: "Cut API response latency from 400ms to 30ms (13x) by reading query plans, adding targeted indexes, introducing Redis caching and refining service boundaries." },
        { id: "microservice", tags: ["backend", "architecture", "platform"], text: "Re-architected a monolithic utility module into a standalone Python Flask service with a versioned REST API, giving downstream teams a paved path instead of a shared codebase, and wrote the documentation they onboard from." },
        { id: "migration", tags: ["data", "reliability", "backend", "scale"], text: "Led a zero-downtime cross-datacenter migration of 90k+ accounts across US and UK environments with dual-write, hash-based reconciliation to prove parity and staged rollout with rollback at every stage, at 99.9% data integrity." },
        { id: "k8s-ops", tags: ["infra", "kubernetes", "aws", "cicd"], text: "Operate containerized services on Docker and Kubernetes across AWS (S3, SQS), with CI/CD pipelines from repository to production and Git-based review." },
        { id: "event-driven", tags: ["backend", "aws", "reliability"], text: "Run event-driven workers over AWS SQS with explicit retry, timeout and idempotency semantics." },
        { id: "incidents", tags: ["reliability", "ownership"], text: "Respond to production incidents on the services I own, shipping the hotfix and the durable fix behind it, and take part in code review across those services." },
        { id: "rag", tags: ["data", "search", "llm", "retrieval"], text: "Built RAG-style retrieval over Elasticsearch with embeddings, chunking, similarity tuning and relevance evaluation." },
        // Product and tooling
        { id: "internal-tooling", tags: ["tooling", "developer-experience", "ops"], text: "Built self-serve internal tooling and admin dashboards that automated user onboarding, environment and tenant provisioning, removing 30% of manual operational work and accelerating go-live cycles." },
        { id: "genai-suggestions", tags: ["product", "fullstack", "react", "llm"], text: "Delivered GenAI-powered resume suggestions through end-to-end React and backend integration, giving users real-time personalized feedback." },
        { id: "plagiarism", tags: ["product", "nlp", "backend"], text: "Built plagiarism-detection and text-normalization capabilities for the Resume product, improving evaluation accuracy and contributing to a 12% increase in user engagement." }
      ]
    },
    {
      company: "Karomi Technologies",
      title: "Deep Learning Intern",
      start: "May 2021",
      end: "August 2021",
      bullets: [
        { id: "cv-models", tags: ["ml", "vision"], text: "Trained Faster R-CNN, RetinaNet and EfficientDet models in PyTorch with semi-supervised learning, reaching mAP of 96% for tables and 95% for symbols." },
        { id: "cv-pipeline", tags: ["ml", "data", "automation"], text: "Automated document data-extraction pipelines with Selenium and Ghostscript, producing image datasets for repeatable training and evaluation." }
      ]
    }
  ] as Role[],

  projects: [
    {
      name: "Context Management Proxy and MCP Server",
      stack: "Python, MCP, Agent Infrastructure",
      year: "2026",
      tags: ["agents", "llm", "cost", "mcp", "developer-experience"],
      bullets: [
        "Noticed coding-agent output degrading on long tasks while cost climbed, and concluded the fix sat upstream of the prompt, so built a transparent HTTP proxy and MCP server that compresses agent context with no client changes.",
        "Implemented relevance-based eviction and prefix-stable prompt caching, then an eval harness measuring cost per completed task before and after compression, so the improvement was proven rather than assumed."
      ]
    },
    {
      name: "Codex Review Agent",
      stack: "TypeScript, Cloudflare Workers AI, Workflows, Durable Objects",
      year: "2026",
      tags: ["agents", "cloudflare", "typescript", "developer-experience", "policy-as-code"],
      bullets: [
        "Built an AI code review agent on Cloudflare: eight policy-as-code rules run first, a durable three-step Workflow adds a Llama 3.3 review and score, and project memory lives in Durable Object SQLite across sessions.",
        "Diagnosed duplicated tool-argument streaming across several Workers AI models by capturing WebSocket frames, then added tool-call repair so malformed calls recover instead of failing."
      ]
    },
    {
      name: "Image Caption Generator",
      stack: "Python, Keras, Computer Vision",
      year: "2021",
      tags: ["ml", "vision"],
      bullets: [
        "Built an image-captioning system combining Inception and VGG16 bottleneck features with a recurrent decoder, reaching BLEU-1 of 0.55 against a 0.69 human benchmark."
      ]
    }
  ] as Project[],

  skills: {
    "Languages": ["Python", "TypeScript", "SQL", "JavaScript", "Bash", "C++", "PHP", "Java"],
    "Agentic AI Stack": ["LangGraph", "MCP (authoring and hosting servers)", "Tool-Use Frameworks", "Agent Orchestration", "Guardrails", "OpenAI/Anthropic APIs", "Context Management", "Prompt Caching", "Claude Code", "Cursor"],
    "AI Observability & Evaluation": ["Arize Phoenix", "Span-Level Tracing", "LLM-as-Judge Graders", "Regression Suites", "Token/Cost/Latency Tracking"],
    "Backend & APIs": ["FastAPI", "Flask", "Laravel", "REST APIs", "Microservices", "asyncio", "Pydantic", "API Versioning"],
    "Frontend": ["React", "Redux", "Tailwind", "HTML5", "CSS3"],
    "Containers & Cloud": ["Kubernetes", "Docker", "AWS (S3, SQS, IAM basics)", "Cloudflare Workers", "Linux", "Deployment Automation", "Rollback Strategy"],
    "CI/CD & Tooling": ["GitHub Actions", "Git-based Review", "pytest", "Self-Serve Internal Tooling", "Policy-as-Code"],
    "Data & Retrieval": ["MySQL", "PostgreSQL", "Redis", "Elasticsearch", "Embeddings and Vector Retrieval", "Chunking and Relevance Tuning", "Event-Driven Pipelines", "PyTorch"]
  } as Record<string, string[]>,

  coursework: ["Data Structures and Algorithms", "Operating Systems", "Computer Networks", "Introduction to DBMS", "Python and OOP Concepts", "Probability & Statistics", "Machine Learning", "Computer Vision"],

  achievements: [
    "Secured a global rank of 38 in the July Long Challenge on the CodeChef platform.",
    "Secured an all-India open category rank of 1308 in JEE-ADVANCED 2018 among 1.8 million."
  ]
};

/** Every distinct number-like token in the bank, used to catch invented figures. */
export function bankNumbers(): Set<string> {
  const text = JSON.stringify(MASTER);
  return new Set((text.match(/\d[\d,.]*\s*(%|x|k\+|\+)?/g) || []).map((n) => n.replace(/\s+/g, "")));
}
