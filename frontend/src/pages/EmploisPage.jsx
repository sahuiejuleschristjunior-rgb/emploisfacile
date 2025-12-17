import React from "react";
import LeftMenuDesktop from "../components/LeftMenuDesktop";
import JobFeed from "../components/JobFeed";

export default function EmploisPage() {
  return (
    <div className="jobfeed-page">
      <aside className="jobfeed-left">
        <LeftMenuDesktop />
      </aside>

      <main className="jobfeed-main">
        <div className="fb-center-column">
          <JobFeed />
        </div>
      </main>
    </div>
  );
}
