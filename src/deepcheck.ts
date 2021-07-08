import Redis from 'ioredis';
import getRedisInfo from './config/redis-info';
import { sequelize } from './models/sequelize';
import { Application } from 'probot';
import { Response } from 'express';
import bunyan from 'bunyan';
import { elapsedTimeMetrics } from './config/statsd';

/**
 * Create a /deepcheck and /healthcheck endpoints
 *
 * @param {import('probot').Application} robot - The probot app
 */
export default (robot: Application) => {
  const app = robot.route('/');
  const cache = new Redis(getRedisInfo('ping').redisOptions);

  /**
   * /deepcheck endpoint to checks to see that all our connections are OK
   *
   * It's a race between the setTimeout and our ping + authenticate.
   */
  app.get('/deepcheck', elapsedTimeMetrics, async (_, res: Response) => {
    let connectionsOk = true;
    const deepcheckLogger = bunyan.createLogger({ name: 'deepcheck' });

    const redisPromise = cache.ping();
    const databasePromise = sequelize.authenticate();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('deepcheck timed out')), 500),
    );

    await Promise.race([
      Promise.all([redisPromise, databasePromise]),
      timeoutPromise,
    ]).catch((error) => {
      deepcheckLogger.error(`Error during /deepcheck: ${error}`);
      connectionsOk = false;
    });

    if (connectionsOk) {
      return res.status(200).send('OK');
    } else {
      deepcheckLogger.error('Error: failed to call /deepcheck');
      // no additional logging, since it's logged in the catch block of the promise above
      return res.status(500).send('NOT OK');
    }
  });

  /**
   * /healtcheck endpoint to check that the app started properly
   */
  app.get('/healthcheck', elapsedTimeMetrics, async (_, res: Response) => {
    res.status(200).send('OK');
  });
};
