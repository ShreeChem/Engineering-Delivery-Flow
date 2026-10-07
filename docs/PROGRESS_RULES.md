# Progress, KPI and RAG rules (V24)

## Earned credit per task
Status-based tasks: Not Started 0 · In Progress 10 · Blocked 10 · Rework 40 · Ready for Review 70 · Completed (approved) 100 (%).
Quantity-based tasks (units complete): credit = done ÷ target × 90%; the last 10% is earned only on reviewer approval.
OTS quantities: Units modelled, I/O tags emulated, Scenarios built, HMI graphics. MES: Requirements, Test cases, Interfaces.

## Earned value (hours)
- BAC = planned hours in the approved baseline (provisional = current plan until approved).
- PV(date) = baseline hours spread evenly between each task's baseline start and due date.
- EV = Σ planned hours × credit. AC = actual hours booked.
- SPI = EV ÷ PV · CPI = EV ÷ AC · Forecast hours (EAC) = BAC ÷ CPI.
- Earned % = EV ÷ BAC; planned % = PV ÷ BAC. Scope change = current planned hours − BAC.

## Baseline
"Approve baseline" freezes task dates, planned hours and stage dates. Stage end dates edited afterwards are the forecast; slip = forecast − baseline (days). Re-baselining requires a reason; previous baselines are kept.

## RAG thresholds
| Light | Green | Amber | Red |
|---|---|---|---|
| Schedule | SPI ≥ 0.95 and no milestone slip | SPI 0.85–0.95 or any slip ≤ 14 d | SPI < 0.85 or a milestone slip > 14 d |
| Hours / budget | CPI ≥ 0.95 | CPI 0.85–0.95 | CPI < 0.85 |
| Quality / scope | No open Cat A punch, no rework, scope within ±5% | Open Cat A punch, rework, or scope change > 5% | Open Cat A punch on a gate due within 14 days |

## Punch list
A blocks the gate, B blocks start-up, C can close after start-up. A project cannot be finished with open A/B items.

## Weekly snapshots and report
One snapshot per week (latest values that week) feeds the S-curve and weekly bars. The weekly report has four audiences: Management, Engineering leads, Main contractor, Plant owner. Publishing freezes the customer versions.

Sources for method: earned-value progress techniques (Deltek Cobra), SPI/CPI definitions (SAS EVM), RAG criteria (Deltek), status-report structure (Project Management Compass), milestone slip (Mastt), punch categories (Project Materials).

## Task links ("Starts after")
- A task can wait for one other task in the same project (finish-to-start), plus optional wait days (calendar days).
- When the earlier task finishes later, a linked task that has not started moves later by the same amount. Tasks are never pulled earlier automatically. The baseline does not move, so the push shows as slip.
- Starting a task before the task it waits for is complete is allowed only with a remark (planner) or a note (engineer).
- Links cannot form a loop: a task never lists its own followers as "Starts after".

## Workload check
- Remaining hours (planned − actual) of each open task are spread evenly over its remaining working days (Mon–Fri), across all projects in the workspace.
- Above 40 h in any week, saving the task needs a remark. A week with a remark counts as agreed and shows "parallel agreed ✓".
- Weeks above 40 h without a remark raise an alert for the PM and Lead and show as a red "peak h/wk" in the Lead's team view.

## Timeline
PM, Lead and Administrator have a Timeline view: stages with their tasks, grey baseline bars, coloured forecast bars (done, running, not started, late or blocked), gates as diamonds, a today line, and a late-tasks table.
