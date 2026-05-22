# Expo Go SDK 버전 불일치 오류

## 문제 상황

Expo Go에서 QR 스캔 시 "Project is incompatible with this version of Expo Go" 오류 발생.

## 원인

프로젝트가 SDK 56 (2026-05-21 출시)인데, 앱스토어의 Expo Go는 아직 SDK 54를 지원. SDK 56용 Expo Go는 TestFlight 베타로만 배포 중.

## 최종 해결법

프로젝트를 SDK 54로 다운그레이드:
```
npx expo install expo@^54.0.0
npm install --legacy-peer-deps [SDK 54 compatible packages]
npx expo install --fix
```
peer dependency 충돌(`expo-router` ↔ `react-server-dom-webpack`) 때문에 `--legacy-peer-deps` 필요.

## 이력서 소재 한 줄

SDK 버전 불일치 원인을 Expo 릴리즈 노트로 진단하고 의존성 충돌을 해결하며 다운그레이드 적용
