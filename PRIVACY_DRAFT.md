# Privacy and Data Handling — Draft

**Scaffolded Learning Platform**
Last updated: April 2026
Status: Draft — not yet reviewed by a legal professional

> This document is written for school leaders, parents, and students. It explains in plain language what data this platform collects, why, and how it is protected. If something is unclear, please get in touch (contact details at the bottom).

---

## 1. What data we collect

We only collect what we need for the platform to work. There is no advertising, no tracking, and no profiles built for commercial purposes.

| Data                     | Where it comes from                                          |
| ------------------------ | ------------------------------------------------------------ |
| Email address            | Entered by the student or teacher at login                   |
| Display name             | Entered by the student if they choose to provide one         |
| Student responses        | Text typed into lesson slides during a session               |
| Teacher-authored content | Lesson slides, questions, and prompts created by the teacher |
| Session metadata         | Login times and lesson completion status                     |

We do **not** collect device identifiers, location data, browsing history, or any information outside the platform.

---

## 2. Why we collect it

Each piece of data has a specific purpose:

- **Email address** — We use a "magic link" login system. Instead of a password, we send a one-time link to your email. We do not store passwords. Ever.
- **Display name** — So the teacher and student can identify work in a readable way. Optional.
- **Student responses** — Saved automatically so students can return to a session and pick up where they left off. Their finished work is assembled into a paragraph response they can take away.
- **Teacher content** — Stored so lessons are available to run with any class, any time.
- **Session metadata** — Lets the teacher see which students have completed a lesson, so they can offer support where needed.

---

## 3. Who can see student data

This is the most important section. Here is exactly who can and cannot see student work.

**Can see:**

- The **student** can see their own responses and download them at any time.
- The **teacher** can see the responses of students in their own class. They cannot see data from other classes or schools.
- The **platform administrator** (Ben Harvey) can access data for the purposes of fixing technical problems. This access is logged.

**Cannot see:**

- **No AI service** — Student data is never sent to Claude, ChatGPT, Anthropic, OpenAI, or any other AI model or API. The platform is a structured writing tool. It does not use AI to process, generate, or assess student responses.
- **Other students** — Students cannot see each other's individual work unless the teacher explicitly shares it as part of a class activity.
- **Other teachers or schools** — Data is isolated per class.

**Third-party service providers** (under data processing agreements):

- **Supabase** — Hosts the database (Sydney, Australia region). Used only to store and retrieve platform data.
- **Resend** — Delivers the magic link login emails. Receives only the recipient's email address.
- **Vercel** — Hosts the web application. Does not have access to database contents.

None of these providers may use student data for their own purposes. They act only on our instructions.

---

## 4. How long we keep data

We do not hold on to data longer than necessary.

- **Default retention** — Student responses are kept for **6 months** from the date of the lesson.
- **Advance notice** — One week before any data is due to expire, students and their teacher receive an email reminder with a download link.
- **Teacher extensions** — Teachers can extend the retention period for a unit or individual lesson, for example if students need their work for an end-of-year task.
- **Real deletion** — When data is deleted, it is permanently removed from the database and all backups within 30 days. It is not merely hidden or archived.

---

## 5. Your rights

You have clear, practical rights over your data.

**Access**
Any student or teacher can download all of their data at any time — no need to ask. Export formats: `.docx` (for written responses) and `.csv` (for session metadata).

**Correction**
Students can edit any of their own responses directly in the platform at any time.

**Deletion**
Any user can request permanent deletion of their account and all associated data. Requests are processed within **30 days**. After deletion, nothing remains — not in active storage, not in backups.

To exercise any of these rights, contact us at the address below. You do not need to provide a reason.

---

## 6. Legal frameworks

This platform has been designed with the following frameworks in mind. We are not lawyers — a qualified privacy professional will review this before the platform goes live with real students.

**Australian Privacy Principles (APPs)**
The platform is designed to comply with the APPs under the _Privacy Act 1988_ (Cth), in particular:

- **APP 1** — We have an open, clear privacy policy (this document).
- **APP 3** — We collect only what is necessary for the stated purpose.
- **APP 5** — Users are informed about what is collected and why at the point of collection.
- **APP 6** — Data is only used for the purpose it was collected.
- **APP 11** — Data is protected from misuse, interference, and loss.
- **APP 12** — Users can access their own data on request.

**General Data Protection Regulation (GDPR)**
For any users in the European Union or UK, we apply GDPR principles: lawful basis for processing, data minimisation, right to erasure, and right of access. The magic link system avoids storing passwords, reducing the risk profile considerably.

**California Consumer Privacy Act (CCPA)**
For users in California, we apply equivalent protections: the right to know what data is held, the right to delete it, and the prohibition on selling personal data. We do not sell data to anyone.

**Family Educational Rights and Privacy Act (FERPA)**
For any US-based schools using the platform, we treat all student education records in line with FERPA requirements, including restricting disclosure to authorised educators and keeping records accessible to parents of students under 18.

---

## 7. Contact

Questions, requests, or concerns about privacy:

**Ben Harvey**
📧 [your-email@example.com] ← _replace before publishing_

Response time: within 5 business days for general enquiries; within 30 days for formal data requests.

---

_This is a working draft. It will be reviewed by a qualified privacy professional and updated before any student data is collected on the live platform. School leaders who wish to use this platform should request the final reviewed version before granting student access._
