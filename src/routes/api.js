import { ObjectId } from 'mongodb';
import { getCounters, getBadgeConfigs, getDailyViews } from '../db/mongodb.js';
import { getStats, resetCounter, setInitialCount } from '../services/counter.js';
import { getViewCount } from '../services/redis.js';

export async function apiRoutes(fastify) {
  // JWT verification decorator
  const authenticate = async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  };
  
  // Get stats for a username
  fastify.get('/stats/:username', async (request, reply) => {
    const { username } = request.params;
    const { repo } = request.query;
    
    const stats = await getStats(username, repo || null);
    
    return reply
      .header('Cache-Control', 'max-age=60')
      .send(stats);
  });
  
  // Get current view count
  fastify.get('/count/:username', async (request, reply) => {
    const { username } = request.params;
    const { repo } = request.query;
    
    const counterKey = `${username}:${repo || 'profile'}:main`;
    const count = await getViewCount(counterKey);
    
    // Fallback to database if Redis doesn't have it
    if (!count) {
      const counters = getCounters();
      const counter = await counters.findOne({ username, repo: repo || null });
      
      return { count: counter?.total_views || 0 };
    }
    
    return { count };
  });
  
  // Reset counter (authenticated)
  fastify.post('/reset', { preHandler: authenticate }, async (request, reply) => {
    const { username, repo } = request.body || {};
    
    // Verify user owns this counter
    if (request.user.username !== username) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    
    await resetCounter(username, repo || null);
    
    return { success: true, message: 'Counter reset successfully' };
  });
  
  // Set initial count (authenticated) - allows users to resume from a specific number
  fastify.post('/set-count', { preHandler: authenticate }, async (request, reply) => {
    const { username, repo, count } = request.body || {};
    
    // Verify user owns this counter
    if (request.user.username !== username) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    
    // Validate count
    const initialCount = parseInt(count, 10);
    if (isNaN(initialCount) || initialCount < 0) {
      return reply.code(400).send({ error: 'Count must be a non-negative number' });
    }
    
    if (initialCount > 999999999) {
      return reply.code(400).send({ error: 'Count cannot exceed 999,999,999' });
    }
    
    const newCount = await setInitialCount(username, repo || null, initialCount);
    
    return { success: true, count: newCount, message: `Counter set to ${newCount}` };
  });
  
  // Get user's counters
  fastify.get('/counters', { preHandler: authenticate }, async (request, reply) => {
    const counters = getCounters();
    const dailyViews = getDailyViews();
    const today = new Date().toISOString().split('T')[0];
    
    const userCounters = await counters.find({ username: request.user.username })
      .sort({ created_at: -1 })
      .toArray();
    
    // Add today's views to each counter
    const result = await Promise.all(userCounters.map(async (c) => {
      const todayDoc = await dailyViews.findOne({ counter_id: c._id, date: today });
      return { ...c, today: todayDoc?.views || 0 };
    }));
    
    return result;
  });
  
  // Get user's badge configs
  fastify.get('/badges', { preHandler: authenticate }, async (request, reply) => {
    const badgeConfigs = getBadgeConfigs();
    const badges = await badgeConfigs.find({ user_id: request.user.id })
      .sort({ created_at: -1 })
      .toArray();
    
    return badges;
  });
  
  // Create badge config
  fastify.post('/badges', { preHandler: authenticate }, async (request, reply) => {
    const {
      name,
      style = 'flat',
      bg_color = '4c1',
      text_color = 'fff',
      icon = 'eye',
      label = 'Profile Views',
      font = 'Verdana',
      border = false,
      border_color = '333'
    } = request.body || {};
    
    const badgeConfigs = getBadgeConfigs();
    const result = await badgeConfigs.insertOne({
      user_id: request.user.id,
      name,
      style,
      bg_color,
      text_color,
      icon,
      label,
      font,
      border: !!border,
      border_color,
      created_at: new Date()
    });
    
    const badge = await badgeConfigs.findOne({ _id: result.insertedId });
    
    return reply.code(201).send(badge);
  });
  
  // Update badge config
  fastify.put('/badges/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const badgeConfigs = getBadgeConfigs();
    
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      return reply.code(400).send({ error: 'Invalid badge ID' });
    }
    
    const badge = await badgeConfigs.findOne({ _id: objectId, user_id: request.user.id });
    
    if (!badge) {
      return reply.code(404).send({ error: 'Badge config not found' });
    }
    
    const {
      name = badge.name,
      style = badge.style,
      bg_color = badge.bg_color,
      text_color = badge.text_color,
      icon = badge.icon,
      label = badge.label,
      font = badge.font,
      border = badge.border,
      border_color = badge.border_color
    } = request.body || {};
    
    await badgeConfigs.updateOne(
      { _id: objectId },
      { $set: { name, style, bg_color, text_color, icon, label, font, border: !!border, border_color } }
    );
    
    const updated = await badgeConfigs.findOne({ _id: objectId });
    
    return updated;
  });
  
  // Delete badge config
  fastify.delete('/badges/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const badgeConfigs = getBadgeConfigs();
    
    let objectId;
    try {
      objectId = new ObjectId(id);
    } catch (e) {
      return reply.code(400).send({ error: 'Invalid badge ID' });
    }
    
    const badge = await badgeConfigs.findOne({ _id: objectId, user_id: request.user.id });
    
    if (!badge) {
      return reply.code(404).send({ error: 'Badge config not found' });
    }
    
    await badgeConfigs.deleteOne({ _id: objectId });
    
    return { success: true };
  });
  
  // Get embed codes
  fastify.get('/embed/:username', async (request, reply) => {
    const { username } = request.params;
    const { repo, style, icon, bg, label } = request.query;
    const baseUrl = fastify.config.baseUrl;
    
    // Build query params
    const params = new URLSearchParams({ username });
    if (repo) params.set('repo', repo);
    if (style) params.set('style', style);
    if (icon) params.set('icon', icon);
    if (bg) params.set('bg', bg);
    if (label) params.set('label', label);
    
    const badgeUrl = `${baseUrl}/badge?${params.toString()}`;
    
    return {
      url: badgeUrl,
      markdown: `![Profile Views](${badgeUrl})`,
      html: `<img src="${badgeUrl}" alt="Profile Views" />`
    };
  });
}
