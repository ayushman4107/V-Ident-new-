# V-Ident — TASS-V
### Tier-Adaptive, Risk-Calibrated, Accessibility-First Identity Verification

> **Built by Team PsychoBytes · IIIT Pune · February 2026**

V-Ident is a mobile identity verification engine that detects whether a user is a live, unique human — without storing raw biometrics, without blockchain overhead, and without locking out budget-device users. It dynamically selects the optimal combination of physiological signals per device, achieving **< 3% human review rate** and **< ₹1 cost per verification**.

---

## Table of Contents

- [Core Design Philosophy](#core-design-philosophy)
- [What Makes V-Ident Different](#what-makes-v-ident-different)
- [Architecture: The Three-Axis Model](#architecture-the-three-axis-model)
- [Device Tier Classification](#device-tier-classification)
- [Signal Portfolio (TASS Matrix)](#signal-portfolio-tass-matrix)
- [Trust Score Engine](#trust-score-engine)
- [Verification Zones](#verification-zones)
- [Accessibility System](#accessibility-system)
- [Security & Anti-Spoofing](#security--anti-spoofing)
- [Enrollment Flow](#enrollment-flow)
- [Per-Transaction Verification Flow](#per-transaction-verification-flow)
- [Tech Stack](#tech-stack)
- [Economic Model](#economic-model)
- [Regulatory Compliance](#regulatory-compliance)
- [Roadmap](#roadmap)
- [What's Excluded from Phase 1](#whats-excluded-from-phase-1)

---

## Core Design Philosophy

The redesigned V-Ident is **not** a 6-layer ML monolith. It is a signal-selection engine governed by three runtime inputs:

```
Signal Set = f(Device Tier, Transaction Risk Level, User Accessibility Profile)
```

This single architectural shift — computing signal selection at runtime rather than statically — resolves over 60% of the flaws present in the original design, including computational overload on budget phones, biometric bias, and accessibility exclusion.

---

## What Makes V-Ident Different

Three genuine innovations not found combined in any competitor product:

1. **Psychophysiological signal fusion** — rPPG heartbeat detection combined with behavioral timing as the core liveness proof, running on-device with no video upload.
2. **XAI-based explainability** — every rejection generates a plain-language explanation for both the user and the review officer, as required under RBI FREE-AI and the DPDP Act.
3. **Privacy-first ZK-proof output** — the system attests *"live unique human"* without transmitting raw biometrics or creating a cross-service tracking vector.

---

## Architecture: The Three-Axis Model

Every verification is governed by three axes, each independently set and tamper-resistant:

| Axis | Determined By | Values | Modifiable By User? |
|---|---|---|---|
| **Device Tier** | Hardware benchmark at install | T1 (Budget) / T2 (Mid) / T3 (Premium) | No |
| **Transaction Risk** | Calling service (bank / govt) | R1 (Low) / R2 (Medium) / R3 (High) | No |
| **User Profile** | Self-declared at enrollment | Standard / Motor / Visual / Neurological / Elderly | Declared once, encrypted |

---

## Device Tier Classification

At first launch, a **3-second Device Profiler** silently benchmarks actual hardware — not spec sheets — to prevent tier spoofing.

| Property | Tier 1 — Budget (₹10K–₹20K) | Tier 2 — Mid (₹20K–₹45K) | Tier 3 — Premium (₹45K+) |
|---|---|---|---|
| Example Devices | Redmi 13C, Realme C65, Samsung A15 | Realme 12, Samsung A55, Pixel 6a | iPhone 15+, Pixel 8 Pro, Samsung S24 |
| Front Camera | 8 MP, no OIS, ≤ 30 FPS | 16–32 MP, 30 FPS | 12–48 MP, PDAF, 60 FPS |
| ML Accelerator | CPU only / basic DSP | Mid-tier NPU (Helio G99 / SD 7s) | Apple Neural Engine / Tensor G3 / SD 8 Gen 3 |
| TEE | Basic TrustZone | TrustZone + Android Keystore | StrongBox (Android) / Secure Enclave (iOS) |
| RAM | 4–6 GB | 6–8 GB | 8–16 GB |
| Max On-Device Model Size | ~15 MB total | ~40 MB total | ~80 MB total |
| Profiler Benchmark | < 500 TOPS | 500–1500 TOPS | > 1500 TOPS |

---

## Signal Portfolio (TASS Matrix)

Signals are selected automatically based on device tier. The app ships with only the Core Model (~12 MB); additional signal modules are downloaded once after device profiling.

| Signal | Available On | Compute Cost | Spoof Resistance (2026) |
|---|---|---|---|
| **Visual Frequency Forensics (VFF)** | T1, T2, T3 | Low — 3–5 MB model | HIGH — detects GAN/diffusion artifacts at frequency domain |
| **Cognitive Response Timing (CRT)** | T1, T2, T3 | Near-zero — rule-based | MEDIUM-HIGH — AI reaction timing lacks natural human jitter |
| **Hardware Attestation (HA)** | T1 (basic), T2/T3 (full) | Negligible | VERY HIGH — cryptographic; requires physical hardware compromise |
| **Micro-tremor IMU Analysis** | T2, T3 only | Low | HIGH — natural 8–12 Hz hand tremor is physically impossible to inject |
| **rPPG Heartbeat Detection** | T2, T3 (with lighting gate) | Medium — 8–12 MB model | MEDIUM (improving) — multi-region skin tone adaptation applied |
| **Touch-Pressure Behavioral Biometrics** | T2, T3 only | Low | MEDIUM — real-time force signature is hard to replicate |
| **Micro-saccade Eye Tracking** | T3 only | High — 15–20 MB model | VERY HIGH — sub-ms latency physically impossible to deepfake in real time |

### Minimum Signal Requirements per Risk × Tier

| Risk Level | Tier 1 (Budget) | Tier 2 (Mid) | Tier 3 (Premium) |
|---|---|---|---|
| **R1 — Low** (≤ ₹5K / routine login) | VFF + CRT + HA-Basic | VFF + CRT + Micro-tremor + HA | VFF + CRT + Micro-tremor + HA-Full |
| **R2 — Medium** (₹5K–₹50K / account changes) | VFF + CRT + HA-Basic + Step-Up Challenge | VFF + CRT + Micro-tremor + rPPG + HA | All T2 signals + Touch Pressure |
| **R3 — High** (₹50K+ / SIM swap / KYC) | VFF + CRT + HA-Basic + **Async Human Review** | VFF + CRT + Micro-tremor + rPPG + Touch + HA | Full suite including Micro-saccade |

> **Note:** For Tier 1 + R3, the system falls back to Async Human Review (within 4 hours) rather than blocking service entirely.

---

## Trust Score Engine

V-Ident uses **Bayesian Log-Odds Fusion** — not a weighted geometric mean — because it handles missing signals (for accessibility profiles) gracefully and accounts for signal reliability variance across device tiers.

### Computation Steps

```
1. Prior Log-Odds (neutral): LogOdds₀ = log[0.5 / 0.5] = 0

2. Per-signal LLR:
   LLR_i = log[ P(human | s_i) / P(spoof | s_i) ]
   (LLR > 0 = evidence for human; LLR < 0 = spoof detected; LLR = 0 = signal unavailable)

3. Weighted Bayesian Fusion:
   LogOdds_fused = LogOdds₀ + Σ (w_i × LLR_i)
   [Missing/inaccessible signals contribute 0 automatically]

4. Cross-Signal Temporal Consistency Bonus (T2/T3 only):
   Corr = Pearson correlation between rPPG rhythm and IMU tremor rhythm
   Bonus_LLR = 0.5 × max(0, Corr)

5. Rooted Device Penalty (if detected):
   LogOdds_fused = min(LogOdds_fused, 0.70) [caps TS at ~70]

6. Sigmoid Conversion → Trust Score:
   P_human = 1 / (1 + exp(-LogOdds_fused))
   TS = round(P_human × 100, 1)
```

### Signal Weight Matrix

| Signal | Weight — Tier 1 | Weight — Tier 2 | Weight — Tier 3 |
|---|---|---|---|
| Visual Frequency Forensics (VFF) | 0.45 | 0.30 | 0.20 |
| Cognitive Response Timing (CRT) | 0.35 | 0.20 | 0.15 |
| Hardware Attestation (HA) | 0.20 | 0.15 | 0.10 |
| Micro-tremor IMU | 0.00 | 0.20 | 0.15 |
| rPPG Heartbeat | 0.00 | 0.15 | 0.20 |
| Touch Pressure Biometrics | 0.00 | 0.00 | 0.10 |
| Micro-saccade Eye Tracking | 0.00 | 0.00 | 0.10 |
| **SUM** | **1.00** | **1.00** | **1.00** |

---

## Verification Zones

| Zone | Trust Score Range | Action |
|---|---|---|
| 🟢 **GREEN** | TS ≥ 80 (R1) / ≥ 90 (R2) / ≥ 95 (R3) | Auto-Approve. ZK-proof issued immediately. No human involved. |
| 🟡 **AMBER** | 65 ≤ TS < threshold | Secondary Challenge triggered automatically in a different modality. Target: converts 80% of Amber to Green. |
| 🔴 **RED** | TS < 65, OR attestation fail, OR rooted device + R3 | Async Human Review queue. User is never blocked — notified within 4 hours. |

At scale (100K verifications/day): **~88% Green → ~9% Amber → ~3% human review**, manageable by a 50-person team at 4 minutes per case.

### Trust Score Thresholds by Risk Level

| Risk Level | Green (Auto-Approve) | Amber (Challenge) | Red (Human Review) |
|---|---|---|---|
| R1 — Low | TS ≥ 80 | 65 ≤ TS < 80 | TS < 65 |
| R2 — Medium | TS ≥ 90 | 72 ≤ TS < 90 | TS < 72 |
| R3 — High | TS ≥ 95 | 82 ≤ TS < 95 | TS < 82 |
| Rooted Device | Never (capped at 70) | R1 only (65–70) | Always for R2, R3 |

---

## Accessibility System

At enrollment, users optionally declare an accessibility profile. It is encrypted in the Secure Enclave and **never sent to any server**. Any signal inaccessible to a profile is automatically excluded, and the Trust Score formula re-normalizes weights across remaining signals — no user is penalized for a disability.

| Accessibility Profile | Alternative Signal Configuration |
|---|---|
| **Standard** (default) | Full TASS matrix per device tier |
| **Motor Disability** | Removes CRT gesture component; replaces with extended rPPG + voice pitch micro-tremor analysis |
| **Visual Impairment** | Removes all gaze-based challenges; replaces with audio-guided voice challenge + touch pressure biometrics + rPPG |
| **Neurological** (Parkinson's, MS, etc.) | Extended time windows (3×); IMU tremor model uses personalized baseline from enrollment; flags for human review only if deviation from personal baseline is large |
| **Elderly Users** | Extended challenge windows (2×); larger visual targets; voice challenge available; reduced gesture complexity |

---

## Security & Anti-Spoofing

### Rooted / Jailbroken Device Handling

- **Layer 1** — Android Play Integrity API / iOS Jailbreak detection at every session start.
- **Layer 2** — Root detection does NOT deny service. Instead, Trust Score is **capped at 70**, ensuring AMBER or RED zone for anything above R1.
- **Layer 3** — Temporal consistency check: injected sensor data arrives with suspiciously uniform inter-sample timing. Real sensor data has 0.5–2 ms jitter from OS scheduling. Jitter analysis is performed inside the Secure Enclave.
- **Layer 4** — Attestation timestamp validation: if IMU data claims to be captured *before* the camera started recording, it is flagged as a spoofed replay.

### rPPG Bias Mitigation (Skin Tone & Camera Quality)

1. **Lighting Gate** — Ambient lux is measured via camera histogram. If lux < 150, rPPG is skipped and weight redistributed to other signals.
2. **Fitzpatrick Classifier** — A 400 KB one-frame model classifies skin tone on the forehead ROI. Fitzpatrick I–III uses green-channel primary; Fitzpatrick IV–VI uses red-channel primary with a 4-second extended averaging window for better SNR.
3. **Multi-Region Fusion** — Forehead, left cheek, and right cheek are analyzed independently. A deepfake generates consistent artificial pulse; a real human shows natural cross-region variability. The Cross-Region Consistency Score (CRCS) feeds directly into the Trust Score.
4. **Camera Quality Compensation** — On Tier 1, a noise-adaptive pre-filter calibrated to the specific camera sensor (from EXIF metadata) is applied. 15 FPS is accepted instead of 60 FPS.

### Device Recovery (Split-Key Architecture)

If a device is lost, biometric templates are recoverable:

- **Key Part A** — Derived from the user's 8-word Recovery Code shown once at enrollment.
- **Key Part B** — Stored on V-Ident's server, associated with an anonymous ID (no PII).

Neither key alone decrypts the template. Full recovery on a new device takes under 3 minutes: enter Recovery Code → server sends Key B → template decrypted locally → new hardware attestation generated → old attestation invalidated.

### ZK-Proof Privacy (Per-Service Nullifiers)

Each ZK-proof contains a **service-specific nullifier**: a hash of the user's identity commitment combined with the service's unique domain ID. The same user gets a different nullifier for their bank, telecom, and government portal — preventing cross-service tracking while enforcing per-service uniqueness.

---

## Enrollment Flow

Enrollment is a one-time, 8-step process. No video or face images ever leave the device.

| Step | What Happens | Privacy / Security Note |
|---|---|---|
| 1. Device Profiling | 3-sec benchmark: camera FPS, NPU throughput, TEE capability, RAM, root status | Stored locally; only tier classification (T1/T2/T3) sent to server |
| 2. Accessibility Declaration | User optionally selects accessibility profile | Encrypted in Secure Enclave; never sent to server |
| 3. Guided 12-Sec Capture | Front camera captures physiological signals. Instruction: *"Keep face in oval and follow the white dot for 12 seconds"* | All processing on-device. No video transmitted. |
| 4. Template Extraction | ML models extract a numeric feature vector — not a biometric image | Feature vector stored in Secure Enclave encrypted with device key |
| 5. Recovery Key Generation | 8-word recovery passphrase generated and shown **once** | Key Part A of Split-Key Backup. V-Ident never sees this. |
| 6. Hardware Attestation | Device generates keypair; public key + attestation certificate sent to V-Ident server | Private key never leaves Secure Enclave |
| 7. PoP Credential Issuance | W3C Verifiable Credential issued linked to anonymous DID | No name, no face data on server — only device attestation + tier + enrollment timestamp |
| 8. Encrypted Backup Upload | Template encrypted with split key; encrypted blob stored on server | Neither server alone nor user alone can decrypt |

---

## Per-Transaction Verification Flow

| Phase | Action | Time (T1 / T2 / T3) |
|---|---|---|
| **Trigger** | Calling app sends SDK payload: `{ risk_level, service_id, nonce }` | ~0 ms |
| **Signal Selection** | TASS-V reads device tier + risk level + accessibility profile → computes mandatory signal set | ~10 ms |
| **Cascade Execution** | Signals run sequentially; early exit if threshold met before all signals complete | 2–4s / 4–7s / 6–9s |
| **Trust Score Compute** | Bayesian Log-Odds Fusion + zone classification | ~50 ms (on-device) |
| **Green Zone** | ZK-proof generated and sent to verifier server | ~200 ms |
| **Amber Zone** | Secondary Challenge triggered (different modality); re-scored; if still Amber/Red → queue | +2–4 seconds |
| **Red Zone** | Case queued for async review; user notified; partial credential for low-risk fallback | User wait: 0–4 hours |

### Cascade Order — Tier 1 Example

```
Step 1: Hardware Attestation       [~50ms, no camera]
        └─ FAIL → Reject immediately

Step 2: Visual Frequency Forensics [~800ms, 3MB model, 15 FPS]
        └─ VFF_score < 0.3 → Reject (deepfake artifact)

Step 3: Cognitive Response Timing  [~1200ms, rule-based, no ML]
        └─ Partial TS ≥ R1 threshold → APPROVE (early exit)

Step 4: (Tier 2+ only) Micro-tremor / rPPG [if still needed]

─────────────────────────────────────────────
Total time  Tier 1, R1:  2.0–3.5 seconds
            Tier 3, R3:  7–9 seconds
```

---

## Tech Stack

### On-Device

| Component | Technology |
|---|---|
| **iOS ML Runtime** | Core ML 7 + BNNS (Tier 1 CPU fallback); Apple Neural Engine (Tier 3) |
| **Android ML Runtime** | TensorFlow Lite 2.15 with NNAPI delegate (NPU) + CPU fallback; ML Kit for device profiling |
| **VFF Model** | MobileNetV4-Small (INT8 quantized, 3.2 MB); frequency-domain features via on-device FFT; runs at 15 FPS |
| **rPPG Model** | Custom CNN (EfficientNet-B0 backbone, 8.5 MB INT8); adaptive skin-tone pre-filter |
| **Micro-saccade Model** | MediaPipe Face Mesh (T3 only) + custom temporal LSTM on eye landmarks (18 MB); Apple Vision on iOS |
| **ZK-Proof Library** | SnarkJS (WebAssembly / React Native); gnark (Go / native); Groth16 proof ~250 bytes |
| **Secure Storage** | iOS: `kSecAttrTokenIDSecureEnclave`; Android: Android Keystore + Titan M (StrongBox) |
| **Hardware Attestation** | iOS: DeviceCheck + App Attest API; Android: Play Integrity API |
| **Root Detection** | SafetyNet + custom binary checks + libc hooks detection + `/proc/self/maps` analysis |
| **Recovery Crypto** | AES-256-GCM (template encryption); PBKDF2 (200K iterations) for Recovery Code → Key Part A |

### Server-Side (Minimal by Design)

| Component | Technology |
|---|---|
| **API Layer** | Go 1.22; gRPC (SDK) + REST (web portals) |
| **ZK-Proof Verifier** | Stateless Go service; Groth16 proof verified in ~2 ms; horizontally scalable |
| **Attestation Validator** | Apple DeviceCheck + Google Play Integrity APIs; results cached per device (24-hr TTL) |
| **Credential Issuer** | W3C DID + Verifiable Credentials; `did:key` (Phase 1); VC signed with Ed25519 |
| **Human Review Queue** | Kafka-based async queue; officer workstations as consumers; evidence auto-deleted after 90 days (DPDP Act) |
| **Encrypted Template Backup** | PostgreSQL (encrypted at rest); Key Part B associated with anonymous user ID (hash of attestation pubkey); no PII |
| **XAI Explanation Engine** | LIME + custom attribution rules; generates plain-language explanation for officer dashboard |
| **Databases** | PostgreSQL (credentials, audit logs) · Redis (nonce cache, rate limiting) · S3-compatible (review evidence) |
| **Infrastructure** | AWS Mumbai `ap-south-1` (India data sovereignty); auto-scaling ECS; no server-side GPU required |

---

## Economic Model

| Cost Component | Per Verification |
|---|---|
| On-device processing | ₹0 (user's device) |
| ZK-proof verification (server) | ₹0.08 |
| Attestation API call (cached 24hr) | ₹0.12 |
| Human review (3% of cases blended) | ₹0.42 |
| Infrastructure / CDN / S3 | ₹0.15 |
| **TOTAL COGS** | **~₹0.77 per verification** |
| **Revenue (SaaS)** | **₹3–8 per verification** |
| **Gross Margin** | **75–90%** |

For context, traditional Video KYC costs ₹10–50 per verification. At 1 million verifications/day (achievable by Year 2 with two large bank partners), daily revenue is ₹3–8M against COGS under ₹0.8M — enabled by 97% full automation.

---

## Regulatory Compliance

| Regulation | V-Ident TASS-V Approach |
|---|---|
| **DPDP Act 2023 — Data Minimization** | No raw biometric data stored anywhere. Feature vectors are processed derivatives. Forensic evidence auto-deleted after 90 days. |
| **DPDP Act — Purpose Limitation** | PoP credential proves only *"live unique human."* No inference about health, mood, or identity beyond verification. |
| **RBI FREE-AI — Explainability** | Every Red Zone decision has a machine-generated XAI explanation in plain English/Hindi. Officers must record reasoning. Full audit trail maintained. |
| **RBI FREE-AI — Human Override** | Human reviewers hold full override authority. AI score is advisory, not final, for Red Zone cases. |
| **UIDAI — Aadhaar** | V-Ident does not replace Aadhaar. It provides complementary liveness assurance for digital interactions and can be linked to Aadhaar via PoP credential binding. |
| **Rights of Persons with Disabilities Act, 2016** | Accessibility profiles ensure no signal exclusion without an equivalent alternative. No user is penalized for a disability. |
| **India Data Sovereignty** | All data processed and stored in AWS Mumbai `ap-south-1`. No biometric data crosses national borders. |

---

## Roadmap

| Phase | Timeline | Deliverables |
|---|---|---|
| **Phase 0 — Validation** | Month 1–3 | Single-signal MVP: VFF-only Android app. Benchmark against FaceForensics++ and Celeb-DF v2. Target: > 93% F1 score. Open-sourced on GitHub. IIIT faculty academic review. |
| **Phase 1 — Core MVP** | Month 3–8 | Full TASS-V for Tier 1 and Tier 2. ZK-proof output. Human review queue. Pilot with 1 fintech partner (target: DigiLocker-linked lending app). RBI Innovation Sandbox application. |
| **Phase 2 — Scale** | Month 8–18 | Tier 3 signals (micro-saccade). Accessibility profiles. Split-key recovery. W3C Verifiable Credential issuance. Banking and telecom API integrations. 1M verifications/day capacity. |
| **Phase 3 — Ecosystem** | Month 18–36 | Optional blockchain plugin (Polygon ID-compatible). Government PoP partnerships (UIDAI integration). Cross-border GDPR compliance. AR/VR identity for metaverse contexts. |

---

## What's Excluded from Phase 1

These are intentional scope-control decisions, not oversights:

- **Blockchain / Smart Contracts / Soulbound Tokens** — added in Phase 3 as an optional plugin only for Web3 use cases. Core PoP credential uses W3C Verifiable Credentials (simpler, faster, equally interoperable).
- **Homomorphic Encryption** — computationally too expensive for mobile in 2026. Replaced by ZK-proofs, which offer the same privacy guarantee ~1000× faster.
- **Decentralized Storage (IPFS, Ceramic)** — replaced by server-side encrypted storage (simpler, more reliable, and auditable under the DPDP Act).
- **Micro-saccade Tracking on Tier 1/2** — insufficient compute; signal is simply excluded and weights re-normalized.
- **Voice-Based Deepfake Analysis** — covered by the calling service's own audio pipeline; outside V-Ident's Phase 1 scope.

---

## Summary

> TASS-V is a Tier-Adaptive, Risk-Calibrated, Accessibility-First identity verification engine that solves the deepfake crisis without requiring expensive hardware, creating a privacy honeypot, or building an unscalable human review bottleneck. It achieves **< 3% human review rate**, **sub-₹1 COGS per verification**, and **full compliance with RBI FREE-AI and the DPDP Act** — launchable in 8 months, profitable by Month 18.

---

*Document prepared by **Team PsychoBytes** — Indian Institute of Information Technology, Pune — February 2026*
