// Learn more at https://developers.cloudflare.com/workers/
export default {
	async fetch(req, env, ctx): Promise<Response> {
		// To send a message on a queue, we need to create the queue first
		// https://developers.cloudflare.com/queues/get-started/#3-create-a-queue
		await env.shortener_analytics.send({
			url: req.url,
			method: req.method,
			headers: Object.fromEntries(req.headers),
		});
		return new Response('Sent message to the queue');
	},
} satisfies ExportedHandler<Env>;
