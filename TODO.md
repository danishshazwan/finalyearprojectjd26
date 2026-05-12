# SMARTCONVO FYP — Implementation Plan

## Phase 0 — Confirm constraints
- [x] Backend PHP/API endpoints appear empty/unimplemented in current repo
- [x] Decision: implement SMARTCONVO fully frontend-first using LocalStorage simulation
- [ ] Add fetch wrappers with graceful fallback so later PHP can be plugged in without redesign

## Phase 1 — Shared assets
- [ ] Create `assets/js/smartconvo-storage.js` (LocalStorage schema + helpers)
- [ ] Create `assets/js/sca-chatbot-ui.js` (floating SCA bubble + FAQ/queue explanation/navigation)
- [ ] Create `assets/js/smartconvo-ui-anim.js` (smooth transitions, toasts, step animations)

## Phase 2 — index.html (landing)
- [ ] Replace “tracks” with IKM Lumut course list
- [ ] Add animated awards sections:
  - [ ] Anugerah Akademik
  - [ ] Anugerah Bukan Akademik
  - [ ] Anugerah Pelajar Terbaik (Jan–Jun & Jul–Dec)
- [ ] Add login entry links: Guest / Student / Admin routing preserved
- [ ] Add Register + Forgot password links

## Phase 3 — guest/guest.html
- [ ] Real-time queue stepper: Duduk → Beratur → Verified → Naik Pentas → Selesai
- [ ] Show face scan name list (simulation) + backup queue list if face fails
- [ ] Live progress bar + ceremony countdown
- [ ] Realtime notifications simulation
- [ ] Voting pelajar terbaik session + results reflect admin locks
- [ ] Award gallery & best student card
- [ ] Add floating SCA chatbot bubble

## Phase 4 — student/student.html
- [ ] Login simulation: university email + password + student ID
- [ ] Prevent self-registration (only seed/admin add)
- [ ] Profile right panel: view + update data
- [ ] Face verification simulation (camera/upload) → VERIFIED/NOT VERIFIED
- [ ] Upload achievement certificate verification simulation
- [ ] Auto-generate and display queue number
- [ ] Submit non-academic achievement
- [ ] Integrate SCA chatbot bubble

## Phase 5 — admin/admin.html
- [ ] Dashboard KPI cards:
  - [ ] Total students
  - [ ] Total verified
  - [ ] Total awards
  - [ ] Total pending
  - [ ] Total guests active
- [ ] Course management using IKM Lumut courses
- [ ] Student management (add/edit/delete) in simulation
- [ ] Queue management: advance queue states + monitor face verification
- [ ] Award assignment system + gallery population
- [ ] Voting control: lock/unlock, reset session, view results realtime
- [ ] Session control: Jan–Jun & Jul–Dec
- [ ] Charts/analytics simulation

## Phase 6 — Validation
- [ ] Smoke test in browser: routing, queue progression, voting, face verify, admin dashboard updates
- [ ] Responsive layout check on mobile sizes

