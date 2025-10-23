import React from 'react';
import { Link } from 'react-router-dom';

const JobSummary = ({ jobs }) => {
  return (
    <div className="job-summary">
      <h3>💼 Your Jobs</h3>
      {jobs.length === 0 ? (
        <div className="no-jobs">
          <p>No jobs yet</p>
          <Link to="/jobs/create" className="create-job-button">
            Create your first job
          </Link>
        </div>
      ) : (
        <div className="jobs-list">
          {jobs.slice(0, 3).map((job, index) => (
            <div key={job.id || index} className="job-item">
              <div className="job-info">
                <h4>{job.title}</h4>
                <p className="job-status">{job.status}</p>
              </div>
              <div className="job-offer">${job.offer}</div>
            </div>
          ))}
          {jobs.length > 3 && (
            <Link to="/jobs" className="view-all-jobs">
              View all jobs ({jobs.length})
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default JobSummary;