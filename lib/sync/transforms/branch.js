// TODO - replace with library
const issueKeyParser = require('../../../issueKeyParser');

const { getJiraId } = require('../../jira/util/id');
const isEmpty = require('../../jira/util/isEmpty');

/**
 * mapBranch takes a branch node from the GraphQL response and
 * attempts to find issueKeys in use anywhere in that object
 *
 * Locations can include:
 *  - Branch Name (ref)
 *  - Title of the associated Pull Request
 *  - Messages from up to the last 100 commits in that branch
 *
 * @param {object} branch
 * @param {object} repository
 */
function mapBranch(branch, repository) {
  const branchKeys = issueKeyParser().parse(branch.name);
  const pullRequestKeys = issueKeyParser().parse(branch.associatedPullRequestTitle);
  const commitKeys = issueKeyParser().parse(branch.lastCommit.message);

  const allKeys = branchKeys
    .concat(pullRequestKeys)
    .concat(commitKeys)
    .filter(Boolean);

  if (!allKeys.length) {
    // If we get here, no issue keys were found anywhere they might be found
    return;
  }

  // TODO - make this nicer
  const lastCommitIssueKeys = (a, b, c) => {
    if (c.length > 0) {
      return c;
    } else if (a.length > 0) {
      return a;
    } else if (b.length > 0) {
      return b;
    } else return [];
  };

  return {
    createPullRequestUrl: `${repository.html_url}/pull/new/${branch.name}`,
    id: getJiraId(branch.name),
    issueKeys: allKeys,
    lastCommit: {
      author: {
        avatar: branch.lastCommit.author.avatarUrl,
        name: branch.lastCommit.author.name,
      },
      authorTimestamp: branch.lastCommit.authorTimestamp,
      displayId: branch.lastCommit.sha.substring(0, 6),
      fileCount: branch.lastCommit.fileCount,
      hash: branch.lastCommit.sha,
      id: branch.lastCommit.sha,
      // Use only one set of keys for the last commit in order of most specific to least specific
      issueKeys: lastCommitIssueKeys(branchKeys, pullRequestKeys, commitKeys),
      message: branch.lastCommit.message,
      url: branch.lastCommit.url,
      updateSequenceId: Date.now(),
    },
    name: branch.name,
    url: `${repository.html_url}/tree/${branch.name}`,
    updateSequenceId: Date.now(),
  };
}

/**
 * mapCommit takes the a single commit object from the array
 * of commits we got from the GraphQL response and maps the data
 * to the structure needed for the DevInfo API
 *
 * @param {object} commit
 */
function mapCommit(commit) {
  const issueKeys = issueKeyParser().parse(commit.message);

  if (isEmpty(issueKeys)) {
    return;
  }

  return {
    author: {
      avatar: commit.author.avatarUrl,
      email: commit.author.email,
      name: commit.author.name,
      url: commit.author.user ? commit.author.user.url : undefined,
    },
    authorTimestamp: commit.authoredDate,
    displayId: commit.oid.substring(0, 6),
    fileCount: 0,
    hash: commit.oid,
    id: commit.oid,
    issueKeys: issueKeys || [],
    message: commit.message,
    timestamp: commit.authoredDate,
    url: commit.url,
    updateSequenceId: Date.now(),
  };
}

module.exports = (payload) => {
  const branches = payload.branches.map(branch => mapBranch(branch, payload.repository))
    .filter(Boolean);

  const commits = payload.branches.flatMap(branch => branch.commits.map(commit => mapCommit(commit)).filter(Boolean));

  if ((!commits || !commits.length) && (!branches || !branches.length)) {
    return {};
  }

  return {
    data: {
      branches,
      commits,
      id: payload.repository.id,
      name: payload.repository.name,
      url: payload.repository.html_url,
      updateSequenceId: Date.now(),
    },
  };
};
