# TDD-Pro: Agent Onboarding & Workflow Guide

Welcome, coding agent! This guide explains how to use TDD-Pro's MCP tools to plan, refine, and implement features in a modern, agile-inspired workflow.

## What is TDD-Pro?
TDD-Pro is a planning and specification system that helps agents and humans collaborate on software projects. It emphasizes:
- **Feature planning and scoping**
- **Phased delivery and incremental value**
- **Business rule–driven test case design**
- **Technical design and feasibility analysis**
- **Seamless handoff to AI implementers (like you!)**

## Agent Personas & Workflow
TDD-Pro supports two main agent personas:

### 1. Planner/Refiner
- Focus: Iterates on feature requirements (PRD) and breaks down work into tasks.
- Tools: `refine-feature`, `refine-feature-tasks`, `promote-feature`, `update-feature` (for PRD/requirements only).
- Best Practice: Do **not** mark tasks as complete or update task status—leave this for the implementation developer.

### 2. Implementation Developer
- Focus: Implements code and tests to satisfy the evaluation criteria for each task.
- Tools: Task management tools (`get-task`, `update-task`, `set-tasks`, `create-task`, `delete-task`, `move-task`, etc.).
- Best Practice: Only mark a task as complete after verifying the evaluation criteria (e.g., running tests). Do **not** use `update-feature` for marking tasks complete—use the task tools.

**Switching Roles:**
- When refining requirements, act as the Planner/Refiner.
- When implementing, act as the Implementation Developer and focus on code, tests, and task status.

## High-Level Workflow (Agile-Inspired)
1. **List Features**: Use `list-features` to see all features and their status (backlog, refinement, planned, approved).
2. **Get Feature Details**: Use `get-feature` to retrieve all details for a specific feature, including its requirements, design, and tasks.
3. **Refine Feature**: Use `refine-feature` to update the feature's requirements and design (prd.md) in markdown. Include:
   - Feature Brief
   - Acceptance Criteria
   - Design Discussion (with file tree and key design ideas)
4. **Refine Feature Tasks**: Use `refine-feature-tasks` to break down the feature into actionable tasks, each with evaluation criteria.
5. **Promote Feature**: As a feature matures, use `promote-feature` to move it from refinement → planned → approved.
6. **Update Feature**: Use `update-feature` to change a feature's name, description, or PRD/requirements. **Do not use this to mark tasks complete.**
7. **Task Management**: Use the task tools (`get-task`, `update-task`, `set-tasks`, etc.) to update task status, mark tasks complete, or edit task details during implementation.
8. **Onboard/Help**: Use `tdd-pro-how-it-works` at any time to get this guide and understand the workflow.

## Key MCP Tools
- `list-features`: See all features by status.
- `get-feature`: Get full details for a feature (metadata, requirements, tasks).
- `refine-feature`: Update the requirements/design markdown for a feature.
- `refine-feature-tasks`: Update the list of tasks for a feature.
- `promote-feature`: Move a feature through the workflow stages.
- `update-feature`: Edit feature metadata or PRD/requirements (not for task status).
- `get-task`, `update-task`, `set-tasks`, `create-task`, `delete-task`, `move-task`: Manage and update tasks, including marking them complete.
- `tdd-pro-how-it-works`: Get this onboarding guide.

## Best Practices for Agents
- **Always check the latest plan** before making changes.
- **Update the plan and tasks** as you refine or implement features.
- **Use acceptance criteria and tasks** to drive test-driven development (TDD).
- **Communicate design intent** in the markdown (not just code!).
- **Promote features** as they mature through the workflow.
- **Use the correct tools for your persona:**
  - Planner/Refiner: Focus on requirements and task breakdown.
  - Implementation Developer: Focus on code, tests, and task status.

## Example Agent Flow
1. Use `list-features` to find a feature in refinement.
2. Use `get-feature` to read its requirements and tasks.
3. Use `refine-feature` to update the requirements/design.
4. Use `refine-feature-tasks` to specify the next set of tasks.
5. Use `promote-feature` to move the feature to planned/approved when ready.
6. As Implementation Developer, use task tools to implement and mark tasks complete.

---

*For more details, see the project documentation or ask for this guide again with `tdd-pro-how-it-works`.* 