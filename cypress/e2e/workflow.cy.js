// Cypress E2E: Application workflow (employer posts job -> worker applies -> employer accepts)
describe('Workflow E2E', () => {
  // Use seeded demo accounts to avoid signup timing issues
  const employer = 'demo@pocketjob.test';
  const worker = 'alice@demo.test';
  const password = 'Demo123!';
  const workerPassword = 'Alice123!';
  let createdJob = null;

  it('employer posts a job and worker applies, employer accepts', () => {
    cy.visit('/');

    // Employer signup & post
    cy.login(employer, password);
    cy.createJob('Workflow Job', 'Workflow job description', 'Workflow City', 25).then((job) => {
      expect(job).to.have.property('_id');
      createdJob = job;

      // Worker logs in and applies
      cy.login(worker, workerPassword);
      cy.window().then((win) => {
        const token = win.localStorage.getItem('accessToken');
        cy.request({
          method: 'POST',
          url: `/api/jobs/${createdJob._id}/apply`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        }).then((applyRes) => {
          expect([200, 201, 202]).to.include(applyRes.status);

          // Employer assigns the applicant (owner must call assign endpoint)
          cy.login(employer, password);
          // fetch job to read applicants
          cy.request({ url: `/api/jobs/${createdJob._id}`, failOnStatusCode: false }).then((jobRes) => {
            expect(jobRes.status).to.equal(200);
            const applicants = jobRes.body?.data?.job?.applicants || [];
            expect(Array.isArray(applicants) && applicants.length > 0, 'applicants present').to.be.true;
            const applicantId = applicants[0];
            cy.window().then((win2) => {
              const token2 = win2.localStorage.getItem('accessToken');
              cy.request({
                method: 'POST',
                url: `/api/jobs/${createdJob._id}/assign`,
                headers: { Authorization: `Bearer ${token2}` },
                body: { workerId: applicantId },
                failOnStatusCode: false,
              }).then((assignRes) => {
                expect([200, 201]).to.include(assignRes.status);
              });
            });
          });
        });
      });
    });
  });
});
