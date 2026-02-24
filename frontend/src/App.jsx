import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// THEME
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:"#05070f", bgCard:"#090d1a", bgEl:"#0c1120", bgEl2:"#101828",
  border:"#18233d", borderHi:"#1e3560",
  cyan:"#00d4ff",   cyanFaint:"#00d4ff18",
  green:"#00e87a",  greenFaint:"#00e87a14",
  amber:"#ffaa00",  amberFaint:"#ffaa0014",
  red:"#ff3e5e",    redFaint:"#ff3e5e14",
  purple:"#a855f7", purpleFaint:"#a855f714",
  text:"#dde6f5",   textSub:"#8899bb",   textDim:"#2e3f60",
};

// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const DOMAINS = [
  { id:"arch", label:"Architecture", icon:"◈", color:T.cyan,   agents:["Architect","Sr. Architect","Arch Approval"] },
  { id:"dev",  label:"Development",  icon:"⬡", color:T.purple, agents:["Developer","Sr. Developer","Dev Manager"]   },
  { id:"test", label:"Testing",      icon:"◎", color:T.green,  agents:["Tester","Sr. Tester","QA Manager"]          },
  { id:"sec",  label:"Security",     icon:"⬢", color:T.amber,  agents:["Sec Engineer","Sr. Security","Sec Manager"] },
  { id:"ops",  label:"DevOps",       icon:"⌬", color:T.red,    agents:["Cloud Eng","Cloud Lead","Cloud Manager"]    },
];
const LEVEL_LABELS = ["EXEC","REVIEW","APPROVAL"];
const LEVEL_ICONS  = ["⚙","◉","✓"];

const WORKSPACE_PROJECTS = {
  ws1: [
    { id:"p1", name:"E-Commerce Platform",  status:"running",   domainIdx:1, progress:42,  cloud:"AWS",   ago:"2h ago",  desc:"Full-stack storefront with payments" },
    { id:"p2", name:"ML Pipeline Service",  status:"completed", domainIdx:4, progress:100, cloud:"GCP",   ago:"1d ago",  desc:"Real-time ML inference pipeline"    },
    { id:"p3", name:"Auth Microservice",    status:"waiting",   domainIdx:0, progress:78,  cloud:"Azure", ago:"4h ago",  desc:"OAuth2 + JWT auth service"          },
    { id:"p4", name:"Analytics Dashboard",  status:"completed", domainIdx:3, progress:100, cloud:"AWS",   ago:"3d ago",  desc:"Business intelligence platform"     },
  ],
  ws2: [
    { id:"p5", name:"Kafka Stream Processor", status:"running",   domainIdx:1, progress:61,  cloud:"AWS",  ago:"1h ago",  desc:"Real-time event streaming service"  },
    { id:"p6", name:"Data Warehouse ETL",     status:"waiting",   domainIdx:2, progress:55,  cloud:"GCP",  ago:"3h ago",  desc:"Nightly batch ETL pipeline"         },
    { id:"p7", name:"Feature Store API",      status:"completed", domainIdx:4, progress:100, cloud:"AWS",  ago:"2d ago",  desc:"ML feature serving layer"           },
  ],
  ws3: [
    { id:"p8", name:"iOS Commerce App",   status:"running",   domainIdx:0, progress:33,  cloud:"AWS",   ago:"6h ago",  desc:"Native iOS shopping app"   },
    { id:"p9", name:"Push Notification Service", status:"completed", domainIdx:3, progress:100, cloud:"Azure", ago:"5d ago", desc:"Cross-platform push service" },
  ],
};

const WORKSPACE_ARTIFACTS = {
  ws1: [
    { id:"a1", name:"order_service.py",    type:"SOURCE_CODE",    stage:"Development",  status:"immutable", size:"14.2 KB", date:"2h ago",   checksum:"a4f9c3d1", lang:"python" },
    { id:"a2", name:"schema.sql",          type:"DB_SCHEMA",      stage:"Architecture", status:"immutable", size:"4.8 KB",  date:"4h ago",   checksum:"b2e7f1a3", lang:"sql"    },
    { id:"a3", name:"test_orders.py",      type:"TEST_SUITE",     stage:"Testing",      status:"immutable", size:"9.1 KB",  date:"1h ago",   checksum:"c5d2e8b4", lang:"python" },
    { id:"a4", name:"deployment.yaml",     type:"K8S_MANIFEST",   stage:"DevOps",       status:"immutable", size:"3.4 KB",  date:"45m ago",  checksum:"d1f4a9c7", lang:"yaml"   },
    { id:"a5", name:"security_report.json",type:"SECURITY_REPORT",stage:"Security",     status:"immutable", size:"22.7 KB", date:"30m ago",  checksum:"e8b3c2f1", lang:"json"   },
    { id:"a6", name:"architecture.md",     type:"ARCH_DOC",       stage:"Architecture", status:"immutable", size:"7.6 KB",  date:"5h ago",   checksum:"f2a1d5e9", lang:"md"     },
  ],
  ws2: [
    { id:"a7", name:"stream_processor.py", type:"SOURCE_CODE",    stage:"Development",  status:"immutable", size:"18.4 KB", date:"1h ago",   checksum:"a1b2c3d4", lang:"python" },
    { id:"a8", name:"kafka_config.yaml",   type:"K8S_MANIFEST",   stage:"DevOps",       status:"draft",     size:"2.1 KB",  date:"2h ago",   checksum:"e5f6a7b8", lang:"yaml"   },
  ],
  ws3: [
    { id:"a9", name:"ios_app_spec.md",     type:"ARCH_DOC",       stage:"Architecture", status:"immutable", size:"5.2 KB",  date:"6h ago",   checksum:"c9d0e1f2", lang:"md"     },
  ],
};

const ARTIFACT_CODE = {
  "order_service.py": `class OrderService:
    # Auto-generated · Developer Agent v1.0
    def __init__(self, db: AsyncSession):
        self.db    = db
        self.cache = RedisCache()
        self.bus   = EventBus()

    async def create_order(self, p: OrderPayload) -> Order:
        async with transaction_scope(self.db):
            order = Order(**p.dict())
            self.db.add(order)
            await self.db.flush()
            await self.cache.invalidate(f"orders:{p.user_id}")
            await self.bus.publish(
                OrderCreatedEvent(order_id=order.id)
            )
            return order`,
  "schema.sql": `-- Auto-generated · Architect Agent v1.0
CREATE TABLE orders (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    status      order_status NOT NULL DEFAULT 'pending',
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    metadata    JSONB    DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_user_status
    ON orders(user_id, status);`,
  "test_orders.py": `# Auto-generated · Tester Agent v1.0
@pytest.mark.asyncio
async def test_create_order_success(db, client):
    resp = await client.post(
        "/api/v1/orders",
        json={"user_id": str(uuid4()), "items": [...]},
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "pending"

@pytest.mark.asyncio
async def test_invalid_payload(db, client):
    resp = await client.post("/api/v1/orders", json={})
    assert resp.status_code == 422`,
  "deployment.yaml": `# Auto-generated · Cloud Engineer Agent v1.0
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels: {app: order-service}
  template:
    spec:
      containers:
        - name: order-service
          image: registry/orders:1.0.0
          resources:
            requests: {cpu: 500m, memory: 512Mi}
            limits:   {cpu: 2000m, memory: 2Gi}`,
  "security_report.json": `{
  "generated_by": "Security Engineer Agent",
  "scan_date": "2025-02-21T09:14:00Z",
  "overall_score": 91,
  "vulnerabilities": [
    {
      "id": "VULN-001",
      "type": "MISSING_HSTS",
      "severity": "MEDIUM",
      "status": "REMEDIATED",
      "file": "app/middleware.py",
      "line": 42
    }
  ],
  "owasp_top10": {"A01": "PASS", "A02": "PASS",
    "A03": "PASS", "A04": "PASS"}
}`,
  "architecture.md": `# E-Commerce Platform Architecture
**Generated by:** Architect Agent v1.0
**Pattern:** Microservices + Event-Driven

## Stack
- Backend: FastAPI + PostgreSQL + Redis
- Queue: Apache Kafka (3 partitions)
- Frontend: Next.js 14 + Tailwind
- Infra: Kubernetes (AWS EKS)

## Services
- Order Service  (this repo)
- User Service   (auth.svc)
- Payment Service (payment.svc)
- Notification Service (notif.svc)`,
  "stream_processor.py": `class StreamProcessor:
    # Auto-generated · Developer Agent v1.0
    def __init__(self, kafka: KafkaConsumer):
        self.kafka = kafka
        self.handlers: dict[str, Callable] = {}

    async def run(self) -> None:
        async for msg in self.kafka:
            handler = self.handlers.get(msg.topic)
            if handler:
                await handler(msg.value)`,
  "kafka_config.yaml": `# Draft · Cloud Engineer Agent
version: "3"
services:
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"`,
  "ios_app_spec.md": `# iOS Commerce App Architecture
**Generated by:** Architect Agent v1.0
**Platform:** iOS 17+ (Swift 5.9)

## Architecture: MVVM + Coordinator
- Views: SwiftUI
- State: Combine + @Observable
- Network: URLSession + async/await
- Storage: SwiftData`,
};

const LOG_POOL = [
  { type:"info",    msg:"[Architect Agent] Analyzing requirements document..." },
  { type:"info",    msg:"[Architect Agent] Pattern: Microservices + Event-Driven" },
  { type:"success", msg:"[Architect Agent] Arch diagram, DB schema, API spec generated ✓" },
  { type:"info",    msg:"[Sr. Architect Agent] Reviewing design..." },
  { type:"warn",    msg:"[Sr. Architect Agent] Missing circuit breaker on payment.svc" },
  { type:"success", msg:"[Arch Approval] Blueprint locked v1.0.0 ✓" },
  { type:"sys",     msg:"ARCHITECTURE → DEVELOPMENT transition authorized" },
  { type:"info",    msg:"[Developer Agent] Writing auth module..." },
  { type:"info",    msg:"[Developer Agent] Implementing JWT refresh token rotation..." },
  { type:"success", msg:"[Developer Agent] 47 files generated (12,400 LOC) ✓" },
  { type:"warn",    msg:"[Sr. Developer] Anti-pattern: N+1 query in UserService.list()" },
  { type:"info",    msg:"[Sr. Developer] Applying eager-load fix..." },
  { type:"success", msg:"[Dev Manager] Code approved for QA ✓" },
  { type:"sys",     msg:"DEVELOPMENT → TESTING transition authorized" },
  { type:"info",    msg:"[Tester Agent] Generating test suites..." },
  { type:"success", msg:"[Tester Agent] 247 tests passed · Coverage: 91% ✓" },
  { type:"success", msg:"[QA Manager] Build cleared for security scan ✓" },
  { type:"sys",     msg:"TESTING → SECURITY transition authorized" },
  { type:"info",    msg:"[Security Eng] OWASP Top 10 scan initiated..." },
  { type:"warn",    msg:"[Security Eng] Medium: Missing HSTS header on /api/v1" },
  { type:"info",    msg:"[Sr. Security] Removing false positives..." },
  { type:"success", msg:"[Security Manager] Production clearance granted ✓" },
  { type:"sys",     msg:"SECURITY → DEVOPS transition authorized" },
  { type:"info",    msg:"[Cloud Eng] Generating Dockerfile + K8s manifests..." },
  { type:"success", msg:"[Cloud Eng] Helm chart + CI/CD pipeline ready ✓" },
  { type:"success", msg:"[Cloud Manager] Production deployment approved ✓" },
];

const MONITOR_METRICS = {
  ws1: { pods:24, kafkaLag:142, redisHit:96.4, dbConn:38, p99:87,  rps:1240, errors:0.02, uptime:99.97 },
  ws2: { pods:12, kafkaLag:891, redisHit:91.2, dbConn:19, p99:124, rps:480,  errors:0.08, uptime:99.91 },
  ws3: { pods:6,  kafkaLag:34,  redisHit:98.1, dbConn:8,  p99:54,  rps:210,  errors:0.01, uptime:99.99 },
};

const DEMO_ACCOUNTS = [
  { email:"admin@forge.dev",    password:"Forge@2025", name:"Jamie Doe",    role:"OWNER",   avatar:"JD", workspace:"Platform Team",    color:T.cyan   },
  { email:"lead@forge.dev",     password:"Lead@2025",    name:"Alex Rivera",  role:"MANAGER", avatar:"AR", workspace:"Data Engineering",  color:T.purple },
  { email:"dev@forge.dev",      password:"Dev@2025",     name:"Sam Park",     role:"CONTRIBUTOR", avatar:"SP", workspace:"Mobile Squad", color:T.green  },
];

const SETTINGS_DEFAULTS = {
  agentModel:"claude-opus-4-6",
  maxTokens:"8192",
  agentTimeout:"300",
  minCoverage:"85",
  requireApproval:true,
  slackEnabled:false,
  slackChannel:"#approvals",
  emailEnabled:true,
  emailRecipient:"team@company.com",
  deployEnabled:false,
  targetCloud:"AWS",
  autoRollback:true,
  rateLimitRpm:"1000",
  auditRetention:"90",
};

const WS_COLORS = [T.cyan, T.purple, T.green, T.amber, T.red];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
let _uid = 1000;
const uid = () => String(++_uid);

function ts() {
  const d = new Date();
  return [d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,"0")).join(":");
}

const STATUS_CFG = {
  running:   { label:"RUNNING",  bg:"#00d4ff14", text:T.cyan,    dot:T.cyan    },
  waiting:   { label:"AWAITING", bg:"#ffaa0014", text:T.amber,   dot:T.amber   },
  approved:  { label:"APPROVED", bg:"#00e87a14", text:T.green,   dot:T.green   },
  completed: { label:"COMPLETE", bg:"#00e87a14", text:T.green,   dot:T.green   },
  failed:    { label:"FAILED",   bg:"#ff3e5e14", text:T.red,     dot:T.red     },
  pending:   { label:"PENDING",  bg:T.bgEl,      text:T.textSub, dot:T.textDim },
};
const LOG_COLORS = { info:T.cyan, success:T.green, warn:T.amber, error:T.red, sys:T.purple };
const LANG_COLORS = { python:T.cyan, sql:T.green, yaml:T.amber, json:T.purple, md:T.textSub };

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body,#root{height:100%;background:#05070f;color:#dde6f5;font-family:'Space Grotesk',sans-serif;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:#18233d;border-radius:2px;}
  @keyframes dot-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.65);}}
  @keyframes ring-pulse{0%,100%{opacity:.45;}50%{opacity:1;}}
  @keyframes spin-icon{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
  @keyframes fade-in{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes pulse-bar{0%,100%{opacity:.7;}50%{opacity:1;}}
  .dot-pulse{animation:dot-pulse 1.6s ease-in-out infinite;}
  .ring-pulse{animation:ring-pulse 2.2s ease-in-out infinite;}
  .spin-icon{animation:spin-icon 1.1s linear infinite;}
  .fade-in{animation:fade-in .2s ease forwards;}
  button{font-family:'Space Grotesk',sans-serif;transition:all .15s;}
  button:hover{filter:brightness(1.1);}
  input,textarea,select{background:#0c1120;border:1px solid #18233d;color:#dde6f5;border-radius:8px;padding:9px 12px;font-family:'Space Grotesk',sans-serif;font-size:13px;outline:none;width:100%;appearance:none;-webkit-appearance:none;transition:border-color .15s;}
  input::placeholder,textarea::placeholder{color:#2e3f60;}
  input:focus,textarea:focus,select:focus{border-color:#1e3560;}
  textarea{resize:none;}
  select{cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238899bb' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;padding-right:32px;}
  .row-hover:hover{background:#0c1120 !important;}
  .card-hover:hover{border-color:#1e3560 !important;}
`;

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function Badge({ status }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.pending;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,background:c.bg,color:c.text,border:`1px solid ${c.text}30`,padding:"2px 8px",borderRadius:4,fontSize:9,fontWeight:700,letterSpacing:"0.1em",whiteSpace:"nowrap",flexShrink:0}}>
      <span className={status==="running"?"dot-pulse":""} style={{width:5,height:5,borderRadius:"50%",background:c.dot,flexShrink:0,display:"inline-block"}}/>
      {c.label}
    </span>
  );
}

function Bar({ pct, color=T.cyan, h=3 }) {
  return (
    <div style={{height:h,background:T.bgEl2,borderRadius:99,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min(100,Math.max(0,pct))}%`,background:color,borderRadius:99,boxShadow:`0 0 6px ${color}70`,transition:"width .7s ease"}}/>
    </div>
  );
}

function Lbl({ children }) {
  return <div style={{fontSize:9,color:T.textSub,letterSpacing:"0.14em",fontWeight:700,marginBottom:10}}>{children}</div>;
}

function Btn({ children, variant="ghost", color=T.cyan, onClick, style={} }) {
  const variants = {
    ghost:   { background:"transparent", border:`1px solid ${T.border}`, color:T.textSub },
    primary: { background:`${color}18`,  border:`1px solid ${color}50`,  color },
    danger:  { background:T.redFaint,    border:`1px solid ${T.red}50`,  color:T.red },
    success: { background:T.greenFaint,  border:`1px solid ${T.green}50`,color:T.green },
  };
  return (
    <button type="button" onClick={onClick} style={{...variants[variant],padding:"7px 14px",borderRadius:7,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:"0.07em",...style}}>
      {children}
    </button>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={()=>onChange(!value)} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:36,height:20,borderRadius:10,background:value?T.cyan:T.border,position:"relative",transition:"background .25s",flexShrink:0}}>
        <div style={{width:14,height:14,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:value?19:3,transition:"left .25s",boxShadow:"0 1px 3px rgba(0,0,0,.4)"}}/>
      </div>
      <span style={{fontSize:11,color:T.textSub}}>{value?"Enabled":"Disabled"}</span>
    </button>
  );
}

function Modal({ title, sub, onClose, children, width=490 }) {
  return (
    <div className="fade-in" onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,.7)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.bgCard,border:`1px solid ${T.borderHi}`,borderRadius:14,padding:26,width:"100%",maxWidth:width,boxShadow:`0 0 50px ${T.cyan}18`,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:T.text}}>{title}</div>
            {sub&&<div style={{fontSize:10,color:T.textSub,marginTop:3}}>{sub}</div>}
          </div>
          <button type="button" onClick={onClose} style={{background:"none",border:"none",color:T.textSub,fontSize:20,cursor:"pointer",lineHeight:1,padding:"2px 6px"}}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{display:"block",fontSize:9,color:T.textSub,letterSpacing:"0.13em",fontWeight:700,marginBottom:6}}>{label}</label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function AgentNode({ name, levelIdx, status, color, isLast }) {
  const done=status==="completed", run=status==="running", pend=status==="pending";
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
      <div style={{fontSize:8,color:T.textSub,letterSpacing:"0.1em",fontWeight:700}}>{LEVEL_LABELS[levelIdx]}</div>
      <div style={{width:84,borderRadius:8,textAlign:"center",position:"relative",padding:"10px 6px",background:done?`${color}20`:run?`${color}12`:T.bgEl,border:`1px solid ${pend?T.border:color+"50"}`,boxShadow:run?`0 0 18px ${color}35`:"none",transition:"all .35s ease"}}>
        {run&&<div className="ring-pulse" style={{position:"absolute",inset:-1,borderRadius:9,border:`1px solid ${color}`,pointerEvents:"none"}}/>}
        <div style={{fontSize:15,marginBottom:4,lineHeight:1}}>{LEVEL_ICONS[levelIdx]}</div>
        <div style={{fontSize:9,fontWeight:600,lineHeight:1.35,color:pend?T.textSub:color}}>{name}</div>
        <div style={{marginTop:6,height:14,display:"flex",alignItems:"center",justifyContent:"center"}}>
          {done&&<span style={{color:T.green,fontSize:11}}>✓</span>}
          {run&&<span className="spin-icon" style={{color,fontSize:13,display:"inline-block"}}>⟳</span>}
          {pend&&<span style={{color:T.textDim,fontSize:10}}>–</span>}
          {status==="waiting"&&<span style={{color:T.amber,fontSize:10}}>⏸</span>}
        </div>
      </div>
      {!isLast&&<div style={{fontSize:12,color:done?color:T.textDim,lineHeight:1}}>↓</div>}
    </div>
  );
}

function PipelineVisual({ activeDomainIdx, activeStageIdx }) {
  return (
    <div style={{overflowX:"auto",paddingBottom:4}}>
      <div style={{display:"flex",alignItems:"flex-start",minWidth:840}}>
        {DOMAINS.map((domain,di)=>{
          const isActive=di===activeDomainIdx, isDone=di<activeDomainIdx;
          return (
            <div key={domain.id} style={{display:"flex",alignItems:"center",flexShrink:0}}>
              <div style={{background:isActive?`${domain.color}0c`:T.bgCard,border:`1px solid ${isActive?domain.color+"45":T.border}`,borderRadius:10,padding:"14px 10px",minWidth:128,transition:"all .4s ease"}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14}}>
                  <span style={{fontSize:15,color:isDone?T.green:domain.color}}>{isDone?"✓":domain.icon}</span>
                  <div style={{fontSize:9,fontWeight:700,letterSpacing:"0.1em",color:isDone?T.green:domain.color}}>{domain.label.toUpperCase()}</div>
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                  {domain.agents.map((name,ai)=>{
                    let s="pending";
                    if(isDone) s="completed";
                    else if(isActive){ if(ai<activeStageIdx) s="completed"; else if(ai===activeStageIdx) s="running"; }
                    return <AgentNode key={name} name={name} levelIdx={ai} status={s} color={domain.color} isLast={ai===domain.agents.length-1}/>;
                  })}
                </div>
              </div>
              {di<DOMAINS.length-1&&(
                <div style={{display:"flex",alignItems:"center",padding:"0 4px",flexShrink:0}}>
                  <div style={{width:22,height:1,background:isDone?T.cyan:T.border,boxShadow:isDone?`0 0 5px ${T.cyan}`:"none",transition:"all .4s"}}/>
                  <span style={{color:isDone?T.cyan:T.textDim,fontSize:9}}>▶</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TERMINAL
// ─────────────────────────────────────────────────────────────────────────────
function TerminalLog({ logs }) {
  const endRef=useRef(null);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[logs]);
  return (
    <div style={{fontFamily:"'JetBrains Mono','Courier New',monospace",fontSize:10,background:"#030508",border:`1px solid ${T.border}`,borderRadius:8,padding:12,height:256,overflowY:"auto",lineHeight:1.8}}>
      {logs.map(l=>(
        <div key={l.id} style={{display:"flex",gap:8,minWidth:0}}>
          <span style={{color:T.textDim,flexShrink:0,minWidth:56,fontSize:9}}>{l.time}</span>
          <span style={{color:LOG_COLORS[l.type]??T.textSub,flexShrink:0,minWidth:70,fontSize:9}}>[{l.type.toUpperCase()}]</span>
          <span style={{color:l.type==="success"?T.green:T.text,wordBreak:"break-word",fontSize:10}}>{l.msg}</span>
        </div>
      ))}
      <div ref={endRef}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD
// ─────────────────────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, trend, color=T.cyan }) {
  return (
    <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:"13px 15px",flex:1,minWidth:0}}>
      <div style={{fontSize:8,color:T.textSub,letterSpacing:"0.13em",fontWeight:700,marginBottom:8,textTransform:"uppercase"}}>{label}</div>
      <div style={{fontSize:24,fontWeight:700,color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>
        {value}{unit&&<span style={{fontSize:11,color:T.textSub,marginLeft:4,fontWeight:400}}>{unit}</span>}
      </div>
      {trend!=null&&<div style={{fontSize:9,color:trend>0?T.green:T.red,marginTop:6}}>{trend>0?"↑":"↓"} {Math.abs(trend)}% vs last hour</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: PIPELINE
// ─────────────────────────────────────────────────────────────────────────────
function PipelineView({ wsKey, projects, activeDomainIdx, activeStageIdx, logs, approvals, onApproval, onRunPipeline, onViewArtifacts }) {
  const [projIdx,setProjIdx]=useState(0);
  useEffect(()=>setProjIdx(0),[wsKey]);

  const project = projects[projIdx] ?? projects[0];
  if(!project) return <div style={{padding:40,color:T.textSub,textAlign:"center"}}>No projects in this workspace.</div>;

  const domain = DOMAINS[project.domainIdx];
  const agentLabel = domain.agents[Math.min(activeStageIdx,domain.agents.length-1)];

  return (
    <main style={{flex:1,overflowY:"auto",padding:18,display:"flex",flexDirection:"column",gap:14}}>
      {/* Project selector tabs */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {projects.map((p,i)=>(
          <button key={p.id} type="button" onClick={()=>setProjIdx(i)} style={{background:projIdx===i?T.bgEl:"transparent",border:`1px solid ${projIdx===i?T.borderHi:T.border}`,color:projIdx===i?T.text:T.textSub,padding:"5px 12px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer"}}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5,flexWrap:"wrap"}}>
            <h1 style={{fontSize:20,fontWeight:700,color:T.text,letterSpacing:"-0.02em"}}>{project.name}</h1>
            <Badge status={project.status}/>
            <span style={{fontSize:9,color:T.textSub,background:T.bgEl,border:`1px solid ${T.border}`,padding:"3px 8px",borderRadius:4}}>☁ {project.cloud}</span>
          </div>
          <div style={{fontSize:11,color:T.textSub}}>{project.desc} &nbsp;·&nbsp; <span style={{color:domain.color,fontWeight:600}}>{agentLabel}</span> running</div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0}}>
          <Btn onClick={onViewArtifacts}>VIEW ARTIFACTS</Btn>
          <Btn variant="primary" onClick={()=>onRunPipeline(project)}>▶ RUN PIPELINE</Btn>
        </div>
      </div>

      {/* Metrics */}
      <div style={{display:"flex",gap:10}}>
        <MetricCard label="Pipelines Today" value={projects.length*12} trend={12}/>
        <MetricCard label="Agents Active" value="12" unit="/ 15" color={T.green}/>
        <MetricCard label="Queue Depth" value="284" unit="tasks" color={T.amber} trend={-8}/>
        <MetricCard label="Approvals" value={approvals.length} color={T.purple}/>
        <MetricCard label="Throughput" value="1.2M" unit="req/d" color={T.cyan} trend={5}/>
      </div>

      {/* Pipeline */}
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:17}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div>
            <div style={{fontSize:11,fontWeight:700,color:T.text,letterSpacing:"0.04em",marginBottom:3}}>SDLC PIPELINE — AGENT HIERARCHY</div>
            <div style={{fontSize:9,color:T.textSub}}>Execution → Review → Approval · No stage proceeds without governance sign-off</div>
          </div>
          <div style={{fontSize:10,color:T.textSub,flexShrink:0}}>Progress: <span style={{color:T.cyan,fontWeight:700}}>{project.progress}%</span></div>
        </div>
        <div style={{marginBottom:14}}><Bar pct={project.progress}/></div>
        <PipelineVisual activeDomainIdx={activeDomainIdx} activeStageIdx={activeStageIdx}/>
      </div>

      {/* Terminal + Code */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:15}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:10,fontWeight:700,color:T.text,letterSpacing:"0.06em"}}>AGENT LOG STREAM</div>
            <span style={{fontSize:8,color:T.green,background:T.greenFaint,border:`1px solid ${T.green}40`,padding:"2px 7px",borderRadius:4,fontWeight:700}}>LIVE</span>
          </div>
          <TerminalLog logs={logs}/>
        </div>
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:15}}>
          <div style={{fontSize:10,fontWeight:700,color:T.text,letterSpacing:"0.06em",marginBottom:10}}>CURRENT ARTIFACT</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",background:"#030508",border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
            <div style={{background:T.bgEl,padding:"7px 12px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",gap:5,alignItems:"center"}}>
                {[T.red,T.amber,T.green].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c}}/>)}
                <span style={{color:T.textSub,marginLeft:8,fontSize:9}}>order_service.py</span>
              </div>
              <span style={{fontSize:8,color:T.cyan}}>SOURCE_CODE · IMMUTABLE</span>
            </div>
            <div style={{padding:12,height:218,overflowY:"auto"}}>
              <pre style={{margin:0,color:T.text,lineHeight:1.85,fontSize:10,whiteSpace:"pre-wrap"}}>{ARTIFACT_CODE["order_service.py"]}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Approvals */}
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:17}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>
          <div style={{fontSize:10,fontWeight:700,color:T.text,letterSpacing:"0.06em"}}>PENDING APPROVALS · GOVERNANCE QUEUE</div>
          <span style={{fontSize:9,color:T.amber,background:T.amberFaint,border:`1px solid ${T.amber}40`,padding:"2px 8px",borderRadius:4,fontWeight:700}}>{approvals.length} AWAITING</span>
        </div>
        {approvals.length===0
          ? <div style={{textAlign:"center",padding:"22px 0",color:T.textSub,fontSize:11}}>✓ All approvals cleared</div>
          : <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {approvals.map(a=>(
                <div key={a.id} className="fade-in" style={{display:"flex",alignItems:"center",gap:12,background:T.bgEl,border:`1px solid ${a.color}28`,borderRadius:8,padding:"11px 14px"}}>
                  <span style={{color:a.color,fontSize:17,flexShrink:0}}>⏸</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                      <span style={{fontSize:11,fontWeight:700,color:T.text}}>{a.id}</span>
                      <span style={{fontSize:9,color:a.color}}>{a.stage}</span>
                    </div>
                    <div style={{fontSize:9,color:T.textSub}}>{a.project} · Required role: <span style={{color:T.text}}>{a.role}</span></div>
                  </div>
                  <div style={{display:"flex",gap:7,flexShrink:0}}>
                    <Btn variant="success" style={{padding:"5px 12px",fontSize:9}} onClick={()=>onApproval(a.id,"approved")}>✓ APPROVE</Btn>
                    <Btn variant="danger"  style={{padding:"5px 12px",fontSize:9}} onClick={()=>onApproval(a.id,"rejected")}>✗ REJECT</Btn>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: ARTIFACTS
// ─────────────────────────────────────────────────────────────────────────────
function ArtifactsView({ wsKey }) {
  const artifacts = WORKSPACE_ARTIFACTS[wsKey] ?? [];
  const [selected,setSelected]=useState(null);
  const [filter,setFilter]=useState("ALL");

  const types=["ALL",...new Set(artifacts.map(a=>a.type))];
  const visible=filter==="ALL"?artifacts:artifacts.filter(a=>a.type===filter);

  const art=selected??artifacts[0];

  return (
    <main style={{flex:1,display:"flex",overflow:"hidden"}}>
      {/* List */}
      <div style={{width:300,flexShrink:0,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 14px 10px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:10}}>ARTIFACTS</div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {types.map(t=>(
              <button key={t} type="button" onClick={()=>setFilter(t)} style={{background:filter===t?T.bgEl2:"transparent",border:`1px solid ${filter===t?T.borderHi:T.border}`,color:filter===t?T.cyan:T.textSub,padding:"3px 8px",borderRadius:4,fontSize:8,fontWeight:700,cursor:"pointer",letterSpacing:"0.06em"}}>
                {t==="ALL"?`ALL (${artifacts.length})`:t.replace("_"," ")}
              </button>
            ))}
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:8}}>
          {visible.length===0
            ? <div style={{padding:20,color:T.textSub,fontSize:11,textAlign:"center"}}>No artifacts found</div>
            : visible.map(a=>(
                <button key={a.id} type="button" onClick={()=>setSelected(a)} style={{width:"100%",textAlign:"left",padding:"10px 10px",borderRadius:7,marginBottom:3,background:art?.id===a.id?T.bgEl:"transparent",border:`1px solid ${art?.id===a.id?T.borderHi:"transparent"}`,cursor:"pointer",display:"block"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                    <span style={{fontSize:11,fontWeight:600,color:art?.id===a.id?T.text:T.textSub,fontFamily:"'JetBrains Mono',monospace"}}>{a.name}</span>
                    <span style={{fontSize:7,color:LANG_COLORS[a.lang]??T.textSub,background:`${LANG_COLORS[a.lang]??T.textSub}18`,border:`1px solid ${LANG_COLORS[a.lang]??T.textSub}30`,padding:"1px 5px",borderRadius:3,fontWeight:700,flexShrink:0,marginLeft:4}}>{a.lang?.toUpperCase()}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:8,color:T.textDim}}>{a.stage}</span>
                    <span style={{fontSize:8,color:a.status==="immutable"?T.green:T.amber,fontWeight:700}}>{a.status.toUpperCase()}</span>
                  </div>
                </button>
              ))
          }
        </div>
      </div>

      {/* Viewer */}
      {art ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,fontWeight:600,color:T.text}}>{art.name}</span>
                <span style={{fontSize:8,color:art.status==="immutable"?T.green:T.amber,background:art.status==="immutable"?T.greenFaint:T.amberFaint,border:`1px solid ${art.status==="immutable"?T.green:T.amber}40`,padding:"2px 7px",borderRadius:4,fontWeight:700}}>{art.status.toUpperCase()}</span>
              </div>
              <div style={{fontSize:9,color:T.textSub}}>
                {art.type} · {art.stage} Stage · {art.size} · {art.date}
                &nbsp;·&nbsp; <span style={{color:T.cyan,fontFamily:"'JetBrains Mono',monospace"}}>sha256:{art.checksum}…</span>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn style={{fontSize:9,padding:"5px 12px"}}>⬇ DOWNLOAD</Btn>
              {art.status!=="immutable"&&<Btn variant="primary" style={{fontSize:9,padding:"5px 12px"}}>LOCK ARTIFACT</Btn>}
            </div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:18}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",background:"#030508",border:`1px solid ${T.border}`,borderRadius:8,padding:16,minHeight:300}}>
              <pre style={{margin:0,color:T.text,lineHeight:1.85,fontSize:11,whiteSpace:"pre-wrap"}}>{ARTIFACT_CODE[art.name]??`# Content for ${art.name}`}</pre>
            </div>
          </div>
        </div>
      ) : (
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:T.textSub}}>Select an artifact to view</div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: MONITOR
// ─────────────────────────────────────────────────────────────────────────────
function MonitorView({ wsKey, projects }) {
  const m = MONITOR_METRICS[wsKey] ?? MONITOR_METRICS.ws1;
  const [tick,setTick]=useState(0);
  useEffect(()=>{ const id=setInterval(()=>setTick(t=>t+1),3000); return()=>clearInterval(id); },[]);

  const jitter=(v,range=5)=>+(v+(Math.random()-0.5)*range).toFixed(1);

  const live={ pods:m.pods, kafkaLag:Math.round(jitter(m.kafkaLag,40)), redisHit:jitter(m.redisHit,1), dbConn:Math.round(jitter(m.dbConn,4)), p99:Math.round(jitter(m.p99,10)), rps:Math.round(jitter(m.rps,80)), errors:+(jitter(m.errors,0.02)).toFixed(3), uptime:m.uptime };

  const sparkline=(base)=>Array.from({length:12},(_,i)=>+(base+(Math.sin(i*0.8+tick*0.3)*base*0.15)).toFixed(0));

  function Spark({ values, color }) {
    const max=Math.max(...values), min=Math.min(...values);
    const pts=values.map((v,i)=>`${(i/(values.length-1))*100},${100-((v-min)/(max-min||1))*100}`).join(" ");
    return (
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{width:"100%",height:36}}>
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke"/>
      </svg>
    );
  }

  function SparkCard({ label, value, unit, color, base }) {
    return (
      <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:10,padding:"13px 14px",flex:1,minWidth:160}}>
        <div style={{fontSize:8,color:T.textSub,letterSpacing:"0.13em",fontWeight:700,marginBottom:6}}>{label}</div>
        <div style={{fontSize:22,fontWeight:700,color,fontFamily:"'JetBrains Mono',monospace",lineHeight:1,marginBottom:6}}>
          {value}<span style={{fontSize:10,color:T.textSub,fontWeight:400,marginLeft:3}}>{unit}</span>
        </div>
        <Spark values={sparkline(base)} color={color}/>
      </div>
    );
  }

  return (
    <main style={{flex:1,overflowY:"auto",padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:4}}>Infrastructure Monitor</div>
          <div style={{fontSize:10,color:T.textSub}}>Live metrics · {wsKey==="ws1"?"Platform Team":wsKey==="ws2"?"Data Engineering":"Mobile Squad"}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span className="dot-pulse" style={{width:7,height:7,borderRadius:"50%",background:T.green,boxShadow:`0 0 7px ${T.green}`,display:"inline-block"}}/>
          <span style={{fontSize:10,color:T.green,fontWeight:700}}>LIVE · Updates every 3s</span>
        </div>
      </div>

      {/* Spark cards */}
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <SparkCard label="REQUESTS/SEC"  value={live.rps}      unit="rps"  color={T.cyan}   base={live.rps}/>
        <SparkCard label="P99 LATENCY"   value={live.p99}      unit="ms"   color={T.purple} base={live.p99}/>
        <SparkCard label="ERROR RATE"    value={live.errors}   unit="%"    color={T.red}    base={live.errors}/>
        <SparkCard label="K8S PODS"      value={live.pods}     unit="pods" color={T.green}  base={live.pods}/>
      </div>

      {/* Detail grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
        {/* Service health */}
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:12}}>SERVICE HEALTH</div>
          {[
            { name:"API Gateway",       status:"healthy", p99:live.p99,  rps:live.rps },
            { name:"Order Service",     status:"healthy", p99:Math.round(live.p99*0.8), rps:Math.round(live.rps*0.4) },
            { name:"Auth Service",      status:"healthy", p99:Math.round(live.p99*0.6), rps:Math.round(live.rps*0.6) },
            { name:"Pipeline Workers",  status:live.kafkaLag>500?"degraded":"healthy", p99:Math.round(live.p99*1.4), rps:Math.round(live.rps*0.2) },
          ].map(svc=>(
            <div key={svc.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:svc.status==="healthy"?T.green:T.amber,flexShrink:0,display:"inline-block",boxShadow:`0 0 5px ${svc.status==="healthy"?T.green:T.amber}`}}/>
              <span style={{fontSize:10,color:T.text,flex:1,fontWeight:600}}>{svc.name}</span>
              <span style={{fontSize:9,color:T.textSub,fontFamily:"'JetBrains Mono',monospace"}}>{svc.p99}ms</span>
              <span style={{fontSize:9,color:T.cyan,fontFamily:"'JetBrains Mono',monospace"}}>{svc.rps} rps</span>
            </div>
          ))}
        </div>

        {/* Infrastructure */}
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:12}}>INFRASTRUCTURE METRICS</div>
          {[
            { label:"K8s Pods",      value:live.pods,       max:50,  unit:"pods", color:T.cyan  },
            { label:"Kafka Lag",     value:live.kafkaLag,   max:2000,unit:"msg",  color:live.kafkaLag>1000?T.red:T.green },
            { label:"Redis Hit Rate",value:live.redisHit,   max:100, unit:"%",    color:T.green },
            { label:"DB Connections",value:live.dbConn,     max:200, unit:"conn", color:T.amber },
          ].map(item=>(
            <div key={item.label} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:9,color:T.textSub}}>{item.label}</span>
                <span style={{fontSize:9,color:item.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{item.value} {item.unit}</span>
              </div>
              <Bar pct={(item.value/item.max)*100} color={item.color} h={3}/>
            </div>
          ))}
        </div>

        {/* Project status */}
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:12}}>PROJECT PIPELINES</div>
          {projects.map(p=>(
            <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${T.border}`}}>
              <Badge status={p.status}/>
              <span style={{fontSize:10,color:T.text,flex:1,fontWeight:600}}>{p.name}</span>
              <span style={{fontSize:9,color:T.textSub}}>{p.progress}%</span>
              <div style={{width:60}}><Bar pct={p.progress} color={DOMAINS[p.domainIdx].color} h={2}/></div>
            </div>
          ))}
        </div>

        {/* Uptime */}
        <div style={{background:T.bgCard,border:`1px solid ${T.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:10,fontWeight:700,color:T.text,marginBottom:12}}>SLA & UPTIME</div>
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:48,fontWeight:700,color:T.green,fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{live.uptime}<span style={{fontSize:20}}>%</span></div>
            <div style={{fontSize:10,color:T.textSub,marginTop:8}}>30-day uptime</div>
          </div>
          <div style={{display:"flex",gap:8,marginTop:8}}>
            {["SLO: 99.9%","MTTR: 4min","MTTF: 847h"].map(s=>(
              <div key={s} style={{flex:1,background:T.bgEl,borderRadius:6,padding:"8px 6px",textAlign:"center"}}>
                <div style={{fontSize:9,color:T.textSub}}>{s.split(":")[0]}</div>
                <div style={{fontSize:11,color:T.cyan,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{s.split(":")[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIEW: SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
function SettingsView({ settings, onChange, onSave, saved }) {
  const [tab,setTab]=useState("agents");
  const tabs=[{id:"agents",label:"Agents"},{id:"governance",label:"Governance"},{id:"notifications",label:"Notifications"},{id:"deployment",label:"Deployment"},{id:"security",label:"Security"}];

  function Row({ label, sub, children }) {
    return (
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 0",borderBottom:`1px solid ${T.border}`,gap:16}}>
        <div style={{flex:1}}>
          <div style={{fontSize:12,color:T.text,fontWeight:600,marginBottom:2}}>{label}</div>
          {sub&&<div style={{fontSize:10,color:T.textSub}}>{sub}</div>}
        </div>
        <div style={{flexShrink:0}}>{children}</div>
      </div>
    );
  }

  return (
    <main style={{flex:1,overflowY:"auto",padding:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:4}}>Settings</div>
          <div style={{fontSize:10,color:T.textSub}}>Configure agents, governance, notifications, and deployment</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {saved&&<span style={{fontSize:10,color:T.green,fontWeight:700}}>✓ Saved</span>}
          <Btn variant="primary" onClick={onSave}>SAVE CHANGES</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.border}`,marginBottom:20}}>
        {tabs.map(t=>(
          <button key={t.id} type="button" onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",borderBottom:`2px solid ${tab===t.id?T.cyan:"transparent"}`,color:tab===t.id?T.cyan:T.textSub,padding:"8px 16px",fontSize:11,fontWeight:600,cursor:"pointer",letterSpacing:"0.05em"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{maxWidth:640}}>
        {tab==="agents"&&(
          <>
            <Row label="Agent Model" sub="Claude model used for all agent tasks">
              <select value={settings.agentModel} onChange={e=>onChange("agentModel",e.target.value)} style={{width:200}}>
                {["claude-opus-4-6","claude-sonnet-4-6","claude-haiku-4-5-20251001"].map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </Row>
            <Row label="Max Tokens" sub="Maximum output tokens per agent call">
              <input type="number" value={settings.maxTokens} onChange={e=>onChange("maxTokens",e.target.value)} style={{width:120,textAlign:"right"}}/>
            </Row>
            <Row label="Agent Timeout" sub="Seconds before an agent call times out">
              <input type="number" value={settings.agentTimeout} onChange={e=>onChange("agentTimeout",e.target.value)} style={{width:120,textAlign:"right"}}/>
            </Row>
          </>
        )}
        {tab==="governance"&&(
          <>
            <Row label="Require Human Approval" sub="All approval stages require human sign-off in addition to AI agent">
              <Toggle value={settings.requireApproval} onChange={v=>onChange("requireApproval",v)}/>
            </Row>
            <Row label="Minimum Test Coverage" sub="Pipeline fails if coverage falls below this threshold">
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" value={settings.minCoverage} onChange={e=>onChange("minCoverage",e.target.value)} style={{width:80,textAlign:"right"}}/>
                <span style={{fontSize:11,color:T.textSub}}>%</span>
              </div>
            </Row>
            <Row label="Rate Limit" sub="Max API requests per minute">
              <input type="number" value={settings.rateLimitRpm} onChange={e=>onChange("rateLimitRpm",e.target.value)} style={{width:120,textAlign:"right"}}/>
            </Row>
            <Row label="Audit Log Retention" sub="Days to retain immutable audit logs">
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <input type="number" value={settings.auditRetention} onChange={e=>onChange("auditRetention",e.target.value)} style={{width:80,textAlign:"right"}}/>
                <span style={{fontSize:11,color:T.textSub}}>days</span>
              </div>
            </Row>
          </>
        )}
        {tab==="notifications"&&(
          <>
            <Row label="Slack Notifications" sub="Send approval requests and pipeline alerts to Slack">
              <Toggle value={settings.slackEnabled} onChange={v=>onChange("slackEnabled",v)}/>
            </Row>
            {settings.slackEnabled&&(
              <Row label="Slack Channel" sub="Channel for approval notifications">
                <input value={settings.slackChannel} onChange={e=>onChange("slackChannel",e.target.value)} style={{width:180}} placeholder="#approvals"/>
              </Row>
            )}
            <Row label="Email Notifications" sub="Send pipeline status updates via email">
              <Toggle value={settings.emailEnabled} onChange={v=>onChange("emailEnabled",v)}/>
            </Row>
            {settings.emailEnabled&&(
              <Row label="Email Recipient" sub="Address for pipeline notifications">
                <input value={settings.emailRecipient} onChange={e=>onChange("emailRecipient",e.target.value)} style={{width:220}} placeholder="team@company.com"/>
              </Row>
            )}
          </>
        )}
        {tab==="deployment"&&(
          <>
            <Row label="Enable Deployment" sub="Allow pipelines to trigger production deployments">
              <Toggle value={settings.deployEnabled} onChange={v=>onChange("deployEnabled",v)}/>
            </Row>
            <Row label="Target Cloud" sub="Default cloud provider for infrastructure generation">
              <select value={settings.targetCloud} onChange={e=>onChange("targetCloud",e.target.value)} style={{width:150}}>
                {["AWS","GCP","Azure","On-Prem"].map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </Row>
            <Row label="Auto Rollback" sub="Automatically rollback on failed health checks post-deploy">
              <Toggle value={settings.autoRollback} onChange={v=>onChange("autoRollback",v)}/>
            </Row>
          </>
        )}
        {tab==="security"&&(
          <>
            <Row label="OWASP Scanning" sub="Run OWASP Top 10 scan on every pipeline" ><Toggle value={true} onChange={()=>{}}/></Row>
            <Row label="SAST Analysis" sub="Static application security testing via Security Engineer Agent"><Toggle value={true} onChange={()=>{}}/></Row>
            <Row label="Dependency Audit" sub="Scan all dependencies for known CVEs"><Toggle value={true} onChange={()=>{}}/></Row>
            <Row label="Immutable Artifacts" sub="Lock artifacts after approval (cannot be modified)"><Toggle value={true} onChange={()=>{}}/></Row>
            <Row label="Audit Log Encryption" sub="Encrypt all audit log entries at rest"><Toggle value={true} onChange={()=>{}}/></Row>
          </>
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [loadingId,setLoadingId]= useState(null); // which demo is loading

  // Directly sign in with an account object — single source of truth
  function signIn(acc) {
    setError("");
    setLoading(true);
    setLoadingId(acc.email);
    setTimeout(() => {
      setLoading(false);
      setLoadingId(null);
      onLogin(acc);
    }, 600);
  }

  // Manual form submit
  function handleSubmit(e) {
    e.preventDefault();
    const trimEmail = email.trim();
    if (!trimEmail)  { setError("Email is required"); return; }
    if (!password)   { setError("Password is required"); return; }
    const acc = DEMO_ACCOUNTS.find(
      a => a.email.toLowerCase() === trimEmail.toLowerCase() && a.password === password
    );
    if (!acc) { setError("Invalid email or password. Try a demo account below."); return; }
    signIn(acc);
  }

  return (
    <div style={{
      minHeight:"100vh", background:T.bg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"'Space Grotesk',sans-serif", padding:16,
      position:"relative", overflow:"hidden",
    }}>
      {/* Background glow */}
      <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:`radial-gradient(circle,${T.cyan}06 0%,transparent 70%)`,top:"-15%",left:"-15%",pointerEvents:"none"}}/>
      <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:`radial-gradient(circle,${T.purple}06 0%,transparent 70%)`,bottom:"-10%",right:"-10%",pointerEvents:"none"}}/>

      <div style={{width:"100%",maxWidth:440,position:"relative",zIndex:1}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{
            width:54,height:54,borderRadius:14,margin:"0 auto 14px",
            background:`linear-gradient(135deg,${T.cyan},${T.purple})`,
            boxShadow:`0 0 32px ${T.cyan}50`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,
          }}>⬡</div>
          <div style={{fontSize:24,fontWeight:700,color:T.text,letterSpacing:"-0.02em"}}>FORGE</div>
          <div style={{fontSize:9,color:T.cyan,letterSpacing:"0.28em",marginTop:3}}>FORGE</div>
        </div>

        {/* Card */}
        <div style={{background:T.bgCard,border:`1px solid ${T.borderHi}`,borderRadius:16,padding:28,boxShadow:`0 0 60px ${T.cyan}10,0 24px 48px rgba(0,0,0,.5)`}}>

          <div style={{marginBottom:20}}>
            <div style={{fontSize:16,fontWeight:700,color:T.text,marginBottom:3}}>Sign in to your account</div>
            <div style={{fontSize:10,color:T.textSub}}>Access the Autonomous Forge</div>
          </div>

          {/* ── Manual form ── */}
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div>
              <label style={{display:"block",fontSize:9,color:T.textSub,letterSpacing:"0.13em",fontWeight:700,marginBottom:5}}>EMAIL</label>
              <input
                type="text"
                value={email}
                autoComplete="off"
                onChange={e => { setEmail(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                placeholder="you@company.com"
                style={{borderColor: error && !email.trim() ? T.red : undefined}}
              />
            </div>

            <div>
              <label style={{display:"block",fontSize:9,color:T.textSub,letterSpacing:"0.13em",fontWeight:700,marginBottom:5}}>PASSWORD</label>
              <div style={{position:"relative"}}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  autoComplete="off"
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit(e)}
                  placeholder="••••••••"
                  style={{paddingRight:42, borderColor: error && !password ? T.red : undefined}}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:T.textSub,cursor:"pointer",fontSize:15,padding:2,lineHeight:1}}
                >
                  {showPw ? "○" : "●"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{display:"flex",alignItems:"center",gap:8,background:T.redFaint,border:`1px solid ${T.red}40`,borderRadius:7,padding:"9px 12px"}}>
                <span style={{color:T.red,fontWeight:700,fontSize:12}}>✗</span>
                <span style={{fontSize:11,color:T.red,fontWeight:600}}>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                background: loading ? T.bgEl : `linear-gradient(135deg,${T.cyan}28,${T.purple}28)`,
                border:`1px solid ${T.cyan}55`,
                color: loading ? T.textSub : T.cyan,
                padding:"12px 0",borderRadius:9,fontSize:12,fontWeight:700,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing:"0.08em",
                boxShadow: loading ? "none" : `0 0 20px ${T.cyan}18`,
                transition:"all .2s",
                marginTop:2,
              }}
            >
              {loading && !loadingId ? "SIGNING IN…" : "SIGN IN →"}
            </button>
          </div>

          {/* ── Demo accounts ── */}
          <div style={{marginTop:24,paddingTop:20,borderTop:`1px solid ${T.border}`}}>
            <div style={{fontSize:9,color:T.textSub,letterSpacing:"0.12em",fontWeight:700,marginBottom:12,textAlign:"center"}}>
              — QUICK ACCESS · CLICK ANY ACCOUNT TO SIGN IN —
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {DEMO_ACCOUNTS.map(acc => {
                const isThisLoading = loadingId === acc.email;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => !loading && signIn(acc)}
                    disabled={loading}
                    style={{
                      display:"flex",alignItems:"center",gap:12,
                      background: isThisLoading ? `${acc.color}14` : T.bgEl,
                      border:`1px solid ${isThisLoading ? acc.color+"60" : T.border}`,
                      borderRadius:10,padding:"11px 14px",
                      cursor: loading ? "not-allowed" : "pointer",
                      textAlign:"left",
                      transition:"all .2s",
                      opacity: loading && !isThisLoading ? 0.5 : 1,
                      boxShadow: isThisLoading ? `0 0 16px ${acc.color}20` : "none",
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width:36,height:36,borderRadius:"50%",flexShrink:0,
                      background:`linear-gradient(135deg,${acc.color}40,${acc.color}18)`,
                      border:`1.5px solid ${acc.color}55`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,fontWeight:700,color:acc.color,
                    }}>
                      {isThisLoading ? <span className="spin-icon" style={{fontSize:14,display:"inline-block"}}>⟳</span> : acc.avatar}
                    </div>

                    {/* Info */}
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:2}}>{acc.name}</div>
                      <div style={{fontSize:9,color:T.textSub,fontFamily:"'JetBrains Mono',monospace"}}>{acc.email}</div>
                    </div>

                    {/* Role + workspace */}
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:9,color:acc.color,background:`${acc.color}14`,border:`1px solid ${acc.color}35`,padding:"2px 8px",borderRadius:4,fontWeight:700,marginBottom:3}}>
                        {acc.role}
                      </div>
                      <div style={{fontSize:8,color:T.textSub}}>{acc.workspace}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{textAlign:"center",marginTop:16,fontSize:9,color:T.textDim}}>
          Protected by AES-256 · TLS 1.3 &nbsp;·&nbsp; Anthropic Factory v2.0
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT PANELS
// ─────────────────────────────────────────────────────────────────────────────

const AUDIT_EVENTS = [
  { id:"ae1",  time:"09:14:01", type:"auth",     msg:"Signed in from Chrome · 192.168.1.42",          status:"success" },
  { id:"ae2",  time:"09:14:10", type:"pipeline", msg:"Pipeline #47 started — E-Commerce Platform",     status:"info"    },
  { id:"ae3",  time:"09:15:02", type:"approve",  msg:"APR-041 approved — Architecture Approval",       status:"success" },
  { id:"ae4",  time:"09:15:40", type:"approve",  msg:"APR-042 rejected — QA Manager Approval",         status:"warn"    },
  { id:"ae5",  time:"09:20:11", type:"settings", msg:"Agent model changed to claude-opus-4-6",         status:"info"    },
  { id:"ae6",  time:"09:22:00", type:"workspace","msg":"Workspace 'Mobile Squad' created",             status:"success" },
  { id:"ae7",  time:"09:30:14", type:"pipeline", msg:"Pipeline #48 started — Auth Microservice",       status:"info"    },
  { id:"ae8",  time:"09:31:05", type:"approve",  msg:"APR-043 approved — Security Clearance",          status:"success" },
  { id:"ae9",  time:"09:45:22", type:"auth",     msg:"API key 'ci-deploy' used from 10.0.0.5",         status:"info"    },
  { id:"ae10", time:"10:02:33", type:"settings", msg:"Deployment target changed to AWS",               status:"info"    },
  { id:"ae11", time:"10:15:00", type:"auth",     msg:"Failed login attempt from 203.0.113.0",          status:"error"   },
  { id:"ae12", time:"10:15:03", type:"auth",     msg:"Blocked IP 203.0.113.0 for 15 minutes",          status:"warn"    },
];

const AUDIT_COLORS = { success:T.green, info:T.cyan, warn:T.amber, error:T.red };
const AUDIT_ICONS  = { auth:"◎", pipeline:"⬡", approve:"✓", settings:"◈", workspace:"⬢" };

function PanelShell({ title, sub, icon, color=T.cyan, onClose, children, width=580 }) {
  return (
    <div className="fade-in" onClick={e=>{if(e.target===e.currentTarget)onClose();}} style={{position:"fixed",inset:0,zIndex:300,background:"rgba(0,0,0,.75)",backdropFilter:"blur(5px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:T.bgCard,border:`1px solid ${T.borderHi}`,borderRadius:14,width:"100%",maxWidth:width,maxHeight:"88vh",display:"flex",flexDirection:"column",boxShadow:`0 0 60px ${color}14,0 24px 48px rgba(0,0,0,.6)`}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"18px 22px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{width:34,height:34,borderRadius:9,background:`${color}18`,border:`1px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color,flexShrink:0}}>{icon}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>{title}</div>
            <div style={{fontSize:10,color:T.textSub,marginTop:1}}>{sub}</div>
          </div>
          <button type="button" onClick={onClose} style={{background:T.bgEl,border:`1px solid ${T.border}`,color:T.textSub,width:28,height:28,borderRadius:6,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
        </div>
        {/* Body */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 22px"}}>{children}</div>
      </div>
    </div>
  );
}

function SectionBlock({ label, children }) {
  return (
    <div style={{marginBottom:22}}>
      <div style={{fontSize:9,color:T.textSub,letterSpacing:"0.14em",fontWeight:700,marginBottom:12,paddingBottom:8,borderBottom:`1px solid ${T.border}`}}>{label}</div>
      {children}
    </div>
  );
}

function FormRow({ label, sub, children }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.border}`,gap:16}}>
      <div style={{flex:1}}>
        <div style={{fontSize:12,color:T.text,fontWeight:600,marginBottom:sub?2:0}}>{label}</div>
        {sub&&<div style={{fontSize:10,color:T.textSub}}>{sub}</div>}
      </div>
      <div style={{flexShrink:0}}>{children}</div>
    </div>
  );
}

// ── Profile Settings ──
function ProfilePanel({ user, onClose }) {
  const [name,    setName]    = useState(user.name);
  const [email,   setEmail]   = useState(user.email);
  const [notifs,  setNotifs]  = useState(true);
  const [theme,   setTheme]   = useState("dark");
  const [saved,   setSaved]   = useState(false);

  function save() { setSaved(true); setTimeout(()=>setSaved(false),2000); }

  return (
    <PanelShell title="Profile Settings" sub="Manage your personal account information" icon="◈" color={T.cyan} onClose={onClose}>
      {/* Avatar */}
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,padding:16,background:T.bgEl,borderRadius:10,border:`1px solid ${T.border}`}}>
        <div style={{width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${user.color}50,${user.color}20)`,border:`2.5px solid ${user.color}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:700,color:user.color,boxShadow:`0 0 20px ${user.color}30`,flexShrink:0}}>
          {user.avatar}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text}}>{user.name}</div>
          <div style={{fontSize:10,color:T.textSub,marginBottom:8}}>{user.workspace} · {user.role}</div>
          <div style={{display:"inline-flex",background:`${user.color}14`,border:`1px solid ${user.color}40`,borderRadius:4,padding:"2px 8px"}}>
            <span style={{fontSize:8,color:user.color,fontWeight:700,letterSpacing:"0.1em"}}>{user.role}</span>
          </div>
        </div>
      </div>

      <SectionBlock label="PERSONAL INFORMATION">
        <FormRow label="Full Name" sub="Your display name across the platform">
          <input value={name} onChange={e=>setName(e.target.value)} style={{width:200}}/>
        </FormRow>
        <FormRow label="Email Address" sub="Used for notifications and sign-in">
          <input value={email} onChange={e=>setEmail(e.target.value)} style={{width:220}}/>
        </FormRow>
        <FormRow label="Role" sub="Assigned by workspace owner">
          <span style={{fontSize:11,color:user.color,fontWeight:700,background:`${user.color}14`,border:`1px solid ${user.color}40`,padding:"4px 10px",borderRadius:5}}>{user.role}</span>
        </FormRow>
        <FormRow label="Workspace" sub="Primary workspace membership">
          <span style={{fontSize:11,color:T.text,fontWeight:600}}>{user.workspace}</span>
        </FormRow>
      </SectionBlock>

      <SectionBlock label="PREFERENCES">
        <FormRow label="Email Notifications" sub="Pipeline updates, approvals, and alerts">
          <Toggle value={notifs} onChange={setNotifs}/>
        </FormRow>
        <FormRow label="Theme" sub="Interface color theme">
          <select value={theme} onChange={e=>setTheme(e.target.value)} style={{width:130}}>
            <option value="dark">Dark (Default)</option>
            <option value="darker">Darker</option>
          </select>
        </FormRow>
      </SectionBlock>

      <div style={{display:"flex",gap:10,justifyContent:"flex-end",paddingTop:4}}>
        {saved&&<span style={{fontSize:10,color:T.green,fontWeight:700,alignSelf:"center"}}>✓ Saved</span>}
        <Btn onClick={onClose}>CANCEL</Btn>
        <Btn variant="primary" onClick={save}>SAVE CHANGES</Btn>
      </div>
    </PanelShell>
  );
}

// ── Security & 2FA ──
function SecurityPanel({ onClose }) {
  const [twofa,    setTwofa]    = useState(true);
  const [sessions, setSessions] = useState([
    { id:"s1", device:"Chrome · macOS",  ip:"192.168.1.42", loc:"San Francisco, US", time:"Active now",  current:true  },
    { id:"s2", device:"Safari · iPhone", ip:"192.168.1.55", loc:"San Francisco, US", time:"2h ago",      current:false },
    { id:"s3", device:"Firefox · Linux", ip:"10.0.0.81",    loc:"New York, US",      time:"Yesterday",   current:false },
  ]);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwCfm, setPwCfm] = useState("");
  const [pwMsg, setPwMsg] = useState(null);

  function revokeSession(id) { setSessions(s=>s.filter(x=>x.id!==id)); }
  function changePassword() {
    if (!pwOld) { setPwMsg({type:"error",text:"Enter current password"}); return; }
    if (pwNew.length<8) { setPwMsg({type:"error",text:"New password must be 8+ characters"}); return; }
    if (pwNew!==pwCfm)  { setPwMsg({type:"error",text:"Passwords do not match"}); return; }
    setPwMsg({type:"success",text:"Password updated successfully"});
    setPwOld(""); setPwNew(""); setPwCfm("");
    setTimeout(()=>setPwMsg(null),3000);
  }

  return (
    <PanelShell title="Security & 2FA" sub="Manage authentication, sessions, and security settings" icon="⬢" color={T.amber} onClose={onClose}>
      <SectionBlock label="TWO-FACTOR AUTHENTICATION">
        <FormRow label="TOTP Authenticator" sub="Time-based one-time passwords via authenticator app">
          <Toggle value={twofa} onChange={setTwofa}/>
        </FormRow>
        {twofa && (
          <div style={{marginTop:10,padding:12,background:T.greenFaint,border:`1px solid ${T.green}40`,borderRadius:8}}>
            <div style={{fontSize:10,color:T.green,fontWeight:700,marginBottom:4}}>✓ 2FA is active</div>
            <div style={{fontSize:9,color:T.textSub}}>Your account is protected with TOTP authentication. Backup codes: 8 remaining.</div>
            <button type="button" style={{marginTop:8,fontSize:9,color:T.cyan,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"'Space Grotesk',sans-serif",textDecoration:"underline"}}>View backup codes</button>
          </div>
        )}
      </SectionBlock>

      <SectionBlock label="CHANGE PASSWORD">
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div>
            <label style={{display:"block",fontSize:9,color:T.textSub,letterSpacing:"0.12em",fontWeight:700,marginBottom:5}}>CURRENT PASSWORD</label>
            <input type="password" value={pwOld} onChange={e=>setPwOld(e.target.value)} placeholder="••••••••"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>
              <label style={{display:"block",fontSize:9,color:T.textSub,letterSpacing:"0.12em",fontWeight:700,marginBottom:5}}>NEW PASSWORD</label>
              <input type="password" value={pwNew} onChange={e=>setPwNew(e.target.value)} placeholder="8+ characters"/>
            </div>
            <div>
              <label style={{display:"block",fontSize:9,color:T.textSub,letterSpacing:"0.12em",fontWeight:700,marginBottom:5}}>CONFIRM PASSWORD</label>
              <input type="password" value={pwCfm} onChange={e=>setPwCfm(e.target.value)} placeholder="Repeat new password"/>
            </div>
          </div>
          {pwMsg&&<div style={{padding:"8px 12px",borderRadius:7,background:pwMsg.type==="error"?T.redFaint:T.greenFaint,border:`1px solid ${pwMsg.type==="error"?T.red:T.green}40`,fontSize:10,color:pwMsg.type==="error"?T.red:T.green,fontWeight:600}}>{pwMsg.type==="error"?"✗":"✓"} {pwMsg.text}</div>}
          <div style={{display:"flex",justifyContent:"flex-end"}}>
            <Btn variant="primary" color={T.amber} onClick={changePassword} style={{borderColor:`${T.amber}50`,color:T.amber}}>UPDATE PASSWORD</Btn>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock label={`ACTIVE SESSIONS (${sessions.length})`}>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {sessions.map(s=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:s.current?`${T.cyan}08`:T.bgEl,border:`1px solid ${s.current?T.cyan+"40":T.border}`,borderRadius:8}}>
              <span style={{fontSize:18,flexShrink:0}}>{s.device.includes("iPhone")?"📱":"💻"}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:600,color:T.text,marginBottom:2}}>{s.device}</div>
                <div style={{fontSize:9,color:T.textSub}}>{s.ip} · {s.loc} · {s.time}</div>
              </div>
              {s.current
                ? <span style={{fontSize:8,color:T.green,background:T.greenFaint,border:`1px solid ${T.green}40`,padding:"2px 8px",borderRadius:4,fontWeight:700,flexShrink:0}}>CURRENT</span>
                : <button type="button" onClick={()=>revokeSession(s.id)} style={{fontSize:9,color:T.red,background:T.redFaint,border:`1px solid ${T.red}40`,padding:"4px 10px",borderRadius:5,cursor:"pointer",fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",flexShrink:0}}>REVOKE</button>
              }
            </div>
          ))}
          {sessions.length>1&&(
            <button type="button" onClick={()=>setSessions(s=>s.filter(x=>x.current))} style={{fontSize:10,color:T.red,background:"none",border:"none",cursor:"pointer",padding:"4px 0",fontFamily:"'Space Grotesk',sans-serif",textAlign:"left",fontWeight:600}}>
              Revoke all other sessions
            </button>
          )}
        </div>
      </SectionBlock>
    </PanelShell>
  );
}

// ── API Keys ──
function ApiKeysPanel({ onClose }) {
  const [keys, setKeys] = useState([
    { id:"k1", name:"ci-deploy",       prefix:"fct_live_Aa3x",  scopes:["deploy","read"],        created:"Jan 12 2025", last:"2h ago",   status:"active"   },
    { id:"k2", name:"monitoring-bot",  prefix:"fct_live_Bb7y",  scopes:["read"],                 created:"Dec 01 2024", last:"5m ago",   status:"active"   },
    { id:"k3", name:"staging-runner",  prefix:"fct_live_Cc9z",  scopes:["deploy","read","write"],created:"Nov 18 2024", last:"3d ago",   status:"active"   },
    { id:"k4", name:"old-pipeline-v1", prefix:"fct_live_Dd2w",  scopes:["read"],                 created:"Oct 05 2024", last:"30d ago",  status:"revoked"  },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newScopes,  setNewScopes]  = useState(["read"]);
  const [created,    setCreated]    = useState(null);

  const SCOPE_OPTIONS = ["read","write","deploy","approve","admin"];
  const SCOPE_COLORS  = { read:T.cyan, write:T.purple, deploy:T.green, approve:T.amber, admin:T.red };

  function toggleScope(s) { setNewScopes(prev=>prev.includes(s)?prev.filter(x=>x!==s):[...prev,s]); }

  function createKey() {
    if (!newName.trim()) return;
    const token = `fct_live_${Math.random().toString(36).slice(2,8).toUpperCase()}xxxxxxxxxxxx`;
    const key = { id:`k${Date.now()}`, name:newName.trim(), prefix:token.slice(0,16), scopes:newScopes, created:"Just now", last:"Never", status:"active" };
    setKeys(prev=>[key,...prev]);
    setCreated(token);
    setNewName(""); setNewScopes(["read"]);
  }

  function revokeKey(id) { setKeys(prev=>prev.map(k=>k.id===id?{...k,status:"revoked"}:k)); }

  return (
    <PanelShell title="API Keys" sub="Create and manage programmatic access tokens" icon="⌬" color={T.purple} onClose={onClose} width={620}>
      {/* Created banner */}
      {created && (
        <div style={{marginBottom:16,padding:"12px 14px",background:T.greenFaint,border:`1px solid ${T.green}40`,borderRadius:8}}>
          <div style={{fontSize:10,color:T.green,fontWeight:700,marginBottom:6}}>✓ New API key created — copy it now, it won't be shown again</div>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:T.cyan,background:T.bgEl,padding:"8px 12px",borderRadius:6,wordBreak:"break-all",border:`1px solid ${T.border}`}}>{created}</div>
          <button type="button" onClick={()=>{navigator.clipboard?.writeText(created);}} style={{marginTop:8,fontSize:9,color:T.cyan,background:"none",border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",textDecoration:"underline",padding:0}}>Copy to clipboard</button>
        </div>
      )}

      {/* Create form */}
      {showCreate ? (
        <div style={{marginBottom:18,padding:16,background:T.bgEl,border:`1px solid ${T.borderHi}`,borderRadius:10}}>
          <div style={{fontSize:11,fontWeight:700,color:T.text,marginBottom:12}}>Create New API Key</div>
          <div style={{display:"flex",gap:10,marginBottom:12}}>
            <div style={{flex:1}}>
              <label style={{display:"block",fontSize:9,color:T.textSub,letterSpacing:"0.12em",fontWeight:700,marginBottom:5}}>KEY NAME</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g. my-ci-runner" autoFocus/>
            </div>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{display:"block",fontSize:9,color:T.textSub,letterSpacing:"0.12em",fontWeight:700,marginBottom:8}}>SCOPES</label>
            <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
              {SCOPE_OPTIONS.map(s=>(
                <button key={s} type="button" onClick={()=>toggleScope(s)} style={{padding:"5px 12px",borderRadius:5,fontSize:10,fontWeight:600,cursor:"pointer",background:newScopes.includes(s)?`${SCOPE_COLORS[s]}22`:"transparent",border:`1px solid ${newScopes.includes(s)?SCOPE_COLORS[s]+"60":T.border}`,color:newScopes.includes(s)?SCOPE_COLORS[s]:T.textSub,letterSpacing:"0.06em"}}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={()=>{setShowCreate(false);setCreated(null);}}>CANCEL</Btn>
            <Btn variant="primary" color={T.purple} onClick={createKey} style={{borderColor:`${T.purple}50`,color:T.purple}}>GENERATE KEY</Btn>
          </div>
        </div>
      ) : (
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
          <Btn variant="primary" color={T.purple} onClick={()=>{setShowCreate(true);setCreated(null);}} style={{borderColor:`${T.purple}50`,color:T.purple}}>+ NEW API KEY</Btn>
        </div>
      )}

      {/* Keys list */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {keys.map(k=>(
          <div key={k.id} style={{padding:"12px 14px",background:k.status==="revoked"?T.bgCard:T.bgEl,border:`1px solid ${k.status==="revoked"?T.border:T.borderHi}`,borderRadius:9,opacity:k.status==="revoked"?0.55:1}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:8}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:700,color:T.text}}>{k.name}</span>
                  <span style={{fontSize:8,color:k.status==="active"?T.green:T.red,background:k.status==="active"?T.greenFaint:T.redFaint,border:`1px solid ${k.status==="active"?T.green:T.red}40`,padding:"1px 6px",borderRadius:3,fontWeight:700}}>{k.status.toUpperCase()}</span>
                </div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:T.textSub}}>{k.prefix}••••••••••••</div>
              </div>
              {k.status==="active" && (
                <button type="button" onClick={()=>revokeKey(k.id)} style={{fontSize:9,color:T.red,background:T.redFaint,border:`1px solid ${T.red}40`,padding:"5px 11px",borderRadius:5,cursor:"pointer",fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",flexShrink:0}}>REVOKE</button>
              )}
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {k.scopes.map(s=>(
                  <span key={s} style={{fontSize:8,color:SCOPE_COLORS[s]??T.textSub,background:`${SCOPE_COLORS[s]??T.textSub}14`,border:`1px solid ${SCOPE_COLORS[s]??T.textSub}35`,padding:"2px 6px",borderRadius:3,fontWeight:700}}>{s}</span>
                ))}
              </div>
              <span style={{fontSize:9,color:T.textDim}}>Created {k.created}</span>
              <span style={{fontSize:9,color:T.textDim}}>Last used {k.last}</span>
            </div>
          </div>
        ))}
      </div>
    </PanelShell>
  );
}

// ── Audit Log ──
function AuditLogPanel({ onClose }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const types = ["all","auth","pipeline","approve","settings","workspace"];
  const visible = AUDIT_EVENTS.filter(e=>
    (filter==="all"||e.type===filter) &&
    (search===""||e.msg.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PanelShell title="Audit Log" sub="Immutable record of all account and pipeline activity" icon="◎" color={T.green} onClose={onClose} width={640}>
      {/* Filters */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:160}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events…" style={{fontSize:11}}/>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
          {types.map(t=>(
            <button key={t} type="button" onClick={()=>setFilter(t)} style={{padding:"5px 10px",borderRadius:5,fontSize:9,fontWeight:700,cursor:"pointer",letterSpacing:"0.07em",background:filter===t?T.bgEl2:"transparent",border:`1px solid ${filter===t?T.borderHi:T.border}`,color:filter===t?T.cyan:T.textSub,textTransform:"uppercase"}}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Log entries */}
      <div style={{display:"flex",flexDirection:"column",gap:0,fontFamily:"'JetBrains Mono',monospace"}}>
        {visible.length===0
          ? <div style={{padding:"32px 0",textAlign:"center",color:T.textSub,fontSize:11,fontFamily:"'Space Grotesk',sans-serif"}}>No events match your filter</div>
          : visible.map((e,i)=>(
              <div key={e.id} style={{display:"flex",gap:12,padding:"10px 12px",background:i%2===0?T.bgEl:"transparent",borderRadius:i%2===0?6:0,alignItems:"flex-start"}}>
                <span style={{fontSize:9,color:T.textDim,flexShrink:0,minWidth:54,paddingTop:1}}>{e.time}</span>
                <span style={{fontSize:11,flexShrink:0,width:16,paddingTop:1,color:AUDIT_COLORS[e.status]??T.textSub}}>{AUDIT_ICONS[e.type]??"·"}</span>
                <span style={{fontSize:9,color:AUDIT_COLORS[e.status]??T.textSub,flexShrink:0,minWidth:70,fontWeight:700,paddingTop:1}}>[{e.type.toUpperCase()}]</span>
                <span style={{fontSize:10,color:e.status==="error"?T.red:e.status==="warn"?T.amber:T.text,flex:1,lineHeight:1.5,fontFamily:"'Space Grotesk',sans-serif"}}>{e.msg}</span>
                <span style={{fontSize:8,color:AUDIT_COLORS[e.status]??T.textDim,flexShrink:0,fontWeight:700,background:`${AUDIT_COLORS[e.status]??T.textDim}14`,border:`1px solid ${AUDIT_COLORS[e.status]??T.textDim}30`,padding:"2px 6px",borderRadius:3}}>{e.status.toUpperCase()}</span>
              </div>
            ))
        }
      </div>

      <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:12,borderTop:`1px solid ${T.border}`}}>
        <span style={{fontSize:9,color:T.textSub}}>{visible.length} of {AUDIT_EVENTS.length} events · Retained 90 days · Immutable</span>
        <Btn style={{fontSize:9,padding:"5px 12px"}}>⬇ EXPORT CSV</Btn>
      </div>
    </PanelShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT MENU DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function AccountMenu({ user, onLogout, onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const permissions = {
    OWNER:       ["Approve","Deploy","Review","Edit","Admin","Billing"],
    MANAGER:     ["Approve","Review","Edit"],
    CONTRIBUTOR: ["Review","Edit"],
  };
  const perms = permissions[user.role] ?? ["Review"];

  const permColors = {
    Approve:"#00e87a", Deploy:"#00d4ff", Review:"#a855f7",
    Edit:"#8899bb", Admin:"#ffaa00", Billing:"#ff3e5e",
  };

  return (
    <div ref={ref} style={{position:"relative"}}>
      {/* Avatar trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display:"flex", alignItems:"center", gap:8,
          background: open ? T.bgEl : "transparent",
          border:`1px solid ${open ? user.color+"50" : "transparent"}`,
          borderRadius:8, padding:"4px 8px 4px 4px",
          cursor:"pointer", transition:"all .15s",
        }}
      >
        <div style={{
          width:30, height:30, borderRadius:"50%", flexShrink:0,
          background:`linear-gradient(135deg,${user.color}50,${user.color}20)`,
          border:`1.5px solid ${user.color}60`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:11, fontWeight:700, color:user.color,
          boxShadow: open ? `0 0 12px ${user.color}40` : "none",
          transition:"all .15s",
        }}>
          {user.avatar}
        </div>
        <div style={{textAlign:"left"}}>
          <div style={{fontSize:11, fontWeight:700, color:T.text, lineHeight:1.2}}>{user.name}</div>
          <div style={{fontSize:8, color:user.color, letterSpacing:"0.1em", fontWeight:700}}>{user.role}</div>
        </div>
        <span style={{fontSize:9, color:T.textSub, marginLeft:2, transition:"transform .15s", display:"inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)"}}>▾</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="fade-in" style={{
          position:"absolute", top:"calc(100% + 8px)", right:0,
          width:280, zIndex:300,
          background:T.bgCard, border:`1px solid ${T.borderHi}`,
          borderRadius:12, overflow:"hidden",
          boxShadow:`0 16px 48px rgba(0,0,0,.7), 0 0 30px ${user.color}18`,
        }}>
          {/* Profile header */}
          <div style={{padding:"18px 18px 14px", borderBottom:`1px solid ${T.border}`, background:`linear-gradient(135deg,${user.color}08,transparent)`}}>
            <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:12}}>
              <div style={{
                width:48, height:48, borderRadius:"50%", flexShrink:0,
                background:`linear-gradient(135deg,${user.color}50,${user.color}20)`,
                border:`2px solid ${user.color}60`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:17, fontWeight:700, color:user.color,
                boxShadow:`0 0 20px ${user.color}30`,
              }}>
                {user.avatar}
              </div>
              <div>
                <div style={{fontSize:14, fontWeight:700, color:T.text, marginBottom:2}}>{user.name}</div>
                <div style={{fontSize:10, color:T.textSub}}>{user.email}</div>
                <div style={{
                  display:"inline-flex", alignItems:"center", gap:5, marginTop:5,
                  background:`${user.color}18`, border:`1px solid ${user.color}40`,
                  borderRadius:4, padding:"2px 8px",
                }}>
                  <span style={{width:5, height:5, borderRadius:"50%", background:user.color, display:"inline-block"}}/>
                  <span style={{fontSize:8, color:user.color, fontWeight:700, letterSpacing:"0.1em"}}>{user.role}</span>
                </div>
              </div>
            </div>

            {/* Workspace */}
            <div style={{background:T.bgEl, borderRadius:7, padding:"8px 10px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <div style={{fontSize:8, color:T.textSub, letterSpacing:"0.1em", fontWeight:700, marginBottom:2}}>WORKSPACE</div>
                <div style={{fontSize:11, color:T.text, fontWeight:600}}>{user.workspace}</div>
              </div>
              <div style={{width:8, height:8, borderRadius:"50%", background:user.color, boxShadow:`0 0 6px ${user.color}`}}/>
            </div>
          </div>

          {/* Permissions */}
          <div style={{padding:"12px 18px", borderBottom:`1px solid ${T.border}`}}>
            <div style={{fontSize:8, color:T.textSub, letterSpacing:"0.12em", fontWeight:700, marginBottom:8}}>PERMISSIONS</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
              {perms.map(p => (
                <span key={p} style={{
                  fontSize:8, fontWeight:700, letterSpacing:"0.08em",
                  color:permColors[p]??T.textSub,
                  background:`${permColors[p]??T.textSub}14`,
                  border:`1px solid ${permColors[p]??T.textSub}35`,
                  padding:"3px 8px", borderRadius:4,
                }}>{p.toUpperCase()}</span>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div style={{padding:"12px 18px", borderBottom:`1px solid ${T.border}`, display:"flex", gap:0}}>
            {[
              { label:"Session",  value:"Active",  color:T.green  },
              { label:"2FA",      value:"Enabled", color:T.cyan   },
              { label:"API Keys", value:"3",       color:T.purple },
            ].map((s, i) => (
              <div key={s.label} style={{flex:1, textAlign:"center", borderRight: i < 2 ? `1px solid ${T.border}` : "none", padding:"0 8px"}}>
                <div style={{fontSize:11, fontWeight:700, color:s.color}}>{s.value}</div>
                <div style={{fontSize:8, color:T.textSub, marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Menu items */}
          <div style={{padding:"8px 0"}}>
            {[
              { icon:"◈", label:"Profile Settings",  panel:"profile"   },
              { icon:"⬢", label:"Security & 2FA",    panel:"security2fa"},
              { icon:"⌬", label:"API Keys",          panel:"apikeys"   },
              { icon:"◎", label:"Audit Log",         panel:"auditlog"  },
            ].map(item => ({ ...item, action:()=>{ setOpen(false); onOpen(item.panel); } })).map(item => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                style={{
                  width:"100%", display:"flex", alignItems:"center", gap:10,
                  background:"transparent", border:"none",
                  padding:"9px 18px", cursor:"pointer", textAlign:"left",
                  transition:"background .12s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = T.bgEl}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <span style={{fontSize:12, color:T.textSub, width:16}}>{item.icon}</span>
                <span style={{fontSize:11, color:T.textSub, fontWeight:500}}>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Logout */}
          <div style={{padding:"8px 10px 10px", borderTop:`1px solid ${T.border}`}}>
            <button
              type="button"
              onClick={() => { setOpen(false); onLogout(); }}
              style={{
                width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                background:T.redFaint, border:`1px solid ${T.red}40`,
                color:T.red, padding:"10px 0", borderRadius:8,
                fontSize:11, fontWeight:700, cursor:"pointer", letterSpacing:"0.07em",
                transition:"all .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background=`${T.red}25`; e.currentTarget.style.borderColor=`${T.red}70`; }}
              onMouseLeave={e => { e.currentTarget.style.background=T.redFaint; e.currentTarget.style.borderColor=`${T.red}40`; }}
            >
              <span style={{fontSize:14}}>⏏</span>
              SIGN OUT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({ user, onLogout }) {
  // ── Account panels ────────────────────────────────────────────────────────
  const [accountPanel, setAccountPanel] = useState(null); // "profile"|"security2fa"|"apikeys"|"auditlog"
  const [workspaces,setWorkspaces]=useState([
    { id:"ws1", name:"Platform Team",    members:12, color:T.cyan   },
    { id:"ws2", name:"Data Engineering", members:7,  color:T.purple },
    { id:"ws3", name:"Mobile Squad",     members:5,  color:T.green  },
  ]);
  const [wsId,setWsId]=useState("ws1");

  // ── Nav ───────────────────────────────────────────────────────────────────
  const [view,setView]=useState("pipeline");

  // ── Pipeline simulation ───────────────────────────────────────────────────
  const [activeDomainIdx,setActiveDomainIdx]=useState(1);
  const [activeStageIdx, setActiveStageIdx] =useState(0);
  const [logs,setLogs]=useState(()=>LOG_POOL.slice(0,10).map((l,i)=>({...l,id:`init-${i}`,time:`09:1${i%10}:${String(i*6%60).padStart(2,"0")}`})));
  const [running,setRunning]=useState(true);

  const logIdxRef  = useRef(10);
  const tickRef    = useRef(0);
  const runningRef = useRef(true);
  useEffect(()=>{ runningRef.current=running; },[running]);

  useEffect(()=>{
    const id=setInterval(()=>{
      if(!runningRef.current) return;
      const entry=LOG_POOL[logIdxRef.current%LOG_POOL.length];
      setLogs(prev=>[...prev.slice(-100),{...entry,id:`${Date.now()}-${logIdxRef.current}`,time:ts()}]);
      logIdxRef.current+=1; tickRef.current+=1;
      if(tickRef.current%4===0)  setActiveStageIdx(s=>s<2?s+1:0);
      if(tickRef.current%12===0) setActiveDomainIdx(d=>d<DOMAINS.length-1?d+1:0);
    },2400);
    return()=>clearInterval(id);
  },[]);

  // ── Approvals ─────────────────────────────────────────────────────────────
  const [approvals,setApprovals]=useState([
    { id:"APR-041", stage:"Architecture Approval", project:"Auth Microservice",    role:"Engineering Head", color:T.cyan  },
    { id:"APR-042", stage:"QA Manager Approval",   project:"E-Commerce Platform",  role:"QA Manager",       color:T.green },
    { id:"APR-043", stage:"Security Clearance",    project:"ML Pipeline Service",  role:"CISO",             color:T.amber },
  ]);
  const handleApproval=useCallback((id,decision)=>{
    setApprovals(prev=>prev.filter(a=>a.id!==id));
    setLogs(prev=>[...prev.slice(-100),{id:`apr-${Date.now()}`,time:ts(),type:decision==="approved"?"success":"warn",msg:`[Governance] ${id} ${decision} by OWNER`}]);
  },[]);

  // ── Run pipeline ──────────────────────────────────────────────────────────
  const [runModal,setRunModal]=useState(null);
  const handleRunPipeline=(project)=>{
    setRunModal(project);
  };
  const confirmRunPipeline=()=>{
    const proj=runModal;
    setRunModal(null);
    setActiveDomainIdx(0); setActiveStageIdx(0);
    setLogs(prev=>[...prev.slice(-100),
      {id:`run-${Date.now()}`,time:ts(),type:"sys",msg:`Pipeline started for: ${proj.name}`},
      {id:`run2-${Date.now()}`,time:ts(),type:"info",msg:`[Architect Agent] Analyzing requirements for ${proj.name}...`},
    ]);
    setRunning(true);
    const newApproval={ id:`APR-${Math.floor(Math.random()*900)+100}`, stage:"Architecture Approval", project:proj.name, role:"Engineering Head", color:T.cyan };
    setTimeout(()=>setApprovals(prev=>[...prev,newApproval]),3000);
  };

  // ── Settings ──────────────────────────────────────────────────────────────
  const [settings,setSettings]=useState(SETTINGS_DEFAULTS);
  const [settingsSaved,setSettingsSaved]=useState(false);
  const handleSettingChange=(key,val)=>setSettings(s=>({...s,[key]:val}));
  const handleSaveSettings=()=>{ setSettingsSaved(true); setTimeout(()=>setSettingsSaved(false),2000); };

  // ── Workspace modals ──────────────────────────────────────────────────────
  const [showAddWs,  setShowAddWs  ]=useState(false);
  const [showDelWs,  setShowDelWs  ]=useState(false);
  const [newWsName,  setNewWsName  ]=useState("");
  const [newWsColor, setNewWsColor ]=useState(T.amber);

  const handleAddWorkspace=()=>{
    if(!newWsName.trim()) return;
    const id=`ws${uid()}`;
    setWorkspaces(prev=>[...prev,{ id, name:newWsName.trim(), members:1, color:newWsColor }]);
    WORKSPACE_PROJECTS[id]=[]; WORKSPACE_ARTIFACTS[id]=[]; MONITOR_METRICS[id]=MONITOR_METRICS.ws3;
    setWsId(id); setNewWsName(""); setShowAddWs(false);
  };
  const handleDeleteWorkspace=()=>{
    if(workspaces.length<=1) return;
    setWorkspaces(prev=>prev.filter(w=>w.id!==wsId));
    setWsId(workspaces.find(w=>w.id!==wsId)?.id??"ws1");
    setShowDelWs(false);
  };

  // ── New project modal ─────────────────────────────────────────────────────
  const [showNewProj,setShowNewProj]=useState(false);
  const [newProj,setNewProj]=useState({name:"",desc:"",cloud:"AWS",deployment:false});
  const handleAddProject=()=>{
    if(!newProj.name.trim()) return;
    const proj={ id:uid(), name:newProj.name.trim(), desc:newProj.desc||"New project", status:"pending", domainIdx:0, progress:0, cloud:newProj.cloud, ago:"just now" };
    if(!WORKSPACE_PROJECTS[wsId]) WORKSPACE_PROJECTS[wsId]=[];
    WORKSPACE_PROJECTS[wsId]=[...WORKSPACE_PROJECTS[wsId],proj];
    setNewProj({name:"",desc:"",cloud:"AWS",deployment:false}); setShowNewProj(false);
    setView("pipeline");
  };

  // ── View artifacts nav ────────────────────────────────────────────────────
  const handleViewArtifacts=()=>setView("artifacts");

  // ── Derived ───────────────────────────────────────────────────────────────
  const ws=workspaces.find(w=>w.id===wsId)??workspaces[0];
  const projects=WORKSPACE_PROJECTS[wsId]??[];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div style={{height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* ═══ TOPNAV ═══════════════════════════════════════════════════ */}
        <header style={{height:54,flexShrink:0,background:T.bgCard,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",zIndex:50}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <div style={{width:30,height:30,borderRadius:8,flexShrink:0,background:`linear-gradient(135deg,${T.cyan},${T.purple})`,boxShadow:`0 0 14px ${T.cyan}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>⬡</div>
              <div>
                <div style={{fontSize:12,fontWeight:700,color:T.text,letterSpacing:"-0.01em"}}>FORGE</div>
                <div style={{fontSize:8,color:T.cyan,letterSpacing:"0.2em"}}>BY ANTHROPIC</div>
              </div>
            </div>
            <div style={{width:1,height:28,background:T.border,flexShrink:0}}/>
            <div style={{display:"flex",gap:2}}>
              {["pipeline","artifacts","monitor","settings"].map(v=>(
                <button key={v} type="button" onClick={()=>setView(v)} style={{background:view===v?T.bgEl:"transparent",border:`1px solid ${view===v?T.borderHi:"transparent"}`,color:view===v?T.cyan:T.textSub,padding:"5px 13px",borderRadius:6,fontSize:10,fontWeight:600,letterSpacing:"0.07em",cursor:"pointer",textTransform:"uppercase"}}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span className="dot-pulse" style={{width:6,height:6,borderRadius:"50%",background:T.green,boxShadow:`0 0 7px ${T.green}`,display:"inline-block"}}/>
              <span style={{fontSize:10,color:T.green,fontWeight:700}}>15 AGENTS LIVE</span>
            </div>
            <div style={{width:1,height:22,background:T.border}}/>
            <button type="button" onClick={()=>setRunning(r=>!r)} style={{background:running?T.greenFaint:T.redFaint,border:`1px solid ${running?T.green+"50":T.red+"50"}`,color:running?T.green:T.red,padding:"5px 13px",borderRadius:6,fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:"0.07em"}}>
              {running?"⏸ PAUSE":"▶ RESUME"}
            </button>
            <AccountMenu user={user} onLogout={onLogout} onOpen={setAccountPanel} />
          </div>
        </header>

        {/* ═══ BODY ══════════════════════════════════════════════════════ */}
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>

          {/* ── LEFT SIDEBAR ──────────────────────────────────────────── */}
          <aside style={{width:214,flexShrink:0,background:T.bgCard,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>

            {/* Workspaces */}
            <div style={{padding:"15px 13px 12px",borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <Lbl>WORKSPACES</Lbl>
                <div style={{display:"flex",gap:4}}>
                  <button type="button" onClick={()=>setShowAddWs(true)} title="Add workspace" style={{background:T.cyanFaint,border:`1px solid ${T.cyan}40`,color:T.cyan,width:18,height:18,borderRadius:3,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>+</button>
                  <button type="button" onClick={()=>workspaces.length>1&&setShowDelWs(true)} title="Remove workspace" style={{background:T.redFaint,border:`1px solid ${T.red}40`,color:T.red,width:18,height:18,borderRadius:3,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,opacity:workspaces.length<=1?0.4:1}}>−</button>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:3}}>
                {workspaces.map(w=>(
                  <button key={w.id} type="button" onClick={()=>setWsId(w.id)} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:7,background:wsId===w.id?T.bgEl:"transparent",border:`1px solid ${wsId===w.id?w.color+"40":"transparent"}`,cursor:"pointer"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:7,height:7,borderRadius:2,background:w.color,flexShrink:0}}/>
                      <span style={{fontSize:11,fontWeight:600,color:wsId===w.id?T.text:T.textSub}}>{w.name}</span>
                    </div>
                    <div style={{fontSize:9,color:T.textDim,marginTop:2,paddingLeft:14}}>
                      {(WORKSPACE_PROJECTS[w.id]??[]).length} projects · {w.members} members
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div style={{padding:"12px 13px 0",flex:1,overflowY:"auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <Lbl>PROJECTS</Lbl>
                <button type="button" onClick={()=>setShowNewProj(true)} style={{background:T.cyanFaint,border:`1px solid ${T.cyan}40`,color:T.cyan,width:18,height:18,borderRadius:3,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,marginBottom:10}}>+</button>
              </div>
              {projects.length===0
                ? <div style={{fontSize:10,color:T.textDim,padding:"8px 0",textAlign:"center"}}>No projects yet</div>
                : projects.map(p=>(
                    <button key={p.id} type="button" onClick={()=>{ setView("pipeline"); }} style={{width:"100%",textAlign:"left",padding:"8px 10px",borderRadius:6,marginBottom:3,background:T.transparent,border:`1px solid ${T.border}`,cursor:"pointer",display:"block"}}>
                      <div style={{fontSize:11,fontWeight:600,marginBottom:4,color:T.textSub}}>{p.name}</div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <Badge status={p.status}/><span style={{fontSize:8,color:T.textDim}}>{p.ago}</span>
                      </div>
                    </button>
                  ))
              }
            </div>

            {/* Domain progress */}
            <div style={{padding:"12px 13px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
              <Lbl>DOMAIN PROGRESS</Lbl>
              {DOMAINS.map((d,i)=>{
                const pct=i<activeDomainIdx?100:i===activeDomainIdx?(activeStageIdx/2)*100:0;
                return (
                  <div key={d.id} style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                    <span style={{color:d.color,fontSize:10,flexShrink:0,width:14}}>{d.icon}</span>
                    <span style={{fontSize:9,color:T.textSub,width:72,flexShrink:0}}>{d.label}</span>
                    <div style={{flex:1}}><Bar pct={pct} color={d.color} h={2}/></div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
          {view==="pipeline"&&(
            <PipelineView
              wsKey={wsId}
              projects={projects}
              activeDomainIdx={activeDomainIdx}
              activeStageIdx={activeStageIdx}
              logs={logs}
              approvals={approvals}
              onApproval={handleApproval}
              onRunPipeline={handleRunPipeline}
              onViewArtifacts={handleViewArtifacts}
            />
          )}
          {view==="artifacts"&&<ArtifactsView wsKey={wsId}/>}
          {view==="monitor"  &&<MonitorView wsKey={wsId} projects={projects}/>}
          {view==="settings" &&<SettingsView settings={settings} onChange={handleSettingChange} onSave={handleSaveSettings} saved={settingsSaved}/>}

          {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
          <aside style={{width:230,flexShrink:0,background:T.bgCard,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflowY:"auto"}}>
            {/* Agent status */}
            <div style={{padding:"15px 13px 12px",borderBottom:`1px solid ${T.border}`}}>
              <Lbl>AGENT STATUS</Lbl>
              {DOMAINS.map((d,di)=>{
                const isDone=di<activeDomainIdx, isActive=di===activeDomainIdx;
                return (
                  <div key={d.id} style={{marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <span style={{fontSize:10,color:isDone?T.green:d.color}}>{isDone?"✓":d.icon}</span>
                        <span style={{fontSize:10,color:isActive?T.text:T.textSub,fontWeight:600}}>{d.label}</span>
                      </div>
                      <span style={{fontSize:8,fontWeight:700,letterSpacing:"0.08em",color:isDone?T.green:isActive?T.cyan:T.textDim}}>
                        {isDone?"DONE":isActive?"ACTIVE":"IDLE"}
                      </span>
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      {d.agents.map((_,ai)=>{
                        const filled=isDone||(isActive&&ai<=activeStageIdx);
                        const glow=isActive&&ai===activeStageIdx;
                        return <div key={ai} style={{flex:1,height:3,borderRadius:99,background:filled?d.color:T.border,boxShadow:glow?`0 0 5px ${d.color}`:"none",transition:"all .4s"}}/>;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Security */}
            <div style={{padding:"12px 13px",borderBottom:`1px solid ${T.border}`}}>
              <Lbl>SECURITY POSTURE</Lbl>
              {[{label:"OWASP",value:94,color:T.green},{label:"SAST",value:87,color:T.amber},{label:"Dep Health",value:91,color:T.green},{label:"Auth",value:98,color:T.cyan}].map(item=>(
                <div key={item.label} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                    <span style={{fontSize:9,color:T.textSub}}>{item.label}</span>
                    <span style={{fontSize:9,color:item.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{item.value}%</span>
                  </div>
                  <Bar pct={item.value} color={item.color} h={2}/>
                </div>
              ))}
              <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap"}}>
                {[{l:"0 CRITICAL",c:T.green},{l:"2 MEDIUM",c:T.amber},{l:"5 LOW",c:T.textSub}].map(v=>(
                  <span key={v.l} style={{fontSize:7,color:v.c,background:`${v.c}14`,border:`1px solid ${v.c}30`,padding:"2px 5px",borderRadius:3,fontWeight:700}}>{v.l}</span>
                ))}
              </div>
            </div>

            {/* Infra */}
            <div style={{padding:"12px 13px",borderBottom:`1px solid ${T.border}`}}>
              <Lbl>INFRASTRUCTURE</Lbl>
              {[{l:"K8s Pods",v:"24",s:"/ 50",c:T.cyan},{l:"Kafka Lag",v:"142",s:"msg",c:T.green},{l:"Redis Hit",v:"96.4",s:"%",c:T.green},{l:"DB Conns",v:"38",s:"/ 200",c:T.amber},{l:"API P99",v:"87",s:"ms",c:T.cyan}].map(item=>(
                <div key={item.l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${T.border}`}}>
                  <span style={{fontSize:9,color:T.textSub}}>{item.l}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:item.c,fontWeight:700}}>
                    {item.v}<span style={{fontSize:8,color:T.textDim,fontWeight:400}}> {item.s}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* Role */}
            <div style={{padding:"12px 13px"}}>
              <Lbl>YOUR ROLE</Lbl>
              <div style={{background:T.bgEl,border:`1px solid ${T.cyan}30`,borderRadius:8,padding:12}}>
                <div style={{fontSize:14,fontWeight:700,color:T.cyan}}>OWNER</div>
                <div style={{fontSize:9,color:T.textSub,marginTop:2}}>{ws.name}</div>
                <div style={{marginTop:8,display:"flex",flexWrap:"wrap",gap:3}}>
                  {["APPROVE","DEPLOY","REVIEW","EDIT","ADMIN"].map(p=>(
                    <span key={p} style={{fontSize:7,color:T.green,background:T.greenFaint,border:`1px solid ${T.green}30`,padding:"2px 5px",borderRadius:3,fontWeight:700}}>{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ══ MODALS ════════════════════════════════════════════════════════ */}

      {/* Run pipeline confirm */}
      {runModal&&(
        <Modal title={`Run Pipeline`} sub={`Start a new SDLC pipeline for: ${runModal.name}`} onClose={()=>setRunModal(null)}>
          <div style={{background:T.bgEl,border:`1px solid ${T.border}`,borderRadius:8,padding:14,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:600,color:T.text,marginBottom:6}}>{runModal.name}</div>
            <div style={{fontSize:10,color:T.textSub,marginBottom:10}}>{runModal.desc}</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {DOMAINS.map(d=>(
                <div key={d.id} style={{display:"flex",alignItems:"center",gap:5,background:`${d.color}14`,border:`1px solid ${d.color}40`,borderRadius:5,padding:"4px 8px"}}>
                  <span style={{color:d.color,fontSize:10}}>{d.icon}</span>
                  <span style={{fontSize:9,color:T.text,fontWeight:600}}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{fontSize:10,color:T.textSub,marginBottom:16}}>This will start all 15 agents across 5 domains. Each stage requires approval before proceeding.</div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>setRunModal(null)} style={{flex:1,padding:"10px 0",textAlign:"center"}}>CANCEL</Btn>
            <Btn variant="primary" onClick={confirmRunPipeline} style={{flex:2,padding:"10px 0",textAlign:"center"}}>▶ CONFIRM & LAUNCH</Btn>
          </div>
        </Modal>
      )}

      {/* Add workspace */}
      {showAddWs&&(
        <Modal title="Add Workspace" sub="Create a new isolated workspace for a team" onClose={()=>setShowAddWs(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="WORKSPACE NAME">
              <input type="text" value={newWsName} onChange={e=>setNewWsName(e.target.value)} placeholder="e.g. Backend Team" autoFocus/>
            </Field>
            <Field label="ACCENT COLOR">
              <div style={{display:"flex",gap:8,marginTop:2}}>
                {WS_COLORS.map(c=>(
                  <button key={c} type="button" onClick={()=>setNewWsColor(c)} style={{width:28,height:28,borderRadius:6,background:c,border:`2px solid ${newWsColor===c?"white":"transparent"}`,cursor:"pointer",boxShadow:newWsColor===c?`0 0 10px ${c}`:"none"}}/>
                ))}
              </div>
            </Field>
          </div>
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <Btn onClick={()=>setShowAddWs(false)} style={{flex:1,padding:"10px 0",textAlign:"center"}}>CANCEL</Btn>
            <Btn variant="primary" color={newWsColor} onClick={handleAddWorkspace} style={{flex:2,padding:"10px 0",textAlign:"center",borderColor:`${newWsColor}50`,color:newWsColor}}>CREATE WORKSPACE</Btn>
          </div>
        </Modal>
      )}

      {/* Delete workspace */}
      {showDelWs&&(
        <Modal title="Remove Workspace" sub="This action cannot be undone" onClose={()=>setShowDelWs(false)}>
          <div style={{background:T.redFaint,border:`1px solid ${T.red}30`,borderRadius:8,padding:14,marginBottom:16}}>
            <div style={{fontSize:12,color:T.red,fontWeight:700,marginBottom:4}}>⚠ Warning</div>
            <div style={{fontSize:10,color:T.textSub}}>You are about to remove <strong style={{color:T.text}}>{ws.name}</strong> and all its projects and artifacts. This cannot be undone.</div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn onClick={()=>setShowDelWs(false)} style={{flex:1,padding:"10px 0",textAlign:"center"}}>CANCEL</Btn>
            <Btn variant="danger" onClick={handleDeleteWorkspace} style={{flex:1,padding:"10px 0",textAlign:"center"}}>DELETE WORKSPACE</Btn>
          </div>
        </Modal>
      )}

      {/* New project */}
      {showNewProj&&(
        <Modal title="New Project" sub="Create a new project in this workspace" onClose={()=>setShowNewProj(false)}>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="PROJECT NAME">
              <input type="text" value={newProj.name} onChange={e=>setNewProj(p=>({...p,name:e.target.value}))} placeholder="My Service" autoFocus/>
            </Field>
            <Field label="DESCRIPTION">
              <textarea rows={2} value={newProj.desc} onChange={e=>setNewProj(p=>({...p,desc:e.target.value}))} placeholder="What does this project do?"/>
            </Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Field label="CLOUD TARGET">
                <select value={newProj.cloud} onChange={e=>setNewProj(p=>({...p,cloud:e.target.value}))}>
                  {["AWS","GCP","Azure","On-Prem"].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
                <div style={{fontSize:9,color:T.textSub,letterSpacing:"0.13em",fontWeight:700,marginBottom:6}}>DEPLOYMENT</div>
                <Toggle value={newProj.deployment} onChange={v=>setNewProj(p=>({...p,deployment:v}))}/>
              </div>
            </div>
            <Field label="ENABLED DOMAINS">
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:2}}>
                {DOMAINS.map(d=>(
                  <div key={d.id} style={{display:"flex",alignItems:"center",gap:5,background:`${d.color}14`,border:`1px solid ${d.color}40`,borderRadius:5,padding:"4px 8px"}}>
                    <span style={{color:d.color,fontSize:10}}>{d.icon}</span>
                    <span style={{fontSize:9,color:T.text,fontWeight:600}}>{d.label}</span>
                  </div>
                ))}
              </div>
            </Field>
          </div>
          <div style={{display:"flex",gap:10,marginTop:20}}>
            <Btn onClick={()=>setShowNewProj(false)} style={{flex:1,padding:"10px 0",textAlign:"center"}}>CANCEL</Btn>
            <Btn variant="primary" onClick={handleAddProject} style={{flex:2,padding:"10px 0",textAlign:"center"}}>▶ CREATE PROJECT</Btn>
          </div>
        </Modal>
      )}

      {/* ══ ACCOUNT PANELS ════════════════════════════════════════════════ */}
      {accountPanel==="profile"     && <ProfilePanel  user={user} onClose={()=>setAccountPanel(null)}/>}
      {accountPanel==="security2fa" && <SecurityPanel            onClose={()=>setAccountPanel(null)}/>}
      {accountPanel==="apikeys"     && <ApiKeysPanel             onClose={()=>setAccountPanel(null)}/>}
      {accountPanel==="auditlog"    && <AuditLogPanel            onClose={()=>setAccountPanel(null)}/>}
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
export default function EnterpriseFactory() {
  const [user, setUser] = useState(null);
  if (!user) return <LoginScreen onLogin={setUser} />;
  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}
