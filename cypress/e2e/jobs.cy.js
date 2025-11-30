// Cypress E2E: Job management (create, list)
describe('Jobs E2E', () => {
  // Use seeded demo account to avoid signup timing issues
  const employer = 'demo@pocketjob.test';
  const password = 'Demo123!';
  const jobTitle = `Cypress Job ${Date.now()}`;

  before(() => {
    cy.visit('/');
    cy.login(employer, password);
  });

  it('creates a job via API helper and finds it in the jobs list', () => {
    cy.createJob(jobTitle, 'Job description for Cypress', 'Test City', 50).then((job) => {
      expect(job).to.have.property('_id');
      expect(job.title).to.equal(jobTitle);
    });

    // confirm job shows up in open jobs list
    cy.request({ url: '/api/jobs?status=open', failOnStatusCode: false }).then((res) => {
      expect([200, 304].includes(res.status)).to.be.true;
      const jobs = res.body && res.body.data && res.body.data.jobs ? res.body.data.jobs : [];
      const found = Array.isArray(jobs) ? jobs.some((j) => j.title === jobTitle) : false;
      expect(found, 'created job appears in job list').to.be.true;
    });
  });
});
