const { Project } = require('../models');
const transformBranch = require('../transforms/branch');
// TODO - replace with library
const issueKeyParser = require('../../issueKeyParser');
const reduceProjectKeys = require('../jira/util/reduce-project-keys');
const isEmpty = require('../jira/util/isEmpty');

module.exports.createBranch = async (context, jiraClient) => {
  const { data: jiraPayload } = await transformBranch(context);

  if (!jiraPayload) {
    context.log({ noop: 'no_jira_payload_create_branch' }, 'Halting futher execution for createBranch since jiraPayload is empty');
    return;
  }

  await jiraClient.devinfo.repository.update(jiraPayload);

  const projects = [];
  jiraPayload.branches.map(branch => reduceProjectKeys(branch, projects));

  for (const projectKey of projects) {
    await Project.upsert(projectKey, jiraClient.baseURL);
  }
};

module.exports.deleteBranch = async (context, jiraClient) => {
  const issueKeys = issueKeyParser().parse(context.payload.ref);

  if (isEmpty(issueKeys)) {
    context.log({ noop: 'no_issue_keys' }, 'Halting futher execution for deleteBranch since issueKeys is empty');
    return;
  }

  await jiraClient.devinfo.branch.delete(
    context.payload.repository.id,
    context.payload.ref,
  );
};
