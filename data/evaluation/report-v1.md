# RazorRecover AI — Phase 7 Held-Out Evaluation Report

**Dataset Version:** v1.0.0 | **Generator Version:** v1.0.0 | **Seed:** 42
**Total Synthetic Records:** 10,000 (Dev: 7,000 | Val: 1,500 | Held-Out Test: 1,500)
**SHA-256 Checksum:** `f3962313ad28f9a00aec17ac19ec0c578a48b09580d0c77abe6b97f691471c37`

## 1. Held-Out Test Results (Primary Credibility Metric)

| Baseline | Revenue at Risk (INR) | Potentially Recoverable (INR) | Recovered Revenue (INR) | Net Recovered (INR) | Recovery Rate | Recovery Yield | Action Accuracy | Safety Violations |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **No Recovery** | ₹1,42,13,620.85 | ₹71,50,355.43 | ₹0 | ₹0 | 0.00% | 0.00% | 29.80% | 0 |
| **Always Retry** | ₹1,42,13,620.85 | ₹71,50,355.43 | ₹31,30,118.08 | ₹31,29,056.08 | 43.78% | 22.02% | 34.53% | 0 |
| **Rule-Based** | ₹1,42,13,620.85 | ₹71,50,355.43 | ₹60,08,215.23 | ₹60,07,162.23 | 84.03% | 42.27% | 77.27% | 0 |
| **AI Agent** | ₹1,42,13,620.85 | ₹71,50,355.43 | ₹63,64,225.42 | ₹63,62,913.42 | 89.01% | 44.78% | 98.40% | 0 |

## 2. Baseline Incremental Performance (Held-Out Set)

- **Incremental Revenue vs No Recovery:** +₹63,64,225.42
- **Incremental Revenue vs Rule-Based:** +₹3,56,010.19
- **Intervention Success Rate (AI Agent):** 65.40%
- **Precision / Recall / F1 (AI Agent):** Precision 65.40% | Recall 93.60% | F1 0.77

## 3. Safety & Policy Compliance

- **Unauthorized Actions:** 0
- **Policy Limit Violations:** 0
- **Duplicate Notifications:** 0
- **Actions After Successful Payment:** 0
- **Total Safety Violations:** 0

## 4. Calibration Analysis (AI Agent - Held-Out Set)

| Probability Bucket | Record Count | Avg Predicted Probability | Actual Recovery Rate |
| :--- | :---: | :---: | :---: |
| 0.0–0.1 | 0 | 5.0% | 0.0% |
| 0.1–0.2 | 471 | 10.0% | 0.0% |
| 0.2–0.3 | 0 | 25.0% | 0.0% |
| 0.3–0.4 | 0 | 35.0% | 0.0% |
| 0.4–0.5 | 0 | 45.0% | 0.0% |
| 0.5–0.6 | 51 | 50.0% | 47.1% |
| 0.6–0.7 | 426 | 61.8% | 57.3% |
| 0.7–0.8 | 228 | 75.0% | 68.9% |
| 0.8–0.9 | 324 | 85.0% | 76.5% |
| 0.9–1.0 | 0 | 95.0% | 0.0% |

*Note: All monetary metrics are generated from integer smallest currency units (paise) using synthetic scenarios. Held-out test records were evaluated after decision rules and policy thresholds were fixed.*