import express from 'express';
import itemRoutes from './routes/itemRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(express.json());

// Routes
app.use('/api/items', itemRoutes);

app.get('/', (req, res) => {
    res.send('{"message": "Healthy"}');
});

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
