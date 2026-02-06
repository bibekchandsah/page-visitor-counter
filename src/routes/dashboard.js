import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function dashboardRoutes(fastify) {
  // Serve dashboard HTML
  fastify.get('/dashboard', async (request, reply) => {
    const htmlPath = path.join(__dirname, '../../public/dashboard.html');
    
    try {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      return reply.type('text/html').send(html);
    } catch (err) {
      fastify.log.error('Error reading dashboard.html:', err);
      return reply.code(500).send('Dashboard not found');
    }
  });
  
  // Redirect root to dashboard or home
  fastify.get('/', async (request, reply) => {
    const htmlPath = path.join(__dirname, '../../public/index.html');
    
    try {
      const html = fs.readFileSync(htmlPath, 'utf-8');
      return reply.type('text/html').send(html);
    } catch (err) {
      // Fallback redirect
      return reply.redirect('/dashboard');
    }
  });
}
