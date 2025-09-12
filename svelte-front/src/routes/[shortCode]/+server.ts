import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ platform, params, url }) => {
  const env = platform?.env;
  if (!env?.SESSIONS) {
    return new Response('Sessions not configured', { status: 500 });
  }

  const { shortCode } = params;

  // Skip if this looks like a static asset or API route
  if (shortCode.includes('.') || shortCode.startsWith('api/') || shortCode.startsWith('_app/')) {
    error(404, 'Not found');
  }

  try {
    const linkData = await env.SESSIONS.get(`link_${shortCode}`);
    if (!linkData) {
      error(404, 'Short URL not found');
    }

    const link = JSON.parse(linkData);

    // Increment click count
    link.clicks = (link.clicks || 0) + 1;
    await env.SESSIONS.put(`link_${shortCode}`, JSON.stringify(link), { 
      expirationTtl: 30 * 24 * 60 * 60 
    });

    // Also update in user's links list
    const userLinksKey = `user_links_${link.createdBy}`;
    const existingLinks = await env.SESSIONS.get(userLinksKey);
    if (existingLinks) {
      let userLinks = JSON.parse(existingLinks);
      userLinks = userLinks.map((userLink: any) => 
        userLink.shortCode === shortCode 
          ? { ...userLink, clicks: link.clicks }
          : userLink
      );
      await env.SESSIONS.put(userLinksKey, JSON.stringify(userLinks), { 
        expirationTtl: 30 * 24 * 60 * 60 
      });
    }

    // Redirect to original URL
    return new Response(null, {
      status: 302,
      headers: {
        Location: link.originalUrl
      }
    });

  } catch (err) {
    console.error('Error handling redirect:', err);
    error(500, 'Internal server error');
  }
};