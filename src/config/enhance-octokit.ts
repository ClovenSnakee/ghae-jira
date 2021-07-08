import OctokitError from '../models/octokit-error';
import statsd from './statsd';
import {extractPath} from '../jira/client/axios';
import {GitHubAPI} from 'probot';
import {LoggerWithTarget, wrapLogger} from 'probot/lib/wrap-logger';
import Logger from 'bunyan';
import {metricHttpRequest} from './metric-names';

const instrumentRequests = (octokit: GitHubAPI, log: Logger) => {
  octokit.hook.wrap('request', async (request, options) => {
    const requestStart = Date.now();
    let responseStatus = null;

    try {
      const response = await request(options);
      responseStatus = response.status;
      log.info(`Response from GitHub: ${JSON.stringify(response)}`);

      return response;
    } catch (error) {
      if (error.responseCode) {
        responseStatus = error.responseCode;
      }

      log.error(`Error response from to GitHub: ${JSON.stringify(error)}`);

      throw error;
    } finally {
      const elapsed = Date.now() - requestStart;
      const tags = {
        path: extractPath(options.url),
        method: options.method,
        status: responseStatus,
      };

      statsd.histogram(metricHttpRequest().github, elapsed, tags);
      log.debug(tags, `GitHub request time: ${elapsed}ms`);
    }
  });
};

/*
 * Customize an Octokit instance behavior.
 *
 * This acts like an Octokit plugin but works on Octokit instances.
 * (Because Probot instantiates the Octokit client for us, we can't use plugins.)
 */
export default (octokit: GitHubAPI, logger?: LoggerWithTarget): GitHubAPI => {
  logger = logger || wrapLogger(new Logger({name:'Octokit'}));
  OctokitError.wrapRequestErrors(octokit);
  instrumentRequests(octokit, logger);
  return octokit;
};
