import { getUsers } from '../db/mongodb.js';

export async function authRoutes(fastify) {
  // GitHub OAuth login redirect
  fastify.get('/github', async (request, reply) => {
    const { githubClientId, baseUrl } = fastify.config;
    
    if (!githubClientId) {
      return reply.code(500).send({ error: 'GitHub OAuth not configured' });
    }
    
    const redirectUri = `${baseUrl}/auth/github/callback`;
    const scope = 'read:user';
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;
    
    return reply.redirect(authUrl);
  });
  
  // GitHub OAuth callback
  fastify.get('/github/callback', async (request, reply) => {
    const { code } = request.query;
    const { githubClientId, githubClientSecret, baseUrl } = fastify.config;
    
    if (!code) {
      return reply.redirect('/dashboard?error=no_code');
    }
    
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: githubClientId,
          client_secret: githubClientSecret,
          code
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenData.access_token) {
        return reply.redirect('/dashboard?error=no_token');
      }
      
      // Get user info
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        }
      });
      
      const userData = await userResponse.json();
      
      // Create or update user
      const users = getUsers();
      const existingUser = await users.findOne({ github_id: userData.id });
      
      if (existingUser) {
        await users.updateOne(
          { github_id: userData.id },
          { $set: { username: userData.login, avatar_url: userData.avatar_url, access_token: tokenData.access_token } }
        );
      } else {
        await users.insertOne({
          github_id: userData.id,
          username: userData.login,
          avatar_url: userData.avatar_url,
          access_token: tokenData.access_token,
          created_at: new Date()
        });
      }
      
      // Get user from DB
      const user = await users.findOne({ github_id: userData.id });
      
      // Generate JWT
      const token = fastify.jwt.sign({
        id: user._id.toString(),
        username: user.username,
        github_id: user.github_id
      }, { expiresIn: '7d' });
      
      // Redirect to dashboard with token
      return reply.redirect(`/dashboard?token=${token}`);
      
    } catch (err) {
      fastify.log.error('OAuth error:', err);
      return reply.redirect('/dashboard?error=oauth_failed');
    }
  });
  
  // Get current user
  fastify.get('/me', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
    }
  }, async (request, reply) => {
    const users = getUsers();
    const user = await users.findOne(
      { _id: new (await import('mongodb')).ObjectId(request.user.id) },
      { projection: { _id: 1, username: 1, avatar_url: 1, created_at: 1 } }
    );
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    
    return { id: user._id.toString(), username: user.username, avatar_url: user.avatar_url, created_at: user.created_at };
  });
  
  // Logout
  fastify.post('/logout', async (request, reply) => {
    // JWT is stateless, so we just return success
    // Client should delete the token
    return { success: true };
  });
}
