# 7. Teacher-Child Ratio Model (Multi-Grade Smart Planning)

## Objective

Help one teacher handle students from multiple grades in one combined classroom session.

## Inputs

- `T` = number of teachers available in session
- `S` = total students present
- `G` = number of grades taught together
- Per-student risk from assessment (`high`, `medium`, `low`)

## Key Metrics

- Teacher-child ratio: `S / T`
- Grade-mix load index: `ratio * (1 + 0.2 * (G - 1))`

Example:
- One teacher (`T=1`), 36 students (`S=36`), three grades together (`G=3`)
- Ratio = 36
- Grade-mix load index = `36 * (1 + 0.4)` = `50.4` (critical load)

## Rule-based Classroom Plan

- If ratio <= 25 and G=1: full-class direct instruction
- If ratio 26-40 or G>=2: rotation model
- If ratio > 40 and G>=2: strict triage mode

## Rotation Model (30 min block)

- 10 min: high-risk group (teacher-led)
- 10 min: medium-risk group (guided worksheet/audio prompts)
- 10 min: low-risk group (peer revision + recap)

## Expected Impact

- Reduces teacher overload by structuring attention
- Increases high-risk student contact frequency
- Enables mixed-grade teaching without ignoring weaker learners
