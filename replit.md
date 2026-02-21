# V-Ident - Real-Time Identity Verification System

## Overview
V-Ident (TASS-V) is a Tier-Adaptive, Risk-Calibrated, Accessibility-First identity verification mobile app. It uses psychophysiological signal fusion to detect deepfakes and verify human presence without requiring expensive hardware.

## Architecture
- **Frontend**: Expo React Native with file-based routing (expo-router)
- **Backend**: Express.js on port 5000 with ML model pipeline
- **ML Models**: Server-side signal analysis (VFF, CRT, Micro-tremor, rPPG)
- **State**: AsyncStorage for local persistence, in-memory storage on backend

## Key Features
- Multi-step enrollment with camera integration
- Cascading ML signal verification (Visual Frequency Forensics, Cognitive Response Timing, IMU, rPPG)
- Bayesian Log-Odds Trust Score computation
- Three-zone classification (Green/Amber/Red)
- Human-in-the-loop review system for Amber/Red zones
- Video meeting scheduling for flagged cases
- Accessibility profiles (Standard, Motor, Visual, Neurological, Elderly)
- Device tier profiling (T1 Budget, T2 Mid, T3 Premium)

## Project Structure
```
app/
  _layout.tsx          - Root layout with providers
  index.tsx            - Welcome screen
  enrollment.tsx       - Multi-step enrollment flow
  dashboard.tsx        - Main dashboard
  verification.tsx     - Verification with camera + sensors
  result.tsx           - Trust score result (Green/Amber/Red)
  review-status.tsx    - HITL review status

components/
  GradientButton.tsx   - Reusable gradient button
  TrustScoreGauge.tsx  - Visual trust score gauge
  SignalCard.tsx       - Signal analysis card

contexts/
  VerificationContext.tsx - Shared verification state

server/
  ml/vff.ts            - Visual Frequency Forensics model
  ml/crt.ts            - Cognitive Response Timing model
  ml/micro-tremor.ts   - Micro-tremor IMU analysis
  ml/rppg.ts           - rPPG Heartbeat detection
  ml/trust-score.ts    - Bayesian Trust Score fusion
  routes.ts            - API endpoints
  storage.ts           - In-memory data storage
```

## Color Palette
- Background: #0D1224 (deep dark blue)
- Primary Cyan: #00DDEB
- Primary Fuchsia: #C94CFF
- Text Primary: #FFFFFF
- Text Secondary: #80E0FF
- Success: #00E5A0 (Green zone)
- Warning: #FFB020 (Amber zone)
- Danger: #FF4C6E (Red zone)

## Recent Changes
- February 21, 2026: Initial build with full frontend, backend, ML models
