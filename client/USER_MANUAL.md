# GITOFFICE User Manual

**Version 1.0** | Last Updated: June 2026

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Interface Overview](#user-interface-overview)
4. [Core Features by Role](#core-features-by-role)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## Introduction

### What is GITOFFICE?

GITOFFICE is a comprehensive web-based application designed to streamline administrative operations at KLS-GIT The system provides a unified platform for:

- **Leave Management**: Apply for leaves, track status, and manage approvals
- **Ticket System**: Raise support tickets and track resolution progress
- **Biometric Data**: View daily and monthly attendance records
- **Staff Administration**: Manage employee records, departments, and entitlements (for administrative roles)

### Who Should Use This Manual?

This manual is intended for all end-users of GITOFFICE, including:
- Teaching and Non-Teaching Staff
- Heads of Department (HOD)
- Principal and Deans
- Registrar
- Establishment Office Staff
- Super Administrators

---

## Getting Started

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- Valid institutional credentials

### Logging In

1. Navigate to the GITOFFICE login page
2. Enter your registered email address
3. Enter your password
4. Click **Login** to access your dashboard

**Tip**: Use the eye icon next to the password field to toggle password visibility.

### First-Time Login

If you're logging in for the first time, you may be required to:
1. Complete any pending profile setup
2. Change your temporary password via **Change Password** in the user menu

---

## User Interface Overview

### Header Navigation

The header appears at the top of every page and contains:

| Element | Description |
|---------|-------------|
| **Logo** | Displays the KLS-GIT institution logo |
| **Tickets Button** | Quick access to your tickets (if applicable to your role) |
| **Notifications Bell** | Shows unread notifications with a red badge indicator |
| **User Profile** | Click to access account settings and logout |

### Sidebar Navigation

The sidebar provides role-based navigation. Different roles see different menu options:

#### Desktop View
- Click the **• • •** button in the top-right of the sidebar to toggle between expanded and collapsed views
- A blue highlight indicates the current page

#### Mobile View
- Tap the **Menu** button at the top of the screen to open/close the navigation
- The sidebar slides in from the left side

### Notification System

Notifications appear as:
- A red badge with a count on the bell icon in the header
- Automatic refresh every 30 seconds
- In-app notifications for actions and system messages

---

## Core Features by Role

### All Users - Tickets

All non-Super Admin users can access the ticket system to raise and track support requests.

#### Viewing Tickets

1. Click **Tickets** in the header or navigate to `/tickets`
2. The dashboard displays four summary cards:
   - **Ticket New**: Recently submitted tickets awaiting review
   - **Ticket Pending**: Tickets in progress
   - **Ticket Resolved**: Completed tickets
   - **Total Tickets**: All tickets combined

#### Searching Tickets

Use the search bar to filter tickets by:
- Issue title
- Status
- Staff name
- Raised date

#### Raising a New Ticket

1. Click **Raise Ticket** button
2. Fill in the form:
   - **Issue Title**: Brief description of the problem
   - **Description**: Detailed explanation
   - **Attachment**: Optional images (click or drag-and-drop)
3. Click **Add** to submit

#### Viewing Ticket Details

Click the **View** (eye) icon on any ticket to see:
- Full conversation history
- All attachments
- Current status
- Reply form (if ticket is not resolved)

#### Updating Ticket Status

Support staff can update ticket status:
1. Select a new status from the dropdown (New, Pending, Resolved)
2. Click **Update Status**

#### Editing a Ticket

While viewing the tickets list:
1. Click the **Edit** (pencil) icon
2. Modify the title or description
3. Add new attachments if needed
4. Click **Update**

#### Deleting a Ticket

1. Click the **Delete** (trash) icon
2. Confirm deletion in the popup dialog

---

### Teaching & Non-Teaching Staff

Access your personalized dashboard at `/teaching` (Teaching) or `/nonteaching` (Non-Teaching).

#### Staff Dashboard Menu

| Menu Item | Description |
|-----------|-------------|
| **My Dashboard** | Overview and quick actions |
| **Department History** | View department assignment history |
| **My Designation and Payscale** | View salary and designation details |
| **My Association** | Professional association information |
| **My Qualification** | Academic and professional qualifications |
| **Salary** | Salary-related information |
| **Leave Application** | Apply for and manage leaves |
| **BIOMETRIC** | Attendance data (Daily/Monthly) |

#### My Leave Statistics

View your leave balance at a glance:
- **Entitled**: Total leave days allocated for the year
- **Availed**: Days already used
- **Balance**: Remaining available days

#### Applying for Leave

1. Navigate to **Leave Application** → **Apply Leave**
2. Select **Leave Type** from the dropdown
3. Choose **Start Date** and **End Date**
4. For Casual Leave (CL), select **CL Type**:
   - **Full Day**: Entire day leave
   - **Morning**: First half leave
   - **Afternoon**: Second half leave
5. Select an **Alternate Staff** from the dropdown
6. Enter a **Reason** for leave
7. Add optional **Attachments**
8. Click **Submit**

#### Leave Calendar View

The calendar shows:
- **Red**: Holidays
- **Yellow**: Restricted Holidays (RH)
- **Orange**: 1st and 3rd Saturdays
- **Blue**: Today's date
- **Indigo**: Pending leave applications
- **Green**: Approved leaves
- **Red (border)**: Rejected leaves

Click on any date to apply for leave on that day.

---

### Head of Department (HOD)

Access your dashboard at `/hod`.

#### HOD Dashboard Menu

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | Department overview |
| **Department Overview** | View department statistics |
| **My Staff** | View staff under your department |
| **Leave Management** | Manage leave applications |
| **BIOMETRIC** | Attendance data |
| **Faculty Recruitment** | View recruitment applications |

#### Managing Leave Applications

In the Leave Application section:

**Reviewing Applications**:
1. Applications are grouped by leave type (CL, ML, EL, etc.)
2. Each application shows: Application ID, Date, Staff Name, Leave Dates, Days, Alternate, Status
3. Use the month/year dropdowns to filter applications

**Taking Action**:
- **Recommend**: Approve the application for next-level review
- **Reject**: Decline the application (requires confirmation)
- Use checkboxes to select multiple applications for bulk action

**Calendar View**:
- Visual overview of all leave applications in your department
- Click dates to see detailed leave information

---

### Principal/Dean

Access your dashboard at `/principal` (Principal) or `/dean_admin` (Dean).

#### Principal/Dean Menu

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | Institute overview |
| **Staff** | View all staff records |
| **Leave Management** | Advanced leave approval |
| **BIOMETRIC** | Institute attendance data |

#### Advanced Leave Approval

Additional features compared to HOD:
- View **All Leaves Application List** tab for complete history
- Approve or reject leaves based on:
  - Additional designation alternates
  - Leave duration (>4 days for Principal approval)
- Bulk approval/rejection capabilities

---

### Registrar

Access your dashboard at `/registrar`.

#### Registrar Menu

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | Main dashboard |
| **Department Overview** | Department management |
| **My Staff** | Redirects to Staff section |
| **Staff** | View and manage staff records |
| **Leave Management** | Holiday and leave oversight |
| **BIOMETRIC** | Attendance data |

---

### Establishment Office

Access your dashboard at `/establishment`.

#### Establishment Menu

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | Establishment overview |
| **Associations** | Professional associations |
| **Departments** | Department management |
| **Designations** | Job designations |
| **Institutions** | Institution records |
| **Leave Management** | Complete leave administration |
| **Qualifications** | Qualification records |
| **Religions & Castes** | Religious/caste categories |
| **Staff** | Staff master records |
| **BIOMETRIC** | Attendance data |

#### Leave Management Sub-menu

| Option | Description |
|--------|-------------|
| **Leaves** | All leave records |
| **Entitlement** | Leave entitlement configuration |
| **Holiday RH List** | Manage holidays and restricted holidays |
| **Leave Calendar** | Visual calendar of all leaves |
| **Leave List** | Detailed leave listing |

---

### Super Administrator

Access your dashboard at `/super-admin`.

#### Super Admin Menu

| Menu Item | Description |
|-----------|-------------|
| **Dashboard** | System overview |
| **Staff** | All staff records |
| **Tickets** | All tickets system-wide |
| **Users** | User management |
| **Leave Management** | IT Cell leave oversight |
| **Coordinators** | Coordinator assignments |
| **BIOMETRIC** | All attendance data |

---

## User Profile & Account Management

### Accessing Your Profile

1. Click your profile avatar/name in the header
2. The profile dropdown shows:
   - Email address
   - Role designation
   - **Change Password** option
   - **Logout** button

### Changing Your Password

1. Click **Change Password** from the profile menu
2. Enter current password
3. Enter new password
4. Confirm new password
5. Submit the changes

### Logging Out

1. Open the profile menu
2. Click **Logout**
3. Confirm if prompted

---

## Notification System

### Receiving Notifications

- Notifications appear automatically in the header bell icon
- Red badge indicates unread count
- Click the bell to view notification details
- Notifications auto-refresh every 30 seconds

### Notification Types

| Type | Meaning |
|------|---------|
| **Success** | Action completed successfully |
| **Error** | Action failed - review error message |
| **Info** | General information |

---

## Troubleshooting

### Common Issues and Solutions

#### Cannot Login

| Problem | Solution |
|---------|----------|
| **Invalid credentials error** | Verify email and password. Ensure Caps Lock is off. |
| **Account locked** | Contact Super Admin to unlock your account |
| **Forgot password** | Click **Forgot Password** on the login page and follow email instructions |

#### Leave Application Issues

| Problem | Solution |
|---------|----------|
| **"You must apply at least N days in advance"** | Apply earlier. Check the prior intimation requirement for your leave type |
| **"You do not have enough leave balance"** | Check your leave statistics. Apply for fewer days or a different leave type |
| **"Leave dates cannot overlap"** | Select dates that don't conflict with existing approved leaves |
| **"You must wait at least N days between two such leaves"** | Leave gap requirement applies. Wait required days before re-applying |

#### Ticket System Issues

| Problem | Solution |
|---------|----------|
| **Cannot raise ticket** | Ensure all required fields (Title, Description) are filled |
| **Attachments not uploading** | Check file format (images only) and file size limits |
| **Ticket not updating** | Refresh the page or check your internet connection |

#### Interface Issues

| Problem | Solution |
|---------|----------|
| **Sidebar not visible on mobile** | Tap the **Menu** button at the top of the screen |
| **Content not loading** | Refresh the page. Check network connection |
| **Calendar dates appear incorrect** | Verify you're viewing the correct month/year |

### Browser Compatibility

Recommended browsers:
- Google Chrome (latest version)
- Mozilla Firefox (latest version)
- Microsoft Edge (latest version)
- Safari (latest version)

For best experience:
1. Enable JavaScript in your browser
2. Allow cookies from the GITOFFICE domain
3. Disable ad blockers for the site

### Clearing Cache

If experiencing persistent issues:
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Choose time range (e.g., "Last hour")
4. Click **Clear data**

---

## FAQ

### How do I know my leave balance?

Navigate to **Leave Application** → **My Leave Statistics** to view your current leave entitlements and balances for the selected year.

### Can I cancel a leave application?

Once submitted, leave applications cannot be directly cancelled. Contact your HOD or the Establishment office for assistance.

### What does "Restricted Holiday (RH)" mean?

A Restricted Holiday is an optional holiday that can be taken instead of another holiday. Only one RH can be availed per year.

### How are 1st and 3rd Saturdays marked?

These special working Saturdays are highlighted in orange on the leave calendar. They may have specific leave rules applied.

### Who approves my leave?

Leave approval follows this workflow:
1. **HOD** reviews and recommends/rejects first
2. **Dean/Principal** provides final approval
3. **Establishment** maintains overall records

### What if I don't have an alternate for my leave?

Select "No alternate available" or contact your HOD if no suitable staff is in the dropdown.

### Can I apply for leave retrospectively?

Leave rules may require advance application. Check your institution's prior intimation policy for the specific leave type.

---

## Contact Support

For technical issues not covered in this manual:

1. Raise a ticket through the application
2. Contact the IT Support team at your institution
3. Email: support@kls-git.edu

---

*This manual is maintained by the GITOFFICE development team. For feature requests or documentation updates, please contact the system administrator.*