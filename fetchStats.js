require('dotenv').config();
const axios = require('axios');

const username = 'imanhedeshy'; // Replace with your GitHub username
const token = process.env.GH_TOKEN; // Ensure this is set in your .env file

const headers = {
  'Authorization': `bearer ${token}`,
  'Content-Type': 'application/json',
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
      'https://api.github.com/graphql',
      { query, variables },
      { headers }
    );

    if (response.data.errors) {
      throw new Error(JSON.stringify(response.data.errors));
    }

    const data = response.data.data.user;
    const stats = {
      totalStars: data.repositories.nodes.reduce((acc, repo) => acc + repo.stargazers.totalCount, 0),
      totalForks: data.repositories.nodes.reduce((acc, repo) => acc + repo.forks.totalCount, 0),
      totalIssues: data.contributionsCollection.totalIssueContributions,
      totalCommits: data.contributionsCollection.totalCommitContributions,
      totalPRs: data.contributionsCollection.totalPullRequestContributions,
      totalContributions: data.contributionsCollection.contributionCalendar.totalContributions,
    };

    return stats;
  } catch (error) {
    console.error(`Error fetching GitHub stats: ${error}`);
    return {};
  }
};

(async () => {
  const stats = await fetchStats();
  console.log(`GitHub Statistics:`, stats);
})();
