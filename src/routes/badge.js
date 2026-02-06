import { generateBadge, svgToPng, generateJson } from '../services/badge.js';
import { trackView } from '../services/counter.js';

export async function badgeRoutes(fastify) {
  // Main badge endpoint
  fastify.get('/badge', async (request, reply) => {
    const {
      username,
      repo,
      page,
      style = 'flat',
      label = 'Profile Views',
      icon = 'eye',
      bg = '4c1',
      textColor = 'fff',
      border = 'false',
      borderColor = '333',
      font = 'Verdana, Geneva, sans-serif',
      format = 'svg',
      countFormat = 'normal',
      cooldown = '300'
    } = request.query;
    
    // Validate username
    if (!username) {
      return reply.code(400).send({ error: 'username parameter is required' });
    }
    
    // Get visitor info for tracking
    const ip = request.ip || request.headers['x-forwarded-for'] || '';
    const userAgent = request.headers['user-agent'] || '';
    
    // Track view
    const viewResult = await trackView({
      username,
      repo: repo || null,
      pageId: page || null,
      ip,
      userAgent,
      cooldown: parseInt(cooldown, 10) || 300
    });
    
    // Generate badge
    const badgeOptions = {
      count: viewResult.count,
      label,
      style,
      icon,
      bg,
      textColor,
      border: border === 'true',
      borderColor,
      font,
      countFormat
    };
    
    // Return appropriate format
    switch (format.toLowerCase()) {
      case 'json':
        return reply
          .header('Content-Type', 'application/json')
          .header('Cache-Control', 'no-cache, no-store, must-revalidate')
          .send(generateJson(viewResult.count, username, repo));
      
      case 'png':
        // PNG requires native modules, fallback to SVG
        const svgForPng = generateBadge(badgeOptions);
        return reply
          .header('Content-Type', 'image/svg+xml')
          .header('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate')
          .header('X-Note', 'PNG not available, returning SVG')
          .send(svgForPng);
      
      case 'svg':
      default:
        return reply
          .header('Content-Type', 'image/svg+xml')
          .header('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate')
          .send(generateBadge(badgeOptions));
    }
  });
  
  // Preview badge (no counting)
  fastify.get('/preview', async (request, reply) => {
    const {
      count = '1234',
      style = 'flat',
      label = 'Profile Views',
      icon = 'eye',
      bg = '4c1',
      textColor = 'fff',
      border = 'false',
      borderColor = '333',
      font = 'Verdana, Geneva, sans-serif',
      countFormat = 'normal'
    } = request.query;
    
    const badgeOptions = {
      count: parseInt(count, 10) || 0,
      label,
      style,
      icon,
      bg,
      textColor,
      border: border === 'true',
      borderColor,
      font,
      countFormat
    };
    
    const svg = generateBadge(badgeOptions);
    
    return reply
      .header('Content-Type', 'image/svg+xml')
      .header('Cache-Control', 'max-age=3600')
      .send(svg);
  });
}
