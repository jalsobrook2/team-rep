# Deliverable Four - User Workflows & App Wireframe

**Collaborators:** Ethan Sexton

**Branch:** `d4-ethan-sexton`

**Date Submitted:** September 21, 2025

## Low-Fidelity Wireframes

_See attatched image_

## Fundamental Requirements

- Agents (those who are hiring/hosting) should be able to:
  - Easily create new postings
  - Rate previously hired workers

- Workers should be able to:
  - Easily view job listings
    - Extensive filtering (location, frequency, pay, etc.)
  - Rate previous employers
  - Edit their profile/automated resume


## User Stories and Call Requirements

- As a new user, I need to be able to create an account as either a Worker or an Agent, in order to start using the platform.
    - Check for email uniqueness.
    - Create a new user record with role (Worker or Agent).
    - Initialize default profile settings based on role.

- As a registered user, I need to be able to log in securely, in order to access my dashboard and interact with the app.
    - Validate the provided credentials against stored user data.
    - Fetch role and profile information.
    - Create or refresh an active session.

- As a Worker, I need to be able to view the jobs I’ve applied to and the ones I’m working on, in order to keep track of my commitments.
    - Retrieve job applications made by the user.
    - Retrieve jobs marked as “in progress” or “accepted”.
    - Return relevant job data to populate the dashboard.

- As an Agent, I need to be able to see all my job postings, in order to manage and track responses to them.
    - Fetch all job listings created by the agent.
    - Retrieve applicant information and job status.
    - Show open, closed, and completed postings.

- As a Worker looking for opportunities, I need to be able to browse job postings that match my preferences, in order to find jobs I can actually do.
    - Query for active job postings.
    - Filter down results based on location, time frame, duration, and skill match.
    - Return results in list or card format.

- As a Worker, I need to be able to apply to a job, in order to express interest and get selected.
    - Check for existing applications to avoid duplicates.
    - Create a new application record linked to the job and worker.
    - Notify the Agent of the new application.

- As an Agent, I need to be able to create a new job posting, in order to find suitable Workers or volunteers.
    - Save a new job record with all required details.
    - Link the job to the Agent's account.
    - Set job status to “open” and make it visible in Explore.

- As a user, I need to be able to receive notifications about job applications or status changes, in order to stay updated.
    - Create a new notification event.
    - Fetch unread or recent notifications for the user.
    - Mark notifications as read after user views them.

- As a user, I need to be able to edit my profile details, in order to keep my skills and preferences current.
    - Update profile information such as name, contact, and role-specific details.
    - Save new skill tags and preferences.
    - Sync changes with Explore/job matching.

- As a Worker, I need to be able to mark a job as completed, in order to indicate that I’ve finished my task.
    - Update job or application status to “completed”.
    - Trigger a notification to the Agent.

- As a Worker, I need to be able to withdraw a job application, in order to free myself up for other opportunities.
    - Locate and delete or deactivate the application.
    - Notify the Agent of the withdrawal.

- As an Agent, I need to be able to close a job posting, in order to stop accepting new applications.
    - Change the job status to “closed” or “inactive”.
    - Optionally notify current applicants of the status change.

- As a Worker exploring new jobs, I need to be able to filter postings, in order to quickly find what suits my location, skills, and availability.
    - Apply filters such as distance, time frame, skill tags, and job duration.
    - Rank or sort results by fit and proximity.

- As a user, I need to be able to view my own profile, in order to understand what information the app has stored about me.
    - Retrieve personal and role-specific profile data.
    - Display skills, preferences, and availability in a readable format.

- As a Worker, I need to be able to update my availability, in order to avoid being matched with jobs I can’t take.
    - Save new availability data to the Worker’s profile.
    - Use updated availability in future job matches and filters.

## User Workflows

- User starts on a login page, prompting them to choose to "Sign in as Agent", "Sign in as Worker", or "Log In".
- After they sucessfully log in, they will be brought to a dashboard page.
    - If they are a Worker, they will see postings that they have applied for and ongoing jobs. Common actions will be below each (withdraw, reach out)
    - If they are an Agent, they will see their current postings. Common actions will be listed below (clone posting, edit posting)
    - Regardless of role, there will be a notification pane showing important information (responses to postings, )
- There will be a row of icongraphic buttons always on the bottom of the screen, showing "Explore", "Dashboard", "Profile", and "More"
    - Explore: Only shown to workers, this is where you can see all the current lob postings according to your default filters (ex. all postings within 30 miles that last less than sixty days). 
    - Dashboard: Brings you back to the dashboard (see description above)
    - Profile: Allows users to edit their skills, preferences, and information. 
    - More: Pops up a list of buttons for less common features (future proofing).
