"""
Agent Orchestration Engine
Hierarchical multi-agent system with strict approval workflows
Each domain has: Execution Agent → Review Agent → Approval Agent
"""
import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import Any

import anthropic

from app.core.config import settings
from app.core.events import EventBus, PipelineEvent
from app.db.models import AgentDomain, AgentLevel, StageType

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Base Agent
# ─────────────────────────────────────────────────────────────

class BaseAgent(ABC):
    """Abstract base for all agents in the factory"""

    def __init__(
        self,
        domain: AgentDomain,
        level: AgentLevel,
        pipeline_id: str,
        stage_id: str,
    ):
        self.domain = domain
        self.level = level
        self.pipeline_id = pipeline_id
        self.stage_id = stage_id
        self.client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.event_bus = EventBus.get_instance()

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Agent's specialized system prompt"""

    @property
    @abstractmethod
    def agent_name(self) -> str:
        """Human-readable agent name"""

    async def execute(self, context: dict[str, Any]) -> dict[str, Any]:
        """Execute agent task with Claude AI"""
        logger.info(f"[{self.agent_name}] Starting execution for pipeline {self.pipeline_id}")

        await self.event_bus.publish(PipelineEvent(
            pipeline_id=self.pipeline_id,
            stage_id=self.stage_id,
            event_type="agent_started",
            data={"agent": self.agent_name, "domain": self.domain, "level": self.level}
        ))

        try:
            prompt = self._build_prompt(context)
            response = await self._call_claude(prompt)
            result = self._parse_response(response)

            await self.event_bus.publish(PipelineEvent(
                pipeline_id=self.pipeline_id,
                stage_id=self.stage_id,
                event_type="agent_completed",
                data={"agent": self.agent_name, "output_keys": list(result.keys())}
            ))

            return result

        except Exception as e:
            logger.error(f"[{self.agent_name}] Execution failed: {e}", exc_info=True)
            await self.event_bus.publish(PipelineEvent(
                pipeline_id=self.pipeline_id,
                stage_id=self.stage_id,
                event_type="agent_failed",
                data={"agent": self.agent_name, "error": str(e)}
            ))
            raise

    async def _call_claude(self, prompt: str) -> str:
        """Call Claude API with retry logic"""
        max_retries = 3
        for attempt in range(max_retries):
            try:
                message = await self.client.messages.create(
                    model=settings.AGENT_MODEL,
                    max_tokens=settings.AGENT_MAX_TOKENS,
                    system=self.system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                )
                return message.content[0].text
            except Exception:
                if attempt == max_retries - 1:
                    raise
                await asyncio.sleep(2 ** attempt)  # Exponential backoff

    @abstractmethod
    def _build_prompt(self, context: dict[str, Any]) -> str:
        """Build the specific prompt for this agent"""

    def _parse_response(self, response: str) -> dict[str, Any]:
        """Parse agent response - override for structured output"""
        return {"content": response, "raw": response}


# ─────────────────────────────────────────────────────────────
# Architecture Domain Agents
# ─────────────────────────────────────────────────────────────

class ArchitectAgent(BaseAgent):
    """Execution Agent - Converts requirements to technical design"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.ARCHITECTURE, AgentLevel.EXECUTION, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Architect Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a Senior Software Architect at an autonomous software forge.
Your role is to convert business requirements into comprehensive technical designs.

You MUST produce structured output including:
1. ARCHITECTURE PATTERN: (microservices/monolith/serverless/event-driven/hybrid)
2. TECH STACK: Backend, Frontend, Database, Cache, Queue, Infrastructure
3. DATABASE SCHEMA: Complete entity definitions with relationships
4. API DESIGN: RESTful endpoints with request/response schemas
5. FOLDER STRUCTURE: Complete project directory layout
6. ARCHITECTURE DIAGRAM: Mermaid diagram showing system components
7. SCALABILITY PLAN: How the system scales to handle load
8. SECURITY CONSIDERATIONS: Authentication, authorization, data protection
9. PERFORMANCE TARGETS: Latency, throughput, availability targets
10. INTEGRATION POINTS: External services and APIs

Format your response as JSON with these exact keys:
{
  "architecture_pattern": "...",
  "tech_stack": {...},
  "database_schema": {...},
  "api_design": {...},
  "folder_structure": {...},
  "architecture_diagram": "...mermaid...",
  "scalability_plan": "...",
  "security_considerations": "...",
  "performance_targets": {...},
  "integration_points": [...],
  "summary": "..."
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        return f"""Design a complete technical architecture for the following project:

PROJECT NAME: {context.get('project_name', 'Unknown')}
REQUIREMENTS: {context.get('requirements', 'No requirements provided')}
TARGET CLOUD: {context.get('target_cloud', 'AWS')}
SCALE REQUIREMENT: {context.get('scale_requirement', '1M requests/day')}
ENABLED DOMAINS: {', '.join(context.get('enabled_domains', []))}

Produce a comprehensive, production-ready architecture design."""


class SeniorArchitectAgent(BaseAgent):
    """Review Agent - Validates architecture design"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.ARCHITECTURE, AgentLevel.REVIEW, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Senior Architect Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a Principal Software Architect reviewing architectural designs.
You must critically evaluate designs for scalability, security, performance, and maintainability.

Produce a review report as JSON:
{
  "overall_score": 0-100,
  "approved": true/false,
  "scalability_assessment": {...},
  "security_assessment": {...},
  "performance_assessment": {...},
  "anti_patterns_found": [...],
  "improvements_required": [...],
  "improvements_suggested": [...],
  "risks": [...],
  "review_summary": "..."
}

Be strict - only approve designs that meet enterprise standards."""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        architecture = context.get('architecture_output', {})
        return f"""Review the following architecture design critically:

{json.dumps(architecture, indent=2)}

Project Requirements: {context.get('requirements', '')}

Evaluate for: scalability to 1M+ req/day, security best practices, 
performance optimization, maintainability, and SOLID principles."""


class ArchitectureApprovalAgent(BaseAgent):
    """Approval Agent - Final architectural approval"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.ARCHITECTURE, AgentLevel.APPROVAL, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Architecture Approval Agent (Engineering Head)"

    @property
    def system_prompt(self) -> str:
        return """You are the Engineering Head making final architectural decisions.
You review both the design and senior architect review to make the final call.

Produce approval decision as JSON:
{
  "approved": true/false,
  "decision": "APPROVED|REJECTED|NEEDS_REVISION",
  "locked_blueprint": {...},
  "conditions": [...],
  "approval_notes": "...",
  "next_phase_instructions": "..."
}

Only approve when the architecture is solid and review concerns are addressed."""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        return f"""Make final approval decision on this architecture:

DESIGN: {json.dumps(context.get('architecture_output', {}), indent=2)}
REVIEW: {json.dumps(context.get('review_output', {}), indent=2)}

Requirements: {context.get('requirements', '')}"""


# ─────────────────────────────────────────────────────────────
# Development Domain Agents
# ─────────────────────────────────────────────────────────────

class DeveloperAgent(BaseAgent):
    """Execution Agent - Writes production-grade code"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.DEVELOPMENT, AgentLevel.EXECUTION, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Developer Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a Senior Full-Stack Developer writing production-grade code.
Follow the approved architecture blueprint exactly. Write modular, well-documented code.

Produce complete code as JSON:
{
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "...complete file content...",
      "language": "python|typescript|etc",
      "description": "What this file does"
    }
  ],
  "dependencies": {
    "backend": ["package==version"],
    "frontend": ["package@version"]
  },
  "setup_instructions": "...",
  "environment_variables": {...},
  "summary": "..."
}

Write COMPLETE files, not placeholders. Production-ready code only."""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        blueprint = context.get('approved_blueprint', {})
        return f"""Implement the following approved architecture:

ARCHITECTURE BLUEPRINT:
{json.dumps(blueprint, indent=2)}

PROJECT REQUIREMENTS: {context.get('requirements', '')}

Write complete, production-ready code for all components.
Include proper error handling, logging, type hints, and documentation."""


class SeniorDeveloperAgent(BaseAgent):
    """Review Agent - Code quality review"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.DEVELOPMENT, AgentLevel.REVIEW, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Senior Developer Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a Principal Engineer reviewing code quality.
Review for: code quality, anti-patterns, performance, security, and standards compliance.

Produce review as JSON:
{
  "overall_score": 0-100,
  "approved": true/false,
  "code_quality_score": 0-100,
  "security_issues": [...],
  "performance_issues": [...],
  "anti_patterns": [...],
  "missing_error_handling": [...],
  "optimization_suggestions": [...],
  "required_changes": [...],
  "review_summary": "..."
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        code_output = context.get('development_output', {})
        return f"""Review this code for production readiness:

{json.dumps(code_output, indent=2)}

Check for: SOLID principles, DRY, proper error handling, security vulnerabilities,
performance bottlenecks, missing tests, incomplete implementations."""


class DevManagerApprovalAgent(BaseAgent):
    """Approval Agent - Development manager approval"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.DEVELOPMENT, AgentLevel.APPROVAL, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Development Manager Agent"

    @property
    def system_prompt(self) -> str:
        return """You are the Development Manager approving code for QA phase.
Verify all review concerns are addressed before approving.

Produce approval as JSON:
{
  "approved": true/false,
  "decision": "APPROVED_FOR_QA|REJECTED|NEEDS_REVISION",
  "quality_gate_passed": true/false,
  "approval_notes": "...",
  "locked_version": "v1.0.0"
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        return f"""Approve or reject this code for QA phase:

CODE OUTPUT: {json.dumps(context.get('development_output', {}), indent=2)}
SENIOR REVIEW: {json.dumps(context.get('review_output', {}), indent=2)}"""


# ─────────────────────────────────────────────────────────────
# Testing Domain Agents
# ─────────────────────────────────────────────────────────────

class TesterAgent(BaseAgent):
    """Execution Agent - Generates and runs tests"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.TESTING, AgentLevel.EXECUTION, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Tester Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a QA Engineer writing comprehensive test suites.
Generate unit tests, integration tests, and e2e tests for the provided code.

Produce test suite as JSON:
{
  "test_files": [
    {
      "path": "tests/path/to/test_file.py",
      "content": "...complete test code...",
      "test_count": 0,
      "test_type": "unit|integration|e2e"
    }
  ],
  "coverage_estimate": 0-100,
  "test_plan": {...},
  "edge_cases_covered": [...],
  "fixtures": [...],
  "mock_strategies": [...],
  "summary": "..."
}

Write complete test files with pytest. Aim for 90%+ coverage."""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        code = context.get('approved_code', {})
        return f"""Generate comprehensive tests for this codebase:

{json.dumps(code, indent=2)}

Requirements: {context.get('requirements', '')}
Architecture: {json.dumps(context.get('architecture', {}), indent=2)}

Write thorough unit and integration tests. Cover all edge cases and error paths."""


class SeniorTesterAgent(BaseAgent):
    """Review Agent - Test quality validation"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.TESTING, AgentLevel.REVIEW, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Senior Tester Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a QA Lead validating test quality and coverage.

Produce test review as JSON:
{
  "approved": true/false,
  "coverage_adequate": true/false,
  "estimated_coverage": 0-100,
  "missing_test_scenarios": [...],
  "weak_assertions": [...],
  "edge_cases_missing": [...],
  "required_additions": [...],
  "review_summary": "..."
}

Require minimum 85% coverage for approval."""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        tests = context.get('testing_output', {})
        return f"""Review these test suites for quality and completeness:

{json.dumps(tests, indent=2)}

Source code: {json.dumps(context.get('approved_code', {}), indent=2)}"""


class QAManagerApprovalAgent(BaseAgent):
    """Approval Agent - QA manager approval for security phase"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.TESTING, AgentLevel.APPROVAL, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "QA Manager Agent"

    @property
    def system_prompt(self) -> str:
        return """You are the QA Manager approving builds for security validation.

Produce approval as JSON:
{
  "approved": true/false,
  "decision": "APPROVED_FOR_SECURITY|REJECTED",
  "quality_criteria_met": {...},
  "approval_notes": "..."
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        return f"""Approve this build for security phase:

TESTS: {json.dumps(context.get('testing_output', {}), indent=2)}
REVIEW: {json.dumps(context.get('review_output', {}), indent=2)}"""


# ─────────────────────────────────────────────────────────────
# Security Domain Agents
# ─────────────────────────────────────────────────────────────

class SecurityEngineerAgent(BaseAgent):
    """Execution Agent - Security scanning"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.SECURITY, AgentLevel.EXECUTION, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Security Engineer Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a Security Engineer performing comprehensive security analysis.
Scan for: SQL injection, XSS, CSRF, SSRF, authentication flaws, insecure dependencies,
secrets exposure, insecure deserialization, broken access control, security misconfigurations.

Produce security report as JSON:
{
  "vulnerabilities": [
    {
      "id": "VULN-001",
      "type": "SQL_INJECTION|XSS|CSRF|etc",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "file": "path/to/file.py",
      "line": 42,
      "description": "...",
      "remediation": "...",
      "cwe": "CWE-89",
      "cvss_score": 9.8
    }
  ],
  "dependency_vulnerabilities": [...],
  "security_score": 0-100,
  "owasp_top10_coverage": {...},
  "secrets_exposed": [...],
  "summary": "..."
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        code = context.get('approved_code', {})
        return f"""Perform comprehensive security analysis on this codebase:

{json.dumps(code, indent=2)}

Check for all OWASP Top 10 vulnerabilities, dependency issues, and security misconfigurations.
Be thorough - this is production code."""


class SeniorSecurityAgent(BaseAgent):
    """Review Agent - Security finding validation"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.SECURITY, AgentLevel.REVIEW, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Senior Security Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a Principal Security Engineer validating security findings.
Remove false positives, validate severity ratings, and confirm remediation paths.

Produce validated report as JSON:
{
  "validated_vulnerabilities": [...],
  "false_positives_removed": [...],
  "severity_adjustments": [...],
  "critical_issues": [...],
  "approved": true/false,
  "review_summary": "..."
}

Only approve when no critical or high unresolved vulnerabilities exist."""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        scan = context.get('security_output', {})
        return f"""Validate these security findings:

{json.dumps(scan, indent=2)}

Remove false positives, validate severity, and determine if code is production-ready."""


class SecurityManagerApprovalAgent(BaseAgent):
    """Approval Agent - Final security clearance"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.SECURITY, AgentLevel.APPROVAL, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Security Manager Agent"

    @property
    def system_prompt(self) -> str:
        return """You are the CISO/Security Manager giving final production security clearance.

Produce clearance as JSON:
{
  "approved": true/false,
  "decision": "SECURITY_CLEARED|REJECTED",
  "clearance_level": "FULL|CONDITIONAL|DENIED",
  "residual_risks": [...],
  "security_sign_off": "...",
  "conditions": [...]
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        return f"""Issue final security clearance decision:

SCAN RESULTS: {json.dumps(context.get('security_output', {}), indent=2)}
REVIEW: {json.dumps(context.get('review_output', {}), indent=2)}"""


# ─────────────────────────────────────────────────────────────
# DevOps Domain Agents
# ─────────────────────────────────────────────────────────────

class CloudEngineerAgent(BaseAgent):
    """Execution Agent - Infrastructure generation"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.DEVOPS, AgentLevel.EXECUTION, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Cloud Engineer Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a Senior Cloud/DevOps Engineer generating complete infrastructure.
Generate: Dockerfile, docker-compose, Kubernetes manifests, Helm charts, CI/CD pipelines.

Produce infrastructure as JSON:
{
  "dockerfile": "...complete Dockerfile content...",
  "docker_compose": "...complete docker-compose.yml...",
  "kubernetes": {
    "namespace.yaml": "...",
    "deployment.yaml": "...",
    "service.yaml": "...",
    "ingress.yaml": "...",
    "hpa.yaml": "...",
    "configmap.yaml": "...",
    "secret.yaml": "..."
  },
  "helm_chart": {
    "Chart.yaml": "...",
    "values.yaml": "...",
    "templates/": {...}
  },
  "ci_cd": {
    ".github/workflows/deploy.yml": "...",
    ".github/workflows/test.yml": "..."
  },
  "rollback_strategy": "...",
  "cost_estimate": {...},
  "summary": "..."
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        arch = context.get('architecture', {})
        cloud = context.get('target_cloud', 'aws')
        return f"""Generate complete infrastructure for deployment on {cloud}:

ARCHITECTURE: {json.dumps(arch, indent=2)}
PROJECT: {context.get('project_name', '')}
CLOUD TARGET: {cloud}
SCALE: 1M+ requests/day

Include autoscaling, health checks, rollback strategy, and cost estimation."""


class CloudTeamLeadAgent(BaseAgent):
    """Review Agent - Infrastructure validation"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.DEVOPS, AgentLevel.REVIEW, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Cloud Team Lead Agent"

    @property
    def system_prompt(self) -> str:
        return """You are a Cloud Architecture Lead reviewing infrastructure configs.
Validate: best practices, autoscaling, secrets management, cost efficiency, security.

Produce review as JSON:
{
  "approved": true/false,
  "best_practices_score": 0-100,
  "security_issues": [...],
  "cost_optimization": [...],
  "autoscaling_valid": true/false,
  "secrets_management_valid": true/false,
  "required_changes": [...],
  "review_summary": "..."
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        infra = context.get('devops_output', {})
        return f"""Review this infrastructure configuration:

{json.dumps(infra, indent=2)}

Validate for: production readiness, security, cost efficiency, scalability."""


class CloudManagerApprovalAgent(BaseAgent):
    """Approval Agent - Final deployment approval"""

    def __init__(self, pipeline_id: str, stage_id: str):
        super().__init__(AgentDomain.DEVOPS, AgentLevel.APPROVAL, pipeline_id, stage_id)

    @property
    def agent_name(self) -> str:
        return "Cloud Manager Agent"

    @property
    def system_prompt(self) -> str:
        return """You are the VP of Engineering approving production deployments.

Produce final approval as JSON:
{
  "approved": true/false,
  "decision": "APPROVED_FOR_PRODUCTION|REJECTED",
  "release_version": "v1.0.0",
  "deployment_window": "...",
  "rollback_plan": "...",
  "release_notes": "...",
  "approval_sign_off": "..."
}"""

    def _build_prompt(self, context: dict[str, Any]) -> str:
        return f"""Approve production deployment:

INFRA: {json.dumps(context.get('devops_output', {}), indent=2)}
REVIEW: {json.dumps(context.get('review_output', {}), indent=2)}
SECURITY CLEARANCE: {json.dumps(context.get('security_clearance', {}), indent=2)}"""


# ─────────────────────────────────────────────────────────────
# Agent Factory
# ─────────────────────────────────────────────────────────────

AGENT_REGISTRY = {
    StageType.ARCHITECTURE: ArchitectAgent,
    StageType.ARCHITECTURE_REVIEW: SeniorArchitectAgent,
    StageType.ARCHITECTURE_APPROVAL: ArchitectureApprovalAgent,
    StageType.DEVELOPMENT: DeveloperAgent,
    StageType.DEVELOPMENT_REVIEW: SeniorDeveloperAgent,
    StageType.DEVELOPMENT_APPROVAL: DevManagerApprovalAgent,
    StageType.TESTING: TesterAgent,
    StageType.TESTING_REVIEW: SeniorTesterAgent,
    StageType.TESTING_APPROVAL: QAManagerApprovalAgent,
    StageType.SECURITY: SecurityEngineerAgent,
    StageType.SECURITY_REVIEW: SeniorSecurityAgent,
    StageType.SECURITY_APPROVAL: SecurityManagerApprovalAgent,
    StageType.DEVOPS: CloudEngineerAgent,
    StageType.DEVOPS_REVIEW: CloudTeamLeadAgent,
    StageType.DEVOPS_APPROVAL: CloudManagerApprovalAgent,
}


def create_agent(stage_type: StageType, pipeline_id: str, stage_id: str) -> BaseAgent:
    """Factory function to create the correct agent for a stage"""
    agent_class = AGENT_REGISTRY.get(stage_type)
    if not agent_class:
        raise ValueError(f"No agent registered for stage type: {stage_type}")
    return agent_class(pipeline_id=pipeline_id, stage_id=stage_id)
