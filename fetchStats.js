// fetchStats.js

require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const execSync = require("child_process").execSync;

const username = process.env.GH_USERNAME;
const token = process.env.GH_TOKEN;

const headers = {
  Authorization: `bearer ${token}`,
  "Content-Type": "application/json",
};

const fetchStats = async () => {
  const query = `
    query userStats($username: String!) {
      user(login: $username) {
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false) {
          totalCount
          nodes {
            stargazers {
              totalCount
            }
            forks {
              totalCount
            }
          }
        }
        contributionsCollection {
          totalIssueContributions
          totalCommitContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalRepositoriesWithContributedCommits
          totalRepositoriesWithContributedIssues
          totalRepositoriesWithContributedPullRequests
          totalRepositoriesWithContributedPullRequestReviews
          contributionCalendar {
            totalContributions
          }
        }
      }
    }
  `;

  const variables = { username };

  try {
    const response = await axios.post(
      "https://api.github.com/graphql",
      { query, variables },
      { headers }
    );

    if (response.data.errors) {
      throw new Error(JSON.stringify(response.data.errors));
    }

    const data = response.data.data.user;
    const stats = {
      totalStars: data.repositories.nodes.reduce(
        (acc, repo) => acc + repo.stargazers.totalCount,
        0
      ),
      totalForks: data.repositories.nodes.reduce(
        (acc, repo) => acc + repo.forks.totalCount,
        0
      ),
      totalIssues: data.contributionsCollection.totalIssueContributions,
      totalCommits: data.contributionsCollection.totalCommitContributions,
      totalPRs: data.contributionsCollection.totalPullRequestContributions,
      totalContributions:
        data.contributionsCollection.contributionCalendar.totalContributions,
    };

    return stats;
  } catch (error) {
    console.error(`Error fetching GitHub stats: ${error}`);
    return {};
  }
};

const updateReadme = (stats) => {
  const readmePath = "./README.md";
  let readmeContents = fs.readFileSync(readmePath, "utf8");

  // Update the stats in the README contents
  readmeContents = readmeContents.replace(
    /<!--totalStars-->(.*?)<!--\/totalStars-->/,
    `<!--totalStars-->${stats.totalStars}<!--/totalStars-->`
  );
  readmeContents = readmeContents.replace(
    /<!--totalForks-->(.*?)<!--\/totalForks-->/,
    `<!--totalForks-->${stats.totalForks}<!--/totalForks-->`
  );
  readmeContents = readmeContents.replace(
    /<!--totalIssues-->(.*?)<!--\/totalIssues-->/,
    `<!--totalIssues-->${stats.totalIssues}<!--/totalIssues-->`
  );
  readmeContents = readmeContents.replace(
    /<!--totalCommits-->(.*?)<!--\/totalCommits-->/,
    `<!--totalCommits-->${stats.totalCommits}<!--/totalCommits-->`
  );
  readmeContents = readmeContents.replace(
    /<!--totalPRs-->(.*?)<!--\/totalPRs-->/,
    `<!--totalPRs-->${stats.totalPRs}<!--/totalPRs-->`
  );
  readmeContents = readmeContents.replace(
    /<!--totalContributions-->(.*?)<!--\/totalContributions-->/,
    `<!--totalContributions-->${stats.totalContributions}<!--/totalContributions-->`
  );

  // Write the new README contents to the file
  fs.writeFileSync(readmePath, readmeContents);
};

(async () => {
  const stats = await fetchStats();
  if (stats && Object.keys(stats).length) {
    updateReadme(stats);

    // Check if there are changes to commit
    const status = execSync("git status --porcelain").toString();
    if (status) {
      // If there are changes, commit them
      try {
        execSync("git add README.md");
        execSync('git commit -m "Update README with the latest GitHub stats"');
        execSync("git push");
        console.log("README updated and changes pushed to GitHub.");
      } catch (error) {
        console.error("Error updating README:", error);
      }
    } else {
      console.log("No changes to commit.");
    }
  } else {
    console.error("Failed to fetch GitHub stats.");
  }
})();
