# MediQU

**A clearer picture of care before you go.**

MediQU is a care-navigation platform designed to help people find clinics, understand what to expect from a visit, and plan around their needs. It brings clinic search, patient-reported visit times, and personal visit planning into one accessible experience.

**Visit the website: [www.mediqu.com](https://www.mediqu.com)**

## What MediQU offers

- **Find relevant care:** Search clinic information and filter by location, specialty, insurance, spoken language, and visit type.
- **Understand the visit:** View available timing estimates and their confidence, with patient reports contributing to a shared picture of the care experience.
- **Plan ahead:** Save clinics and organize visit plans with travel time, arrival targets, and suggested departure times.
- **Keep a personal account:** Manage saved information and optional profile details, with email verification, password recovery, and account-deletion controls.
- **Use a familiar language:** Explore a responsive interface available in English, Spanish, Chinese, Arabic, Polish, Gujarati, and Hindi.

Clinic search depends on approved directory records, and timing estimates require enough recent qualifying reports. Saved visit plans help organize a visit; they are not confirmed clinic reservations.

## How it is built

MediQU uses **React and TypeScript** for its interactive interface, with **Vite** preparing the production frontend. A **Node.js API** handles application logic and connects to a persistent **SQLite database** for accounts, profiles, saved plans, and reports. **Better Auth** manages authentication, and **Resend** delivers verification and password-reset emails.

The application runs on **Render**, serving the frontend and backend together over HTTPS. GitHub holds the source code, and updates pushed to the `main` branch trigger an automatic build and deployment. This keeps local development separate from the public website while making releases straightforward.
