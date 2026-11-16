import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const app: Application = express();

app.use(helmet());

const allowedOrigins = [process.env.CLIENT_URL,'http://localhost:5173'].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if(!origin || allowedOrigins.includes(origin)){
        callback(null,true);
      }else {
        callback(new Error('Not allowed by CORS'));
      }
    } ,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: true,
    message: "BookNest API is running",
    "environment": "development",
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/books',bookRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);

export default app;