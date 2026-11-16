import type { Request, Response, NextFunction} from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../utils/token.js';

declare global{
    namespace Express{
        interface Request{
            user?: AccessTokenPayload;
        }
    }
}

export function authenticate(req:Request, res:Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')){
        res.status(401).json({
            message:'Authentication required. Provide a valid Bearer token.',
        });
        return;
    }
    const token = authHeader.slice('Bearer '.length).trim();

    if(!token){
        res.status(401).json({
            message:'Authentication token is missing.',
        })
        return;
    }

    try{
        const payload = verifyAccessToken(token);
        req.user = payload;
        next();
    } catch(error) {
        console.log('Access token verification failed', error);
        res.status(401).json({
            message: 'Invalid or expired access token.',
        });
    }
}