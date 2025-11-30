import React from 'react'

export default function About(){
  return (
    <section>
      <h2>About</h2>
      <div>
          <p className="constrained-760">Pocket Jobs is a lightweight marketplace for short local work: find nearby workers, post jobs, and message candidates directly. The app focuses on quick discovery and privacy-friendly location features.</p>
        <p style={{fontWeight:700}}>Quick tips</p>
        <ul>
          <li>Browse <strong>Workers</strong> to see available helpers. Use the radius slider and <em>Show Nearby Workers</em> to find people close to you.</li>
          <li>Open <strong>Jobs</strong> to view nearby gigs; the slider controls search radius for job listings as well.</li>
          <li>Click a worker's <em>Message</em> button to start a private conversation.</li>
          <li>Use <strong>Post Job</strong> to create a new job — include a short location and offer.</li>
          <li>Visit <strong>View Profile</strong> (top-left avatar) to edit your skills, phone, or set your approximate location. Location precision is reduced for privacy.</li>
        </ul>
      </div>
    </section>
  )
}
