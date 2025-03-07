import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import logger from './logger';

// Reopen the Request interface and add user object to it
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

/* Validate the access token from the request header and attach the decoded user to the request object. */
export function validateAccessToken(req: Request, _res: Response, next: NextFunction): void {
    logger.debug(`Entering validateAccessToken method.`, { method: "validateAccessToken", layer: "middleware" });
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            logger.error(`Unauthorized request: Authorization header is missing.`, { layer: "middleware" });
            return next(createHttpError.Unauthorized("Unauthorized request, authorization header is required."));
        }

        const bearerToken = authHeader.split(' ');
        const token = bearerToken[1];
        if (!token) {
            logger.error(`Unauthorized request: Token is missing.`, { layer: "middleware" });
            return next(createHttpError.Unauthorized("Unauthorized request, token is required."));
        }

        logger.info(`Validating access token.`, { layer: "middleware" });
        const resp = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
        req.user = resp;

        logger.info(`Successfully validated access token. UserID: ${req.user?.aud}`, { layer: "middleware" });
        next();
    } catch (error) {
        logger.error(`Error in validateAccessToken `, { error, layer: "middleware" });
        return next(createHttpError.Unauthorized("Unauthorized request"));
    } finally {
        logger.debug(`Exiting validateAccessToken method.`, { method: "validateAccessToken", layer: "middleware" });
    }
}

/* Sign a new access token for a user. */
export function signAccessToken(userID: string): string {
    logger.debug(`Entering signAccessToken method. Param: userID=${userID}`, { method: "signAccessToken", layer: "helper" });
    try {
        const payload = {};
        const secret = process.env.ACCESS_TOKEN_SECRET!;
        const options = {
            expiresIn: 300,
            issuer: 'leaf.com',
            audience: userID,
        };

        logger.info(`Signing new access token for user. UserID: ${userID}`, { layer: "helper" });
        const token = jwt.sign(payload, secret, options);

        logger.info(`Successfully signed access token for user. UserID: ${userID}`, { layer: "helper" });
        return token;
    } catch (error) {
        logger.error(`Error in signAccessToken: Unable to sign access token for user. UserID: ${userID}`, { error, layer: "helper" });
        throw createHttpError(500, "Unable to sign access token");
    } finally {
        logger.debug(`Exiting signAccessToken method. Param: userID=${userID}`, { method: "signAccessToken", layer: "helper" });
    }
}